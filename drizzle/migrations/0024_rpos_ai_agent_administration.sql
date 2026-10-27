-- Agent administration: auditable, admin-only enable/disable controls.
CREATE OR REPLACE FUNCTION public.rpos_set_ai_agent_enabled(
 p_agent_key text,p_enabled boolean,p_reason text
) RETURNS public.rpos_ai_agents
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_item public.rpos_ai_agents;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organisation_memberships m
 WHERE m.user_id=v_user AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 10 AND 1000 OR p_enabled IS NULL
 THEN RAISE EXCEPTION 'Reason and activation state required'; END IF;
 UPDATE public.rpos_ai_agents SET enabled=p_enabled WHERE agent_key=p_agent_key RETURNING * INTO v_item;
 IF NOT FOUND THEN RAISE EXCEPTION 'Agent not found'; END IF;
 RETURN v_item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_set_ai_agent_enabled(text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_set_ai_agent_enabled(text,boolean,text) TO authenticated;
