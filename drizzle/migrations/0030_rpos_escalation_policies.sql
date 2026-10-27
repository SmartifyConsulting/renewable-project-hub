-- Organisation-specific escalation thresholds, administered by directors/admins.
-- Apply after 0029. Thresholds drive inbox labels; no email or background jobs.
CREATE TABLE IF NOT EXISTS public.rpos_escalation_policies (
 organisation_id text PRIMARY KEY,
 warning_days integer NOT NULL DEFAULT 2 CHECK(warning_days BETWEEN 0 AND 90),
 critical_days integer NOT NULL DEFAULT 7 CHECK(critical_days BETWEEN 1 AND 180),
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(critical_days>warning_days)
);
ALTER TABLE public.rpos_escalation_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_escalation_policies FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_escalation_policies TO authenticated;
DROP POLICY IF EXISTS rpos_escalation_policies_read ON public.rpos_escalation_policies;
CREATE POLICY rpos_escalation_policies_read ON public.rpos_escalation_policies FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=organisation_id AND m.user_id=auth.uid())
);
CREATE OR REPLACE FUNCTION public.rpos_set_escalation_policy(p_org text,p_warning integer,p_critical integer)
RETURNS public.rpos_escalation_policies LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE uid uuid:=auth.uid(); previous public.rpos_escalation_policies; item public.rpos_escalation_policies;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.organisation_memberships m
 WHERE m.organisation_id=p_org AND m.user_id=uid AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Admin or director required' USING ERRCODE='42501'; END IF;
 IF p_warning IS NULL OR p_critical IS NULL OR p_warning NOT BETWEEN 0 AND 90
 OR p_critical NOT BETWEEN 1 AND 180 OR p_critical<=p_warning
 THEN RAISE EXCEPTION 'Invalid escalation thresholds' USING ERRCODE='22023'; END IF;
 SELECT * INTO previous FROM public.rpos_escalation_policies WHERE organisation_id=p_org FOR UPDATE;
 INSERT INTO public.rpos_escalation_policies(organisation_id,warning_days,critical_days,updated_by)
 VALUES(p_org,p_warning,p_critical,uid)
 ON CONFLICT(organisation_id) DO UPDATE SET warning_days=excluded.warning_days,critical_days=excluded.critical_days,
 updated_by=excluded.updated_by,updated_at=now() RETURNING * INTO item;
 INSERT INTO public.audit_events(organisation_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(p_org,uid,CASE WHEN previous.organisation_id IS NULL THEN 'create' ELSE 'update' END,
 'escalation_policy',p_org,to_jsonb(previous),to_jsonb(item));
 RETURN item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_set_escalation_policy(text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_set_escalation_policy(text,integer,integer) TO authenticated;

-- Project-scoped escalation summary, respecting underlying record RLS.
CREATE OR REPLACE VIEW public.rpos_escalation_overview WITH (security_invoker=true) AS
 SELECT p.id AS project_id,pf.org_id AS organisation_id,
 count(*) FILTER(WHERE n.category='delivery') AS delivery_alerts,
 count(*) FILTER(WHERE n.category='schedule') AS schedule_alerts,
 count(*) FILTER(WHERE n.category='approval') AS approvals_pending,
 count(*) FILTER(WHERE n.severity='critical') AS critical_alerts
 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 LEFT JOIN public.rpos_notifications n ON n.project_id=p.id
 GROUP BY p.id,pf.org_id;
GRANT SELECT ON public.rpos_escalation_overview TO authenticated;
