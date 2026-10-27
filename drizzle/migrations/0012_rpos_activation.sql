-- 60-day activation: controlled workstreams, milestones, ownership and dependencies.
CREATE TABLE IF NOT EXISTS public.rpos_activation_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 250),
 workstream text NOT NULL CHECK(length(btrim(workstream)) BETWEEN 2 AND 120),
 item_type text NOT NULL CHECK(item_type IN ('milestone','task','decision','deliverable')),
 status text NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','blocked','completed','cancelled')),
 day_number integer NOT NULL CHECK(day_number BETWEEN 1 AND 60),
 owner_user_id uuid REFERENCES auth.users(id),
 depends_on uuid REFERENCES public.rpos_activation_items(id) ON DELETE RESTRICT,
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=4000),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(depends_on IS NULL OR depends_on<>id)
);
CREATE INDEX IF NOT EXISTS rpos_activation_project_idx ON public.rpos_activation_items(project_id,day_number);
ALTER TABLE public.rpos_activation_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_activation_items FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_activation_items TO authenticated;
DROP POLICY IF EXISTS rpos_activation_read ON public.rpos_activation_items;
CREATE POLICY rpos_activation_read ON public.rpos_activation_items FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
CREATE OR REPLACE FUNCTION public.rpos_save_activation_item(
 p_project_id text,p_title text,p_workstream text,p_type text,p_day integer,
 p_owner uuid DEFAULT NULL,p_dependency uuid DEFAULT NULL,p_notes text DEFAULT '',
 p_item_id uuid DEFAULT NULL,p_status text DEFAULT 'not_started'
) RETURNS public.rpos_activation_items LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; prior public.rpos_activation_items; item public.rpos_activation_items;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF org IS NULL OR NOT private.rpos_can_write_org(org) THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 250
 OR length(btrim(coalesce(p_workstream,''))) NOT BETWEEN 2 AND 120
 OR p_type IS NULL OR p_type NOT IN ('milestone','task','decision','deliverable')
 OR p_day IS NULL OR p_day NOT BETWEEN 1 AND 60
 OR p_status IS NULL OR p_status NOT IN ('not_started','in_progress','blocked','completed','cancelled')
 OR length(coalesce(p_notes,''))>4000
 THEN RAISE EXCEPTION 'Invalid activation item' USING ERRCODE='22023'; END IF;
 IF p_dependency IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.rpos_activation_items d WHERE d.id=p_dependency AND d.project_id=p_project_id)
 THEN RAISE EXCEPTION 'Dependency must belong to the same project' USING ERRCODE='22023'; END IF;
 IF p_owner IS NOT NULL AND NOT (
 EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=org AND m.user_id=p_owner)
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=p_project_id AND m.user_id=p_owner)
 ) THEN RAISE EXCEPTION 'Owner must belong to the project organisation or team' USING ERRCODE='22023'; END IF;
 IF p_item_id IS NULL THEN
  INSERT INTO public.rpos_activation_items(project_id,title,workstream,item_type,status,day_number,owner_user_id,depends_on,notes,created_by)
  VALUES(p_project_id,btrim(p_title),btrim(p_workstream),p_type,p_status,p_day,p_owner,p_dependency,coalesce(p_notes,''),uid) RETURNING * INTO item;
 ELSE
  SELECT * INTO prior FROM public.rpos_activation_items WHERE id=p_item_id AND project_id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found' USING ERRCODE='22023'; END IF;
  IF p_dependency=p_item_id THEN RAISE EXCEPTION 'Self dependency not allowed' USING ERRCODE='22023'; END IF;
  IF p_dependency IS NOT NULL AND EXISTS(
   WITH RECURSIVE ancestors(id,depends_on) AS (
    SELECT d.id,d.depends_on FROM public.rpos_activation_items d WHERE d.id=p_dependency
    UNION ALL SELECT d.id,d.depends_on FROM public.rpos_activation_items d JOIN ancestors a ON d.id=a.depends_on
   ) SELECT 1 FROM ancestors WHERE id=p_item_id
  ) THEN RAISE EXCEPTION 'Circular dependency not allowed' USING ERRCODE='22023'; END IF;
  UPDATE public.rpos_activation_items SET title=btrim(p_title),workstream=btrim(p_workstream),item_type=p_type,
  status=p_status,day_number=p_day,owner_user_id=p_owner,depends_on=p_dependency,notes=coalesce(p_notes,''),updated_at=now()
  WHERE id=p_item_id RETURNING * INTO item;
 END IF;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(org,p_project_id,uid,CASE WHEN p_item_id IS NULL THEN 'create' ELSE 'update' END,
 'activation_item',item.id::text,to_jsonb(prior),to_jsonb(item));
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_save_activation_item(text,text,text,text,integer,uuid,uuid,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_save_activation_item(text,text,text,text,integer,uuid,uuid,text,uuid,text) TO authenticated;
