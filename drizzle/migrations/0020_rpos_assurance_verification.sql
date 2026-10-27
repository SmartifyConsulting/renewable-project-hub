-- Corrective action updates and independent NCR verification.
CREATE OR REPLACE FUNCTION public.rpos_update_ncr_action(
 p_ncr_id uuid,p_action text,p_due_date date,p_status text
) RETURNS public.rpos_assurance_ncrs
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_org text;v_old public.rpos_assurance_ncrs;v_item public.rpos_assurance_ncrs;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO v_old FROM public.rpos_assurance_ncrs WHERE id=p_ncr_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'NCR not found'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=v_old.project_id;
 IF v_org IS NULL OR NOT private.rpos_can_write_org(v_org) THEN RAISE EXCEPTION 'Access denied'; END IF;
 IF v_old.status='closed' THEN RAISE EXCEPTION 'Verified NCR is closed'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('open','corrective_action','verification')
 OR length(coalesce(p_action,''))>4000
 OR (p_status='verification' AND length(btrim(coalesce(p_action,'')))<10)
 THEN RAISE EXCEPTION 'Invalid corrective action'; END IF;
 UPDATE public.rpos_assurance_ncrs
 SET corrective_action=coalesce(p_action,''),due_date=p_due_date,status=p_status,updated_at=now()
 WHERE id=p_ncr_id RETURNING * INTO v_item;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(v_org,v_item.project_id,v_user,'update','assurance_ncr',v_item.id::text,to_jsonb(v_old),to_jsonb(v_item));
 RETURN v_item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_update_ncr_action(uuid,text,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_update_ncr_action(uuid,text,date,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.rpos_verify_ncr(
 p_ncr_id uuid,p_notes text
) RETURNS public.rpos_assurance_verifications
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid:=auth.uid();v_org text;v_old public.rpos_assurance_ncrs;v_item public.rpos_assurance_verifications;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO v_old FROM public.rpos_assurance_ncrs WHERE id=p_ncr_id FOR UPDATE;
 IF NOT FOUND OR v_old.status<>'verification' THEN RAISE EXCEPTION 'NCR is not ready for verification'; END IF;
 SELECT pf.org_id INTO v_org FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id WHERE p.id=v_old.project_id;
 IF NOT EXISTS(SELECT 1 FROM public.organisation_memberships m
 WHERE m.organisation_id=v_org AND m.user_id=v_user AND m.role IN ('admin','director'))
 THEN RAISE EXCEPTION 'Admin or director verification required'; END IF;
 IF v_user=v_old.created_by OR v_user=v_old.owner_user_id THEN RAISE EXCEPTION 'Independent verifier required'; END IF;
 IF length(btrim(coalesce(p_notes,''))) NOT BETWEEN 10 AND 4000 THEN RAISE EXCEPTION 'Verification rationale required'; END IF;
 INSERT INTO public.rpos_assurance_verifications(ncr_id,project_id,verified_by,verification_notes)
 VALUES(p_ncr_id,v_old.project_id,v_user,btrim(p_notes)) RETURNING * INTO v_item;
 UPDATE public.rpos_assurance_ncrs SET status='closed',updated_at=now() WHERE id=p_ncr_id;
 INSERT INTO public.audit_events(organisation_id,project_id,actor_user_id,action,entity_type,entity_id,before_state,after_state)
 VALUES(v_org,v_old.project_id,v_user,'update','assurance_verification',p_ncr_id::text,to_jsonb(v_old),to_jsonb(v_item));
 RETURN v_item;
END $fn$;
REVOKE ALL ON FUNCTION public.rpos_verify_ncr(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_verify_ncr(uuid,text) TO authenticated;
