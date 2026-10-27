-- Require organisation-specific activation before submitting any recommendation.
CREATE OR REPLACE FUNCTION public.rpos_submit_ai_recommendation(
 p_project_id text,p_agent_key text,p_title text,p_recommendation text,p_sources text
) RETURNS public.rpos_ai_recommendations
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_org text;v_item public.rpos_ai_recommendations;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF v_org IS NULL OR NOT private.rpos_can_write_org(v_org) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rpos_ai_agent_settings s WHERE s.organisation_id=v_org AND s.agent_key=p_agent_key AND s.enabled)
 THEN RAISE EXCEPTION 'Agent not enabled for this organisation'; END IF;
 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 250
 OR length(btrim(coalesce(p_recommendation,''))) NOT BETWEEN 10 AND 8000
 OR length(btrim(coalesce(p_sources,''))) NOT BETWEEN 3 AND 4000
 THEN RAISE EXCEPTION 'Invalid recommendation or missing sources'; END IF;
 INSERT INTO public.rpos_ai_recommendations(project_id,agent_key,title,recommendation,source_references,status,created_by)
 VALUES(p_project_id,p_agent_key,btrim(p_title),btrim(p_recommendation),btrim(p_sources),'submitted',v_user)
 RETURNING * INTO v_item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,after_state)
 VALUES(v_org,p_project_id,v_user,'create','ai_recommendation',v_item.id::text,to_jsonb(v_item));
 RETURN v_item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_submit_ai_recommendation(text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_submit_ai_recommendation(text,text,text,text,text) TO authenticated;
