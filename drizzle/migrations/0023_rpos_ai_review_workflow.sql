-- Agent recommendation submission and independent review. No automatic execution.
CREATE OR REPLACE FUNCTION public.rpos_submit_ai_recommendation(
 p_project_id text,p_agent_key text,p_title text,p_recommendation text,p_sources text
) RETURNS public.rpos_ai_recommendations
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_org text;v_item public.rpos_ai_recommendations;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF v_org IS NULL OR NOT private.rpos_can_write_org(v_org) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rpos_ai_agents WHERE agent_key=p_agent_key AND enabled=true)
 THEN RAISE EXCEPTION 'Agent is not enabled'; END IF;
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
CREATE OR REPLACE FUNCTION public.rpos_review_ai_recommendation(
 p_id uuid,p_decision text,p_rationale text
) RETURNS public.rpos_ai_recommendations
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_org text;v_old public.rpos_ai_recommendations;v_item public.rpos_ai_recommendations;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO v_old FROM public.rpos_ai_recommendations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR v_old.status<>'submitted' THEN RAISE EXCEPTION 'Recommendation not awaiting review'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=v_old.project_id;
 IF NOT EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=v_org AND m.user_id=v_user AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Admin or director approval required'; END IF;
 IF v_user=v_old.created_by THEN RAISE EXCEPTION 'Independent reviewer required'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected')
 OR length(btrim(coalesce(p_rationale,''))) NOT BETWEEN 10 AND 4000
 THEN RAISE EXCEPTION 'Invalid decision or rationale'; END IF;
 UPDATE public.rpos_ai_recommendations SET status=p_decision,reviewed_by=v_user,reviewed_at=now(),review_rationale=btrim(p_rationale)
 WHERE id=p_id RETURNING * INTO v_item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(v_org,v_old.project_id,v_user,'update','ai_recommendation',v_item.id::text,to_jsonb(v_old),to_jsonb(v_item));
 RETURN v_item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_review_ai_recommendation(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_review_ai_recommendation(uuid,text,text) TO authenticated;
