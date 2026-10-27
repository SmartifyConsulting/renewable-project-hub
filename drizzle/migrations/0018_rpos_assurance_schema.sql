-- Delivery Assurance: inspections, findings and corrective actions.
-- Apply after migration 0017.
CREATE TABLE IF NOT EXISTS public.rpos_assurance_inspections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 2 AND 40),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 250),
 inspection_date date NOT NULL,
 discipline text NOT NULL CHECK(length(btrim(discipline)) BETWEEN 2 AND 120),
 result text NOT NULL DEFAULT 'pending' CHECK(result IN ('pending','pass','fail','conditional')),
 findings text NOT NULL DEFAULT '' CHECK(length(findings)<=4000),
 inspector_user_id uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,reference)
);
CREATE TABLE IF NOT EXISTS public.rpos_assurance_ncrs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 inspection_id uuid NOT NULL REFERENCES public.rpos_assurance_inspections(id) ON DELETE RESTRICT,
 reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 2 AND 40),
 description text NOT NULL CHECK(length(btrim(description)) BETWEEN 10 AND 4000),
 severity text NOT NULL CHECK(severity IN ('minor','major','critical')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','corrective_action','verification','closed')),
 corrective_action text NOT NULL DEFAULT '' CHECK(length(corrective_action)<=4000),
 due_date date,
 owner_user_id uuid REFERENCES auth.users(id),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,reference)
);
CREATE TABLE IF NOT EXISTS public.rpos_assurance_verifications (
 ncr_id uuid PRIMARY KEY REFERENCES public.rpos_assurance_ncrs(id) ON DELETE RESTRICT,
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 verified_by uuid NOT NULL REFERENCES auth.users(id),
 verified_at timestamptz NOT NULL DEFAULT now(),
 verification_notes text NOT NULL CHECK(length(btrim(verification_notes)) BETWEEN 10 AND 4000)
);
CREATE INDEX IF NOT EXISTS rpos_assurance_inspections_project ON public.rpos_assurance_inspections(project_id,inspection_date);
CREATE INDEX IF NOT EXISTS rpos_assurance_ncrs_project ON public.rpos_assurance_ncrs(project_id,status,severity);
ALTER TABLE public.rpos_assurance_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpos_assurance_ncrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpos_assurance_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_assurance_inspections,public.rpos_assurance_ncrs,public.rpos_assurance_verifications FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_assurance_inspections,public.rpos_assurance_ncrs,public.rpos_assurance_verifications TO authenticated;
CREATE POLICY rpos_assurance_inspections_read ON public.rpos_assurance_inspections FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
CREATE POLICY rpos_assurance_ncrs_read ON public.rpos_assurance_ncrs FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
CREATE POLICY rpos_assurance_verifications_read ON public.rpos_assurance_verifications FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
