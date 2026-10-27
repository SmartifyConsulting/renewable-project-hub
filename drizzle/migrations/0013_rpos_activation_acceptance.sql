-- Activation controls: completion dependencies and independent milestone acceptance.
-- Apply after 0012.
CREATE TABLE IF NOT EXISTS public.rpos_activation_acceptances (
 item_id uuid PRIMARY KEY REFERENCES public.rpos_activation_items(id) ON DELETE RESTRICT,
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 accepted_by uuid NOT NULL REFERENCES auth.users(id),
 accepted_at timestamptz NOT NULL DEFAULT now(),
 rationale text NOT NULL CHECK(length(btrim(rationale)) BETWEEN 10 AND 4000)
);
ALTER TABLE public.rpos_activation_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_activation_acceptances FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_activation_acceptances TO authenticated;
DROP POLICY IF EXISTS rpos_activation_acceptance_read ON public.rpos_activation_acceptances;
CREATE POLICY rpos_activation_acceptance_read ON public.rpos_activation_acceptances
FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id
 WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
CREATE OR REPLACE FUNCTION private.rpos_activation_completion_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE dependency public.rpos_activation_items;
BEGIN
 IF NEW.depends_on IS NOT NULL THEN
  SELECT * INTO dependency FROM public.rpos_activation_items WHERE id=NEW.depends_on;
  IF NOT FOUND OR dependency.project_id<>NEW.project_id THEN
   RAISE EXCEPTION 'Dependency must belong to the same project' USING ERRCODE='22023';
  END IF;
 END IF;
 IF NEW.status='completed' THEN
  IF NEW.depends_on IS NOT NULL AND dependency.status<>'completed' THEN
   RAISE EXCEPTION 'Cannot complete item before its dependency' USING ERRCODE='22023';
  END IF;
  IF NEW.item_type='milestone' AND NOT EXISTS(
   SELECT 1 FROM public.rpos_activation_acceptances a
   WHERE a.item_id=NEW.id AND a.project_id=NEW.project_id
  ) THEN RAISE EXCEPTION 'Milestone requires independent acceptance' USING ERRCODE='22023'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rpos_activation_completion_guard ON public.rpos_activation_items;
CREATE TRIGGER rpos_activation_completion_guard BEFORE INSERT OR UPDATE
ON public.rpos_activation_items FOR EACH ROW
EXECUTE FUNCTION private.rpos_activation_completion_guard();

CREATE OR REPLACE FUNCTION public.rpos_accept_activation_milestone(p_item_id uuid,p_rationale text)
RETURNS public.rpos_activation_acceptances LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; target public.rpos_activation_items; item public.rpos_activation_acceptances;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT * INTO target FROM public.rpos_activation_items WHERE id=p_item_id FOR UPDATE;
 IF NOT FOUND OR target.item_type<>'milestone' THEN RAISE EXCEPTION 'Milestone not found' USING ERRCODE='22023'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=target.project_id;
 IF NOT EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=org AND m.user_id=uid AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Only an organisation admin or director can accept milestones' USING ERRCODE='42501'; END IF;
 IF target.created_by=uid OR target.owner_user_id=uid THEN RAISE EXCEPTION 'Milestone creator or owner cannot accept their own milestone' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_rationale,''))) NOT BETWEEN 10 AND 4000 THEN
  RAISE EXCEPTION 'Acceptance rationale must be 10 to 4000 characters' USING ERRCODE='22023'; END IF;
 IF target.depends_on IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.rpos_activation_items d WHERE d.id=target.depends_on AND d.status='completed'
 ) THEN RAISE EXCEPTION 'Dependency must be completed before acceptance' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rpos_activation_acceptances(item_id,project_id,accepted_by,rationale)
 VALUES(target.id,target.project_id,uid,btrim(p_rationale)) RETURNING * INTO item;
 UPDATE public.rpos_activation_items SET status='completed',updated_at=now() WHERE id=target.id;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(org,target.project_id,uid,'update','activation_milestone',target.id::text,to_jsonb(target),to_jsonb(item));
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_accept_activation_milestone(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_accept_activation_milestone(uuid,text) TO authenticated;
-- Accepted milestones cannot be silently reopened or modified. Corrections need an explicit change-control workflow.
CREATE OR REPLACE FUNCTION private.rpos_activation_accepted_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.rpos_activation_acceptances WHERE item_id=OLD.id) THEN
  IF NEW.status<>'completed' OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.workstream IS DISTINCT FROM OLD.workstream OR NEW.day_number IS DISTINCT FROM OLD.day_number
    OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR NEW.depends_on IS DISTINCT FROM OLD.depends_on
    OR NEW.notes IS DISTINCT FROM OLD.notes OR NEW.item_type IS DISTINCT FROM OLD.item_type
  THEN RAISE EXCEPTION 'Accepted milestone is immutable' USING ERRCODE='22023'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rpos_activation_accepted_immutable ON public.rpos_activation_items;
CREATE TRIGGER rpos_activation_accepted_immutable BEFORE UPDATE ON public.rpos_activation_items
FOR EACH ROW EXECUTE FUNCTION private.rpos_activation_accepted_immutable();
