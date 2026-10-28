-- 0034: Project closure sign-off register.
CREATE TABLE IF NOT EXISTS public.rpos_project_closures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id text NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
 signed_by uuid NOT NULL REFERENCES auth.users(id),
 signed_at timestamptz NOT NULL DEFAULT now(),
 signoff_notes text NOT NULL CHECK(length(btrim(signoff_notes)) BETWEEN 20 AND 4000),
 evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 5 AND 1000)
);
ALTER TABLE public.rpos_project_closures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpos_project_closures FROM PUBLIC,anon;
GRANT SELECT ON public.rpos_project_closures TO authenticated;
CREATE POLICY rpos_project_closure_read ON public.rpos_project_closures
 FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 JOIN public.organisation_memberships m ON m.organisation_id=pf.org_id
 WHERE p.id=project_id AND m.user_id=auth.uid())
);

CREATE OR REPLACE FUNCTION public.rpos_signoff_project_closure(
 p_project_id text,p_notes text,p_evidence_reference text
) RETURNS public.rpos_project_closures
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_user uuid:=auth.uid();v_org text;v_result public.rpos_project_closures;
BEGIN
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF v_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.organisation_memberships m
 WHERE m.organisation_id=v_org AND m.user_id=v_user AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Admin or director required'; END IF;
 IF length(btrim(coalesce(p_notes,''))) NOT BETWEEN 20 AND 4000 OR length(btrim(coalesce(p_evidence_reference,''))) NOT BETWEEN 5 AND 1000
 THEN RAISE EXCEPTION 'Closure rationale and evidence reference required'; END IF;
 PERFORM 1 FROM public.projects WHERE id=p_project_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.rpos_activation_items WHERE project_id=p_project_id AND status NOT IN ('completed','cancelled'))
 OR EXISTS(SELECT 1 FROM public.rpos_delivery_schedule WHERE project_id=p_project_id AND status NOT IN ('completed','cancelled'))
 OR EXISTS(SELECT 1 FROM public.rpos_assurance_ncrs WHERE project_id=p_project_id AND status<>'closed')
 THEN RAISE EXCEPTION 'Outstanding work or NCRs prevent closure'; END IF;
 INSERT INTO public.rpos_project_closures(project_id,signed_by,signoff_notes,evidence_reference)
 VALUES(p_project_id,v_user,btrim(p_notes),btrim(p_evidence_reference)) RETURNING * INTO v_result;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,after_state)
 VALUES(v_org,p_project_id,v_user,'create','project_closure',v_result.id::text,to_jsonb(v_result));
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.rpos_signoff_project_closure(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_signoff_project_closure(text,text,text) TO authenticated;
