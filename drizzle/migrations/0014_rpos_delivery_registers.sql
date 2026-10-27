-- Delivery Operating System: audited project registers and controlled state transitions.
-- Apply after migration 0013.
CREATE TABLE IF NOT EXISTS public.rpos_delivery_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 record_type text NOT NULL CHECK(record_type IN ('risk','issue','action','decision','change')),
 reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 2 AND 40),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 250),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=4000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','mitigated','resolved','closed','cancelled','pending_approval','approved','rejected')),
 priority text NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
 owner_user_id uuid REFERENCES auth.users(id),
 due_date date,
 impact text NOT NULL DEFAULT '' CHECK(length(impact)<=4000),
 mitigation text NOT NULL DEFAULT '' CHECK(length(mitigation)<=4000),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,record_type,reference)
);
CREATE INDEX IF NOT EXISTS rpos_delivery_records_project ON public.rpos_delivery_records(project_id,record_type,status);
ALTER TABLE public.rpos_delivery_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_delivery_records FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_delivery_records TO authenticated;
DROP POLICY IF EXISTS rpos_delivery_records_read ON public.rpos_delivery_records;
CREATE POLICY rpos_delivery_records_read ON public.rpos_delivery_records FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
CREATE TABLE IF NOT EXISTS public.rpos_delivery_approvals (
 record_id uuid PRIMARY KEY REFERENCES public.rpos_delivery_records(id) ON DELETE RESTRICT,
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 decision text NOT NULL CHECK(decision IN ('approved','rejected')),
 rationale text NOT NULL CHECK(length(btrim(rationale)) BETWEEN 10 AND 4000),
 decided_by uuid NOT NULL REFERENCES auth.users(id),
 decided_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rpos_delivery_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_delivery_approvals FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_delivery_approvals TO authenticated;
DROP POLICY IF EXISTS rpos_delivery_approvals_read ON public.rpos_delivery_approvals;
CREATE POLICY rpos_delivery_approvals_read ON public.rpos_delivery_approvals FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
CREATE OR REPLACE FUNCTION public.rpos_save_delivery_record(
 p_project_id text,p_type text,p_reference text,p_title text,p_description text,
 p_priority text,p_owner uuid,p_due_date date,p_impact text,p_mitigation text,
 p_record_id uuid DEFAULT NULL,p_status text DEFAULT 'open'
) RETURNS public.rpos_delivery_records LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; prior public.rpos_delivery_records; item public.rpos_delivery_records;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF org IS NULL OR NOT private.rpos_can_write_org(org) THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE='42501'; END IF;
 IF p_type IS NULL OR p_type NOT IN ('risk','issue','action','decision','change')
 OR length(btrim(coalesce(p_reference,''))) NOT BETWEEN 2 AND 40
 OR length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 250
 OR length(coalesce(p_description,''))>4000 OR length(coalesce(p_impact,''))>4000 OR length(coalesce(p_mitigation,''))>4000
 OR p_priority IS NULL OR p_priority NOT IN ('low','medium','high','critical')
 OR p_status IS NULL OR p_status NOT IN ('open','in_progress','mitigated','resolved','closed','cancelled','pending_approval','approved','rejected')
 THEN RAISE EXCEPTION 'Invalid delivery record' USING ERRCODE='22023'; END IF;
 IF p_type='change' AND p_status NOT IN ('open','pending_approval','approved','rejected','cancelled') THEN
 RAISE EXCEPTION 'Invalid change status' USING ERRCODE='22023'; END IF;
 IF p_type<>'change' AND p_status IN ('pending_approval','approved','rejected') THEN
 RAISE EXCEPTION 'Approval status is reserved for changes' USING ERRCODE='22023'; END IF;
 IF p_owner IS NOT NULL AND NOT (
 EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=org AND m.user_id=p_owner)
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=p_project_id AND m.user_id=p_owner)
 ) THEN RAISE EXCEPTION 'Owner must be a project or organisation member' USING ERRCODE='22023'; END IF;
 IF p_record_id IS NULL THEN
  IF p_status IN ('approved','rejected') THEN RAISE EXCEPTION 'Change requires independent decision' USING ERRCODE='22023'; END IF;
  INSERT INTO public.rpos_delivery_records(project_id,record_type,reference,title,description,status,priority,owner_user_id,due_date,impact,mitigation,created_by)
  VALUES(p_project_id,p_type,btrim(p_reference),btrim(p_title),coalesce(p_description,''),p_status,p_priority,p_owner,p_due_date,coalesce(p_impact,''),coalesce(p_mitigation,''),uid) RETURNING * INTO item;
 ELSE
  SELECT * INTO prior FROM public.rpos_delivery_records WHERE id=p_record_id AND project_id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found' USING ERRCODE='22023'; END IF;
  IF prior.record_type<>p_type OR prior.reference<>btrim(p_reference) THEN RAISE EXCEPTION 'Type and reference are immutable' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.rpos_delivery_approvals a WHERE a.record_id=p_record_id)
  THEN RAISE EXCEPTION 'Decided change is immutable; create a new change' USING ERRCODE='22023'; END IF;
  IF p_status IN ('approved','rejected') THEN RAISE EXCEPTION 'Independent change decision required' USING ERRCODE='22023'; END IF;
  UPDATE public.rpos_delivery_records SET title=btrim(p_title),description=coalesce(p_description,''),status=p_status,priority=p_priority,
  owner_user_id=p_owner,due_date=p_due_date,impact=coalesce(p_impact,''),mitigation=coalesce(p_mitigation,''),updated_at=now()
  WHERE id=p_record_id RETURNING * INTO item;
 END IF;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(org,p_project_id,uid,CASE WHEN p_record_id IS NULL THEN 'create' ELSE 'update' END,'delivery_record',item.id::text,to_jsonb(prior),to_jsonb(item));
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_save_delivery_record(text,text,text,text,text,text,uuid,date,text,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_save_delivery_record(text,text,text,text,text,text,uuid,date,text,text,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.rpos_decide_delivery_change(p_record_id uuid,p_decision text,p_rationale text)
RETURNS public.rpos_delivery_approvals LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; prior public.rpos_delivery_records; approval public.rpos_delivery_approvals;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM public.rpos_delivery_records WHERE id=p_record_id FOR UPDATE;
 IF NOT FOUND OR prior.record_type<>'change' OR prior.status<>'pending_approval' THEN RAISE EXCEPTION 'Change is not pending approval' USING ERRCODE='22023'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=prior.project_id;
 IF NOT EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=org AND m.user_id=uid AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Admin or director approval required' USING ERRCODE='42501'; END IF;
 IF uid=prior.created_by OR uid=prior.owner_user_id THEN RAISE EXCEPTION 'Independent approver required' USING ERRCODE='42501'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') OR length(btrim(coalesce(p_rationale,''))) NOT BETWEEN 10 AND 4000
 THEN RAISE EXCEPTION 'Decision and rationale required' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rpos_delivery_approvals(record_id,project_id,decision,rationale,decided_by)
 VALUES(prior.id,prior.project_id,p_decision,btrim(p_rationale)) RETURNING * INTO approval;
 UPDATE public.rpos_delivery_records SET status=p_decision,updated_at=now() WHERE id=prior.id;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(org,prior.project_id,uid,'update','delivery_change',prior.id::text,to_jsonb(prior),to_jsonb(approval));
 RETURN approval;
END $$;
REVOKE ALL ON FUNCTION public.rpos_decide_delivery_change(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_decide_delivery_change(uuid,text,text) TO authenticated;
