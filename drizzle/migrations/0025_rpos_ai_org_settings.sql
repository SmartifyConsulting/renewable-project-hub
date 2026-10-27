-- Restrict agent activation to an organisation, superseding global activation.
DROP FUNCTION IF EXISTS public.rpos_set_ai_agent_enabled(text,boolean,text);
CREATE TABLE IF NOT EXISTS public.rpos_ai_agent_settings (
 organisation_id text NOT NULL,
 agent_key text NOT NULL REFERENCES public.rpos_ai_agents(agent_key),
 enabled boolean NOT NULL DEFAULT false,
 reason text NOT NULL,
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,agent_key)
);
ALTER TABLE public.rpos_ai_agent_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_ai_agent_settings FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_ai_agent_settings TO authenticated;
CREATE POLICY rpos_ai_agent_settings_read ON public.rpos_ai_agent_settings FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=organisation_id AND m.user_id=auth.uid())
);
CREATE OR REPLACE FUNCTION public.rpos_set_org_ai_agent(
 p_org_id text,p_agent_key text,p_enabled boolean,p_reason text
) RETURNS public.rpos_ai_agent_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_item public.rpos_ai_agent_settings;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organisation_memberships m
 WHERE m.organisation_id=p_org_id AND m.user_id=v_user AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Organisation administrator access required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rpos_ai_agents WHERE agent_key=p_agent_key)
 THEN RAISE EXCEPTION 'Agent not found'; END IF;
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 10 AND 1000 OR p_enabled IS NULL
 THEN RAISE EXCEPTION 'Reason and activation state required'; END IF;
 INSERT INTO public.rpos_ai_agent_settings(organisation_id,agent_key,enabled,reason,updated_by)
 VALUES(p_org_id,p_agent_key,p_enabled,btrim(p_reason),v_user)
 ON CONFLICT (organisation_id,agent_key) DO UPDATE SET
 enabled=EXCLUDED.enabled,reason=EXCLUDED.reason,updated_by=EXCLUDED.updated_by,updated_at=now()
 RETURNING * INTO v_item;
 RETURN v_item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_set_org_ai_agent(text,text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_set_org_ai_agent(text,text,boolean,text) TO authenticated;
