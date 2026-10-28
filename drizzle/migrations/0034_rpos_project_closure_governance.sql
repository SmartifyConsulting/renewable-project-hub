-- 0034: Project closure sign-off register.
CREATE TABLE IF NOT EXISTS public.rpos_project_closures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
 signed_by uuid NOT NULL REFERENCES auth.users(id),
 signed_at timestamptz NOT NULL DEFAULT now(),
 signoff_notes text NOT NULL CHECK(length(btrim(signoff_notes)) BETWEEN 20 AND 4000),
 evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 5 AND 1000)
);
ALTER TABLE public.rpos_project_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_project_closures FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_project_closures TO authenticated;
CREATE POLICY rpos_project_closure_read ON public.rpos_project_closures
 FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id
 WHERE p.id=project_id AND m.user_id=auth.uid())
);
