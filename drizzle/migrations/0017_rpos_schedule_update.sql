-- Schedule updates with dependency checks; apply after 0016.
CREATE OR REPLACE FUNCTION public.rpos_update_delivery_schedule(
 p_id uuid, p_title text, p_start date, p_finish date,
 p_status text, p_progress integer, p_dependency uuid DEFAULT NULL
) RETURNS public.rpos_delivery_schedule
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_user uuid := auth.uid();
 v_org text;
 v_old public.rpos_delivery_schedule;
 v_item public.rpos_delivery_schedule;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO v_old FROM public.rpos_delivery_schedule WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Schedule entry not found'; END IF;
 SELECT pf.org_id INTO v_org
 FROM public.projects p JOIN public.portfolios pf ON pf.id=p.portfolio_id
 WHERE p.id=v_old.project_id;
 IF v_org IS NULL OR NOT private.rpos_can_write_org(v_org) THEN
  RAISE EXCEPTION 'Access denied';
 END IF;
 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 3 AND 250
 OR p_start IS NULL OR p_finish IS NULL OR p_finish < p_start
 OR p_status IS NULL OR p_status NOT IN ('planned','in_progress','blocked','completed','cancelled')
 OR p_progress IS NULL OR p_progress NOT BETWEEN 0 AND 100
 OR (p_status='completed' AND p_progress<>100)
 THEN RAISE EXCEPTION 'Invalid schedule update'; END IF;
 IF p_dependency IS NOT NULL THEN
  IF p_dependency=p_id OR NOT EXISTS(
   SELECT 1 FROM public.rpos_delivery_schedule
   WHERE id=p_dependency AND project_id=v_old.project_id
  ) THEN RAISE EXCEPTION 'Invalid predecessor'; END IF;
  IF EXISTS(
   WITH RECURSIVE chain AS (
    SELECT id,depends_on FROM public.rpos_delivery_schedule WHERE id=p_dependency
    UNION ALL
    SELECT d.id,d.depends_on FROM public.rpos_delivery_schedule d
    JOIN chain c ON d.id=c.depends_on
   ) SELECT 1 FROM chain WHERE id=p_id
  ) THEN RAISE EXCEPTION 'Circular dependency'; END IF;
  IF p_status='completed' AND NOT EXISTS(
   SELECT 1 FROM public.rpos_delivery_schedule WHERE id=p_dependency AND status='completed'
  ) THEN RAISE EXCEPTION 'Complete predecessor first'; END IF;
 END IF;
 UPDATE public.rpos_delivery_schedule
 SET title=btrim(p_title),start_date=p_start,finish_date=p_finish,
 status=p_status,progress_percent=p_progress,depends_on=p_dependency
 WHERE id=p_id RETURNING * INTO v_item;
 RETURN v_item;
END
$fn$;
REVOKE ALL ON FUNCTION public.rpos_update_delivery_schedule(uuid,text,date,date,text,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpos_update_delivery_schedule(uuid,text,date,date,text,integer,uuid) TO authenticated;
