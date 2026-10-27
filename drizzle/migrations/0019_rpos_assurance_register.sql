-- Audited inspection and non-conformance registration.
CREATE OR REPLACE FUNCTION public.rpos_record_inspection(
 p_project_id text,p_reference text,p_title text,p_date date,p_discipline text,p_result text,p_findings text
) RETURNS public.rpos_assurance_inspections
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_org text;v_item public.rpos_assurance_inspections;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=p_project_id;
 IF v_org IS NULL OR NOT private.rpos_can_write_org(v_org) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF length(btrim(coalesce(p_reference,''))) NOT BETWEEN 2 AND 40
 OR length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 250
 OR length(btrim(coalesce(p_discipline,''))) NOT BETWEEN 2 AND 120
 OR p_date IS NULL OR p_result IS NULL OR p_result NOT IN ('pending','pass','fail','conditional')
 OR length(coalesce(p_findings,''))>4000 THEN RAISE EXCEPTION 'Invalid inspection'; END IF;
 INSERT INTO public.rpos_assurance_inspections(project_id,reference,title,inspection_date,discipline,result,findings,inspector_user_id)
 VALUES(p_project_id,btrim(p_reference),btrim(p_title),p_date,btrim(p_discipline),p_result,coalesce(p_findings,''),v_user)
 RETURNING * INTO v_item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,after_state)
 VALUES(v_org,p_project_id,v_user,'create','assurance_inspection',v_item.id::text,to_jsonb(v_item));
 RETURN v_item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_record_inspection(text,text,text,date,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_record_inspection(text,text,text,date,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.rpos_record_ncr(
 p_inspection_id uuid,p_reference text,p_description text,p_severity text,p_action text,p_due_date date,p_owner uuid
) RETURNS public.rpos_assurance_ncrs
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_org text;v_inspection public.rpos_assurance_inspections;v_item public.rpos_assurance_ncrs;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO v_inspection FROM public.rpos_assurance_inspections WHERE id=p_inspection_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inspection not found'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=v_inspection.project_id;
 IF v_org IS NULL OR NOT private.rpos_can_write_org(v_org) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF length(btrim(coalesce(p_reference,''))) NOT BETWEEN 2 AND 40
 OR length(btrim(coalesce(p_description,''))) NOT BETWEEN 10 AND 4000
 OR p_severity IS NULL OR p_severity NOT IN ('minor','major','critical')
 OR length(coalesce(p_action,''))>4000 THEN RAISE EXCEPTION 'Invalid NCR'; END IF;
 IF p_owner IS NOT NULL AND NOT (
 EXISTS(SELECT 1 FROM public.organisation_memberships m WHERE m.organisation_id=v_org AND m.user_id=p_owner)
 OR EXISTS(SELECT 1 FROM public.project_memberships m WHERE m.project_id=v_inspection.project_id AND m.user_id=p_owner)
 ) THEN RAISE EXCEPTION 'Owner must belong to project or organisation'; END IF;
 INSERT INTO public.rpos_assurance_ncrs(project_id,inspection_id,reference,description,severity,corrective_action,due_date,owner_user_id,created_by)
 VALUES(v_inspection.project_id,p_inspection_id,btrim(p_reference),btrim(p_description),p_severity,coalesce(p_action,''),p_due_date,p_owner,v_user)
 RETURNING * INTO v_item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,after_state)
 VALUES(v_org,v_item.project_id,v_user,'create','assurance_ncr',v_item.id::text,to_jsonb(v_item));
 RETURN v_item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_record_ncr(uuid,text,text,text,text,date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_record_ncr(uuid,text,text,text,text,date,uuid) TO authenticated;
