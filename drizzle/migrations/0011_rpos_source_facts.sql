-- RKI extraction staging: machine-suggested facts are untrusted until independently reviewed.
-- Apply after migration 0010.
CREATE TABLE IF NOT EXISTS public.rpos_source_facts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id uuid NOT NULL REFERENCES public.rpos_knowledge_sources(id) ON DELETE CASCADE,
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 fact_key text NOT NULL CHECK(length(btrim(fact_key)) BETWEEN 2 AND 120),
 fact_value text NOT NULL CHECK(length(btrim(fact_value)) BETWEEN 1 AND 4000),
 excerpt text NOT NULL DEFAULT '' CHECK(length(excerpt)<=4000),
 extraction_method text NOT NULL CHECK(extraction_method IN ('manual','text_pattern')),
 review_status text NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','accepted','rejected')),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 review_notes text NOT NULL DEFAULT '' CHECK(length(review_notes)<=4000),
 CHECK(review_status='pending' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS rpos_facts_source_idx ON public.rpos_source_facts(source_id,created_at DESC);
CREATE INDEX IF NOT EXISTS rpos_facts_project_key_idx ON public.rpos_source_facts(project_id,fact_key);
ALTER TABLE public.rpos_source_facts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_source_facts FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_source_facts TO authenticated;
DROP POLICY IF EXISTS rpos_source_facts_read ON public.rpos_source_facts;
CREATE POLICY rpos_source_facts_read ON public.rpos_source_facts FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships om ON om.organisation_id=pf.org_id
 WHERE p.id=project_id AND om.user_id=auth.uid())
 OR EXISTS (SELECT 1 FROM public.project_memberships pm WHERE pm.project_id=project_id AND pm.user_id=auth.uid())
);
CREATE OR REPLACE FUNCTION public.rpos_record_source_fact(
 p_source_id uuid,p_fact_key text,p_fact_value text,p_excerpt text,p_method text
) RETURNS public.rpos_source_facts LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; src public.rpos_knowledge_sources; item public.rpos_source_facts;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT * INTO src FROM public.rpos_knowledge_sources WHERE id=p_source_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Source not found' USING ERRCODE='22023'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=src.project_id;
 IF org IS NULL OR NOT private.rpos_can_write_org(org) THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_fact_key,''))) NOT BETWEEN 2 AND 120
 OR length(btrim(coalesce(p_fact_value,''))) NOT BETWEEN 1 AND 4000
 OR length(coalesce(p_excerpt,''))>4000 OR p_method IS NULL OR p_method NOT IN ('manual','text_pattern')
 THEN RAISE EXCEPTION 'Invalid extracted fact' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rpos_source_facts(source_id,project_id,fact_key,fact_value,excerpt,extraction_method,created_by)
 VALUES(src.id,src.project_id,btrim(p_fact_key),btrim(p_fact_value),coalesce(p_excerpt,''),p_method,uid)
 RETURNING * INTO item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,after_state)
 VALUES(org,src.project_id,uid,'create','source_fact',item.id::text,to_jsonb(item));
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_record_source_fact(uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_record_source_fact(uuid,text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.rpos_review_source_fact(p_fact_id uuid,p_status text,p_notes text)
RETURNS public.rpos_source_facts LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; prior public.rpos_source_facts; item public.rpos_source_facts;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM public.rpos_source_facts WHERE id=p_fact_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Fact not found' USING ERRCODE='22023'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=prior.project_id;
 IF NOT EXISTS (SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=org AND m.user_id=uid AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Reviewer must be admin or director' USING ERRCODE='42501'; END IF;
 IF prior.created_by=uid THEN RAISE EXCEPTION 'Independent reviewer required' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('accepted','rejected') OR length(btrim(coalesce(p_notes,''))) NOT BETWEEN 10 AND 4000
 THEN RAISE EXCEPTION 'Review status and rationale required' USING ERRCODE='22023'; END IF;
 UPDATE public.rpos_source_facts SET review_status=p_status,reviewed_by=uid,reviewed_at=now(),review_notes=btrim(p_notes)
 WHERE id=p_fact_id RETURNING * INTO item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(org,prior.project_id,uid,'update','source_fact',item.id::text,to_jsonb(prior),to_jsonb(item));
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_review_source_fact(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_review_source_fact(uuid,text,text) TO authenticated;
-- Candidate contradictions: accepted facts with the same key but differing values.
CREATE OR REPLACE VIEW public.rpos_fact_conflicts WITH (security_invoker=true) AS
 SELECT a.project_id,a.fact_key,a.id AS fact_a_id,b.id AS fact_b_id,
 a.fact_value AS value_a,b.fact_value AS value_b,a.source_id AS source_a_id,b.source_id AS source_b_id
 FROM public.rpos_source_facts a JOIN public.rpos_source_facts b
 ON a.project_id=b.project_id AND lower(a.fact_key)=lower(b.fact_key) AND a.id<b.id
 WHERE a.review_status='accepted' AND b.review_status='accepted'
 AND lower(btrim(a.fact_value))<>lower(btrim(b.fact_value));
GRANT SELECT ON public.rpos_fact_conflicts TO authenticated;
