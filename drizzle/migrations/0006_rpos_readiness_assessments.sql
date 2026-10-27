-- Persistent readiness assessments. Apply through an authorised database migration runner.
-- No browser-side writes are granted; all changes use a scoped SECURITY DEFINER RPC.
CREATE TABLE IF NOT EXISTS public.readiness_domain_assessments (
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  domain_id text NOT NULL CHECK (domain_id ~ '^D(0[1-9]|1[0-4])$'),
  score numeric(3,1) CHECK (score >= 0 AND score <= 5),
  evidence_verified boolean NOT NULL DEFAULT false,
  hard_stop boolean NOT NULL DEFAULT false,
  evidence_notes text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, domain_id),
  CHECK (length(evidence_notes) <= 4000)
);
ALTER TABLE public.readiness_domain_assessments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.readiness_domain_assessments FROM PUBLIC, anon;
GRANT SELECT ON public.readiness_domain_assessments TO authenticated;
DROP POLICY IF EXISTS rpos_readiness_project_read ON public.readiness_domain_assessments;
CREATE POLICY rpos_readiness_project_read ON public.readiness_domain_assessments
  FOR SELECT TO authenticated
  USING (
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

CREATE OR REPLACE FUNCTION public.rpos_save_readiness_domain(
  p_project_id text, p_domain_id text, p_score numeric,
  p_evidence_verified boolean, p_hard_stop boolean, p_evidence_notes text
)
RETURNS public.readiness_domain_assessments
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
  target_org text;
  previous public.readiness_domain_assessments;
  saved public.readiness_domain_assessments;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT pf.org_id INTO target_org
  FROM public.projects p JOIN public.portfolios pf ON pf.id = p.portfolio_id
  WHERE p.id = p_project_id;
  IF target_org IS NULL OR NOT private.rpos_can_write_org(target_org) THEN
    RAISE EXCEPTION 'Not authorised to edit this project' USING ERRCODE = '42501';
  END IF;
  IF p_domain_id IS NULL OR p_domain_id !~ '^D(0[1-9]|1[0-4])$' THEN
    RAISE EXCEPTION 'Invalid readiness domain' USING ERRCODE = '22023';
  END IF;
  IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 5 OR p_score * 2 <> trunc(p_score * 2)) THEN
    RAISE EXCEPTION 'Score must be 0 to 5 in half-point steps' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_evidence_notes, '')) > 4000 THEN
    RAISE EXCEPTION 'Evidence notes too long' USING ERRCODE = '22023';
  END IF;
  -- Serialize concurrent changes to the same project/domain.
  PERFORM 1 FROM public.projects WHERE id = p_project_id FOR UPDATE;
  SELECT * INTO previous FROM public.readiness_domain_assessments
  WHERE project_id = p_project_id AND domain_id = p_domain_id;
  INSERT INTO public.readiness_domain_assessments
    (project_id, domain_id, score, evidence_verified, hard_stop, evidence_notes, updated_by)
  VALUES (p_project_id, p_domain_id, p_score, coalesce(p_evidence_verified, false),
          coalesce(p_hard_stop, false), coalesce(p_evidence_notes, ''), uid)
  ON CONFLICT (project_id, domain_id) DO UPDATE SET
    score = EXCLUDED.score, evidence_verified = EXCLUDED.evidence_verified,
    hard_stop = EXCLUDED.hard_stop, evidence_notes = EXCLUDED.evidence_notes,
    updated_by = uid, updated_at = now()
  RETURNING * INTO saved;
  INSERT INTO public.audit_events
    (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (target_org, p_project_id, uid, CASE WHEN previous.project_id IS NULL THEN 'create' ELSE 'update' END,
          'readiness_domain_assessment', p_project_id || ':' || p_domain_id,
          CASE WHEN previous.project_id IS NULL THEN NULL ELSE to_jsonb(previous) END, to_jsonb(saved));
  RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.rpos_save_readiness_domain(text,text,numeric,boolean,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpos_save_readiness_domain(text,text,numeric,boolean,boolean,text) TO authenticated;
