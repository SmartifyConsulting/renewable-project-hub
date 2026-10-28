-- 0032: Explicit, audited project journey handoffs.
-- Existing title/note markers remain historical context; new links are relational.
CREATE TABLE IF NOT EXISTS public.rpos_journey_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 source_type text NOT NULL CHECK(source_type IN ('readiness_domain','activation_item','delivery_schedule')),
 source_id text NOT NULL,
 target_type text NOT NULL CHECK(target_type IN ('activation_item','delivery_schedule','assurance_inspection')),
 target_id uuid NOT NULL,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT rpos_journey_allowed_pair CHECK (
  (source_type='readiness_domain' AND target_type='activation_item')
  OR (source_type='activation_item' AND target_type='delivery_schedule')
  OR (source_type='delivery_schedule' AND target_type='assurance_inspection')),
 UNIQUE(project_id,source_type,source_id,target_type,target_id)
);
CREATE INDEX IF NOT EXISTS rpos_journey_source_idx ON public.rpos_journey_links(project_id,source_type,source_id);
CREATE INDEX IF NOT EXISTS rpos_journey_target_idx ON public.rpos_journey_links(project_id,target_type,target_id);
ALTER TABLE public.rpos_journey_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_journey_links FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_journey_links TO authenticated;
DROP POLICY IF EXISTS rpos_journey_read ON public.rpos_journey_links;
CREATE POLICY rpos_journey_read ON public.rpos_journey_links FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id WHERE p.id=project_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=project_id AND m.user_id=auth.uid())
);
CREATE OR REPLACE FUNCTION public.rpos_link_journey(
 p_project_id text,p_source_type text,p_source_id text,p_target_type text,p_target_id uuid
) RETURNS public.rpos_journey_links
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_user uuid:=auth.uid();v_org text;v_link public.rpos_journey_links;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF v_org IS NULL OR NOT private.rpos_can_write_org(v_org) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF NOT (
 (p_source_type='readiness_domain' AND p_target_type='activation_item' AND p_source_id ~ '^D(0[1-9]|1[0-4])$'
 AND EXISTS(SELECT 1 FROM public.readiness_domain_assessments a WHERE a.project_id=p_project_id AND a.domain_id=p_source_id)
 AND EXISTS(SELECT 1 FROM public.rpos_activation_items a WHERE a.project_id=p_project_id AND a.id=p_target_id))
 OR
 (p_source_type='activation_item' AND p_target_type='delivery_schedule'
 AND EXISTS(SELECT 1 FROM public.rpos_activation_items a WHERE a.project_id=p_project_id AND a.id::text=p_source_id)
 AND EXISTS(SELECT 1 FROM public.rpos_delivery_schedule d WHERE d.project_id=p_project_id AND d.id=p_target_id))
 OR
 (p_source_type='delivery_schedule' AND p_target_type='assurance_inspection'
 AND EXISTS(SELECT 1 FROM public.rpos_delivery_schedule d WHERE d.project_id=p_project_id AND d.id::text=p_source_id)
 AND EXISTS(SELECT 1 FROM public.rpos_assurance_inspections i WHERE i.project_id=p_project_id AND i.id=p_target_id))
 ) THEN RAISE EXCEPTION 'Invalid cross-project journey link or missing record' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rpos_journey_links(project_id,source_type,source_id,target_type,target_id,created_by)
 VALUES(p_project_id,p_source_type,p_source_id,p_target_type,p_target_id,v_user)
 ON CONFLICT(project_id,source_type,source_id,target_type,target_id) DO NOTHING;
 SELECT * INTO v_link FROM public.rpos_journey_links WHERE project_id=p_project_id
 AND source_type=p_source_type AND source_id=p_source_id AND target_type=p_target_type AND target_id=p_target_id;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,after_state)
 VALUES(v_org,p_project_id,v_user,'link','journey_link',v_link.id::text,to_jsonb(v_link));
 RETURN v_link;
END $$;
REVOKE ALL ON FUNCTION public.rpos_link_journey(text,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_link_journey(text,text,text,text,uuid) TO authenticated;
