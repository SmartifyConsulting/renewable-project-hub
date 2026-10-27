-- Human stage-gate decisions are separate from computed readiness recommendations.
-- This migration depends on 0006. Decisions are immutable records; later decisions supersede earlier ones.
CREATE TABLE IF NOT EXISTS public.readiness_gate_decisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approved', 'conditionally_approved', 'rejected')),
  rationale text NOT NULL CHECK (length(btrim(rationale)) BETWEEN 10 AND 4000),
  decided_by uuid NOT NULL REFERENCES auth.users(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  domain_snapshot jsonb NOT NULL,
  snapshot_updated_at timestamptz NOT NULL,
  CHECK (jsonb_typeof(domain_snapshot) = 'array')
);
CREATE INDEX IF NOT EXISTS readiness_gate_project_time_idx
  ON public.readiness_gate_decisions(project_id, decided_at DESC, id DESC);
ALTER TABLE public.readiness_gate_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.readiness_gate_decisions FROM PUBLIC, anon;
GRANT SELECT ON public.readiness_gate_decisions TO authenticated;
CREATE POLICY rpos_gate_read ON public.readiness_gate_decisions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.portfolios pf ON pf.id = p.portfolio_id
      JOIN public.organisation_memberships om ON om.organisation_id = pf.org_id
      WHERE p.id = project_id AND om.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_memberships pm
      WHERE pm.project_id = project_id AND pm.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.rpos_decide_readiness_gate(
  p_project_id text, p_decision text, p_rationale text
) RETURNS public.readiness_gate_decisions
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  uid uuid := auth.uid();
  org text;
  snapshot jsonb;
  latest timestamptz;
  latest_count bigint;
  item public.readiness_gate_decisions;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT pf.org_id INTO org
    FROM public.projects p JOIN public.portfolios pf ON pf.id = p.portfolio_id
    WHERE p.id = p_project_id FOR SHARE OF p;
  IF org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.organisation_memberships m
    WHERE m.organisation_id = org AND m.user_id = uid AND m.role IN ('admin','director')
  ) THEN RAISE EXCEPTION 'Only organisation admins and directors may decide a gate' USING ERRCODE = '42501'; END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved','conditionally_approved','rejected') THEN
    RAISE EXCEPTION 'Invalid gate decision' USING ERRCODE = '22023'; END IF;
  IF length(btrim(coalesce(p_rationale,''))) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'Decision rationale must be 10–4000 characters' USING ERRCODE = '22023'; END IF;
  -- Lock the project row, also locked by assessment writes, to avoid racing assessment edits.
  PERFORM 1 FROM public.projects WHERE id = p_project_id FOR UPDATE;
  SELECT count(*), max(updated_at), jsonb_agg(to_jsonb(d) ORDER BY domain_id)
    INTO STRICT latest_count, latest, snapshot
    FROM public.readiness_domain_assessments d WHERE d.project_id = p_project_id;
  IF latest_count <> 14 THEN
    RAISE EXCEPTION 'All fourteen readiness domains must be recorded before a gate decision' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.readiness_domain_assessments d
    WHERE d.project_id = p_project_id AND (d.score IS NULL OR NOT d.evidence_verified OR d.hard_stop))
    AND p_decision <> 'rejected' THEN
    RAISE EXCEPTION 'Approval blocked: unscored domains, unverified evidence or hard stops' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.readiness_gate_decisions(project_id, decision, rationale, decided_by, domain_snapshot, snapshot_updated_at)
    VALUES (p_project_id, p_decision, btrim(p_rationale), uid, snapshot, latest)
    RETURNING * INTO item;
  INSERT INTO public.audit_events(organisation_id, project_id, actor_user_id, action, entity_type, entity_id, after_state)
    VALUES (org, p_project_id, uid, 'gate_decision', 'readiness_gate_decision', item.id::text, to_jsonb(item));
  RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_decide_readiness_gate(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpos_decide_readiness_gate(text,text,text) TO authenticated;
-- Prevent altering decision history, including privileged accidental updates.
CREATE OR REPLACE FUNCTION private.rpos_gate_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN RAISE EXCEPTION 'Readiness gate decisions are immutable'; END $$;
CREATE TRIGGER rpos_gate_immutable BEFORE UPDATE OR DELETE ON public.readiness_gate_decisions
FOR EACH ROW EXECUTE FUNCTION private.rpos_gate_immutable();
