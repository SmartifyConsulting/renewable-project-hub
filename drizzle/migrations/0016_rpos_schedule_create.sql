-- Audited schedule creation RPC. Run after 0015.
CREATE OR REPLACE FUNCTION public.rpos_add_delivery_schedule(
 p_project_id text, p_title text, p_start date, p_finish date
) RETURNS public.rpos_delivery_schedule
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_user uuid := auth.uid();
 v_org text;
 v_item public.rpos_delivery_schedule;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT pf.org_id INTO v_org
 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 WHERE p.id=p_project_id;
 IF v_org IS NULL OR NOT private.rpos_can_write_org(v_org) THEN
  RAISE EXCEPTION 'Access denied';
 END IF;
 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 250
    OR p_start IS NULL OR p_finish IS NULL OR p_finish < p_start THEN
  RAISE EXCEPTION 'Invalid schedule entry';
 END IF;
 INSERT INTO public.rpos_delivery_schedule(
  project_id,title,start_date,finish_date,baseline_finish_date,created_by
 ) VALUES(p_project_id,btrim(p_title),p_start,p_finish,p_finish,v_user)
 RETURNING * INTO v_item;
 RETURN v_item;
END
$fn$;
REVOKE ALL ON FUNCTION public.rpos_add_delivery_schedule(text,text,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_add_delivery_schedule(text,text,date,date) TO authenticated;
