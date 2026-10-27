-- AI Agent Centre: governed agent catalogue and human-reviewed recommendations.
-- Apply after migration 0021. No automatic AI execution or external model calls.
CREATE TABLE IF NOT EXISTS public.rpos_ai_agents (
 agent_key text PRIMARY KEY CHECK(length(agent_key) BETWEEN 3 AND 80),
 name text NOT NULL,
 domain text NOT NULL,
 purpose text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.rpos_ai_agents(agent_key,name,domain,purpose) VALUES
('readiness','Readiness Analyst','Readiness','Identify readiness gaps and supporting evidence'),
('commercial','Commercial Analyst','Commercial','Assess commercial assumptions and exposures'),
('financial','Financial Analyst','Financial','Review budgets and financial assumptions'),
('technical','Technical Reviewer','Technical','Review technical design and specifications'),
('engineering','Engineering Reviewer','Engineering','Assess engineering deliverables'),
('procurement','Procurement Analyst','Procurement','Review procurement risks and dependencies'),
('contracts','Contracts Analyst','Legal','Flag contractual obligations and issues'),
('legal','Legal Research Assistant','Legal','Identify legal questions requiring expert review'),
('permits','Permitting Analyst','Regulatory','Track permit obligations and dependencies'),
('environment','Environmental Analyst','ESG','Review environmental commitments'),
('social','Social Impact Analyst','ESG','Review community and social obligations'),
('health_safety','HSE Analyst','HSE','Review safety risks and controls'),
('schedule','Schedule Analyst','Delivery','Identify schedule slippage and dependencies'),
('risk','Risk Analyst','Delivery','Review risk exposure and mitigation'),
('quality','Quality Analyst','Assurance','Review inspections and nonconformances'),
('documents','Document Intelligence','Knowledge','Identify source gaps and conflicting claims'),
('change','Change Control Analyst','Delivery','Review proposed change impacts'),
('portfolio','Portfolio Analyst','Executive','Compare project performance indicators'),
('reporting','Reporting Analyst','Executive','Prepare draft management summaries')
ON CONFLICT (agent_key) DO NOTHING;
ALTER TABLE public.rpos_ai_agents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_ai_agents FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_ai_agents TO authenticated;
CREATE POLICY rpos_ai_agents_read ON public.rpos_ai_agents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TABLE IF NOT EXISTS public.rpos_ai_recommendations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 agent_key text NOT NULL REFERENCES public.rpos_ai_agents(agent_key),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 250),
 recommendation text NOT NULL CHECK(length(btrim(recommendation)) BETWEEN 10 AND 8000),
 source_references text NOT NULL CHECK(length(btrim(source_references)) BETWEEN 3 AND 4000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','rejected')),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 review_rationale text,
 CHECK((status IN ('approved','rejected'))=(reviewed_by IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS rpos_ai_recommendations_project ON public.rpos_ai_recommendations(project_id,status);
ALTER TABLE public.rpos_ai_recommendations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_ai_recommendations FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_ai_recommendations TO authenticated;
CREATE POLICY rpos_ai_recommendations_read ON public.rpos_ai_recommendations FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
