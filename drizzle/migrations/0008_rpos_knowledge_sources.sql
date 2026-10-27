-- RKI foundation: project-scoped source registry and immutable evidence lineage.
-- Apply after 0007. This stores metadata and references, not document binaries.
CREATE TABLE IF NOT EXISTS public.rpos_knowledge_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 300),
 source_type text NOT NULL CHECK (source_type IN ('document','permit','contract','report','dataset','correspondence','other')),
 source_uri text NOT NULL CHECK (length(btrim(source_uri)) BETWEEN 1 AND 2000),
 description text NOT NULL DEFAULT '' CHECK (length(description) <= 4000),
 status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','in_review','verified','rejected','superseded')),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 review_notes text NOT NULL DEFAULT '' CHECK (length(review_notes) <= 4000),
 UNIQUE(project_id, source_uri),
 CHECK ((status NOT IN ('verified','rejected')) OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS rpos_sources_project_idx ON public.rpos_knowledge_sources(project_id,created_at DESC);
ALTER TABLE public.rpos_knowledge_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_knowledge_sources FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_knowledge_sources TO authenticated;
CREATE POLICY rpos_sources_read ON public.rpos_knowledge_sources FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships om ON om.organisation_id=pf.org_id
 WHERE p.id=project_id AND om.user_id=auth.uid())
 OR EXISTS (SELECT 1 FROM public.project_memberships pm WHERE pm.project_id=project_id AND pm.user_id=auth.uid())
);
CREATE TABLE IF NOT EXISTS public.rpos_readiness_source_links (
 project_id text NOT NULL,
 domain_id text NOT NULL,
 source_id uuid NOT NULL REFERENCES public.rpos_knowledge_sources(id) ON DELETE RESTRICT,
 linked_by uuid NOT NULL REFERENCES auth.users(id),
 linked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(project_id,domain_id,source_id),
 FOREIGN KEY(project_id,domain_id) REFERENCES public.readiness_domain_assessments(project_id,domain_id) ON DELETE CASCADE
);
ALTER TABLE public.rpos_readiness_source_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_readiness_source_links FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_readiness_source_links TO authenticated;
CREATE POLICY rpos_source_links_read ON public.rpos_readiness_source_links FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.rpos_knowledge_sources s WHERE s.id=source_id AND s.project_id=project_id)
 AND (EXISTS (SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships om ON om.organisation_id=pf.org_id
 WHERE p.id=project_id AND om.user_id=auth.uid())
 OR EXISTS (SELECT 1 FROM public.project_memberships pm WHERE pm.project_id=project_id AND pm.user_id=auth.uid()))
);
CREATE OR REPLACE FUNCTION public.rpos_register_knowledge_source(
 p_project_id text,p_title text,p_source_type text,p_source_uri text,p_description text DEFAULT ''
) RETURNS public.rpos_knowledge_sources LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; item public.rpos_knowledge_sources;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF org IS NULL OR NOT private.rpos_can_write_org(org) THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 300 OR length(btrim(coalesce(p_source_uri,''))) NOT BETWEEN 1 AND 2000
 OR length(coalesce(p_description,''))>4000 OR p_source_type IS NULL OR p_source_type NOT IN ('document','permit','contract','report','dataset','correspondence','other')
 THEN RAISE EXCEPTION 'Invalid source metadata' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rpos_knowledge_sources(project_id,title,source_type,source_uri,description,created_by)
 VALUES(p_project_id,btrim(p_title),p_source_type,btrim(p_source_uri),coalesce(p_description,''),uid) RETURNING * INTO item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,after_state)
 VALUES(org,p_project_id,uid,'create','knowledge_source',item.id::text,to_jsonb(item));
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_register_knowledge_source(text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_register_knowledge_source(text,text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.rpos_review_knowledge_source(p_source_id uuid,p_status text,p_notes text)
RETURNS public.rpos_knowledge_sources LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; prior public.rpos_knowledge_sources; item public.rpos_knowledge_sources;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM public.rpos_knowledge_sources WHERE id=p_source_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Source not found' USING ERRCODE='22023'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=prior.project_id;
 IF NOT EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=org AND m.user_id=uid AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Reviewer must be an organisation admin or director' USING ERRCODE='42501'; END IF;
 IF prior.created_by=uid THEN RAISE EXCEPTION 'Source submitter cannot verify own evidence' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('in_review','verified','rejected','superseded') OR length(btrim(coalesce(p_notes,'')))<10 OR length(p_notes)>4000
 THEN RAISE EXCEPTION 'Invalid review status or notes' USING ERRCODE='22023'; END IF;
 UPDATE public.rpos_knowledge_sources SET status=p_status,reviewed_by=uid,reviewed_at=now(),review_notes=btrim(p_notes)
 WHERE id=p_source_id RETURNING * INTO item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(org,prior.project_id,uid,'review','knowledge_source',item.id::text,to_jsonb(prior),to_jsonb(item));
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_review_knowledge_source(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_review_knowledge_source(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.rpos_link_readiness_source(p_project_id text,p_domain_id text,p_source_id uuid)
RETURNS public.rpos_readiness_source_links LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid:=auth.uid(); org text; item public.rpos_readiness_source_links;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
 SELECT pf.org_id INTO org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF org IS NULL OR NOT private.rpos_can_write_org(org) THEN RAISE EXCEPTION 'Not authorised' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rpos_knowledge_sources s WHERE s.id=p_source_id AND s.project_id=p_project_id AND s.status='verified')
 THEN RAISE EXCEPTION 'Source must be verified and belong to this project' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rpos_readiness_source_links(project_id,domain_id,source_id,linked_by)
 VALUES(p_project_id,p_domain_id,p_source_id,uid) RETURNING * INTO item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,after_state)
 VALUES(org,p_project_id,uid,'link','readiness_source',p_domain_id||':'||p_source_id::text,to_jsonb(item));
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.rpos_link_readiness_source(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_link_readiness_source(text,text,uuid) TO authenticated;
