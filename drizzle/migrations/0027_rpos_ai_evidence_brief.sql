-- Evidence-grounded agent brief: accepted facts only, with source references.
-- This does not call a language model or approve recommendations.
CREATE OR REPLACE FUNCTION public.rpos_agent_evidence_brief(p_project_id text,p_agent_key text)
RETURNS TABLE(fact_id uuid,source_id uuid,fact_key text,fact_value text,excerpt text,conflict_count bigint)
LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_org text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p
 JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF v_org IS NULL OR NOT EXISTS(
 SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=v_org AND m.user_id=auth.uid()
 UNION ALL SELECT 1 FROM public.project_memberships m WHERE m.project_id=p_project_id AND m.user_id=auth.uid()
 ) THEN RAISE EXCEPTION 'Project access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rpos_ai_agent_settings s
 WHERE s.organisation_id=v_org AND s.agent_key=p_agent_key AND s.enabled)
 THEN RAISE EXCEPTION 'Agent disabled for organisation'; END IF;
 RETURN QUERY
 SELECT f.id,f.source_id,f.fact_key,f.fact_value,f.excerpt,
 (SELECT count(*) FROM public.rpos_source_facts other
 WHERE other.project_id=f.project_id AND other.id<>f.id
 AND other.review_status='accepted' AND lower(btrim(other.fact_key))=lower(btrim(f.fact_key))
 AND lower(btrim(other.fact_value))<>lower(btrim(f.fact_value))) AS conflict_count
 FROM public.rpos_source_facts f
 WHERE f.project_id=p_project_id AND f.review_status='accepted'
 ORDER BY f.fact_key,f.created_at DESC LIMIT 200;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_agent_evidence_brief(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_agent_evidence_brief(text,text) TO authenticated;
