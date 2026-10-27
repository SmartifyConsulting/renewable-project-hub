CREATE OR REPLACE FUNCTION private.rpos_can_write_org(target_org text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organisation_memberships m
    WHERE m.organisation_id = target_org AND m.user_id = auth.uid()
      AND m.role IN ('admin','director','manager'))
$$;
REVOKE ALL ON FUNCTION private.rpos_can_write_org(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.rpos_can_write_org(text) TO authenticated;

CREATE OR REPLACE FUNCTION private.rpos_req_text(v text, field text, maxlen int, required boolean)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO '' AS $$
DECLARE t text := btrim(coalesce(v, ''));
BEGIN
  IF required AND t = '' THEN RAISE EXCEPTION '% is required', field USING ERRCODE = '22023'; END IF;
  IF length(t) > maxlen THEN RAISE EXCEPTION '% must be % characters or fewer', field, maxlen USING ERRCODE = '22023'; END IF;
  RETURN t;
END $$;

-- Portfolios
CREATE OR REPLACE FUNCTION public.rpos_upsert_portfolio(
  p_id text, p_org_id text, p_name text, p_description text DEFAULT '', p_owner text DEFAULT '',
  p_status text DEFAULT 'Active', p_geography text DEFAULT '', p_technology text DEFAULT '')
RETURNS public.portfolios LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE old_row public.portfolios; new_row public.portfolios; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('Active','On hold','Closed') THEN RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023'; END IF;
  IF p_id IS NULL THEN
    IF NOT private.rpos_can_write_org(p_org_id) THEN
      RAISE EXCEPTION 'You need an admin, director or manager role in this organisation' USING ERRCODE = '42501'; END IF;
    INSERT INTO public.portfolios (org_id, name, description, owner, status, geography, technology)
    VALUES (p_org_id, private.rpos_req_text(p_name,'Name',200,true), private.rpos_req_text(p_description,'Description',2000,false),
      private.rpos_req_text(p_owner,'Owner',200,false), p_status, private.rpos_req_text(p_geography,'Geography',200,false),
      private.rpos_req_text(p_technology,'Technology',200,false))
    RETURNING * INTO new_row;
  ELSE
    SELECT * INTO old_row FROM public.portfolios WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR NOT private.rpos_can_write_org(old_row.org_id) THEN
      RAISE EXCEPTION 'Portfolio not found or not editable' USING ERRCODE = '42501'; END IF;
    IF p_org_id IS DISTINCT FROM old_row.org_id THEN
      RAISE EXCEPTION 'A portfolio cannot be moved to another organisation' USING ERRCODE = '22023'; END IF;
    UPDATE public.portfolios SET name = private.rpos_req_text(p_name,'Name',200,true),
      description = private.rpos_req_text(p_description,'Description',2000,false),
      owner = private.rpos_req_text(p_owner,'Owner',200,false), status = p_status,
      geography = private.rpos_req_text(p_geography,'Geography',200,false),
      technology = private.rpos_req_text(p_technology,'Technology',200,false), updated_at = now()
    WHERE id = p_id RETURNING * INTO new_row;
  END IF;
  INSERT INTO public.audit_events (project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (NULL, uid, CASE WHEN p_id IS NULL THEN 'create' ELSE 'update' END, 'portfolio', new_row.id,
    CASE WHEN p_id IS NULL THEN NULL ELSE to_jsonb(old_row) END, to_jsonb(new_row));
  RETURN new_row;
END $$;

-- Projects
CREATE OR REPLACE FUNCTION public.rpos_upsert_project(
  p_id text, p_portfolio_id text, p_name text, p_technology text DEFAULT 'Solar PV', p_capacity text DEFAULT '',
  p_country text DEFAULT 'South Africa', p_region text DEFAULT '', p_stage text DEFAULT 'Origination',
  p_status text DEFAULT 'Active', p_budget numeric DEFAULT 0, p_cod date DEFAULT NULL, p_objective text DEFAULT '')
RETURNS public.projects LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE old_row public.projects; new_row public.projects; uid uuid := auth.uid(); target_org text; old_org text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT org_id INTO target_org FROM public.portfolios WHERE id = p_portfolio_id;
  IF target_org IS NULL OR NOT private.rpos_can_write_org(target_org) THEN
    RAISE EXCEPTION 'Portfolio not found or you cannot add projects to it' USING ERRCODE = '42501'; END IF;
  IF p_technology NOT IN ('Solar PV','Wind','BESS','Hybrid') THEN RAISE EXCEPTION 'Invalid technology' USING ERRCODE = '22023'; END IF;
  IF p_status NOT IN ('Active','On hold','Closed') THEN RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023'; END IF;
  IF p_budget IS NULL OR p_budget < 0 OR p_budget > 1e13 THEN RAISE EXCEPTION 'Budget must be zero or more' USING ERRCODE = '22023'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.projects (portfolio_id, name, technology, capacity, country, region, stage, status, budget, cod, objective)
    VALUES (p_portfolio_id, private.rpos_req_text(p_name,'Name',200,true), p_technology, private.rpos_req_text(p_capacity,'Capacity',50,false),
      private.rpos_req_text(p_country,'Country',100,true), private.rpos_req_text(p_region,'Region',100,false),
      private.rpos_req_text(p_stage,'Stage',50,true), p_status, p_budget, p_cod, private.rpos_req_text(p_objective,'Objective',2000,false))
    RETURNING * INTO new_row;
  ELSE
    SELECT * INTO old_row FROM public.projects WHERE id = p_id FOR UPDATE;
    SELECT org_id INTO old_org FROM public.portfolios WHERE id = old_row.portfolio_id;
    IF NOT FOUND OR old_org IS NULL OR NOT private.rpos_can_write_org(old_org) THEN
      RAISE EXCEPTION 'Project not found or not editable' USING ERRCODE = '42501'; END IF;
    UPDATE public.projects SET portfolio_id = p_portfolio_id, name = private.rpos_req_text(p_name,'Name',200,true),
      technology = p_technology, capacity = private.rpos_req_text(p_capacity,'Capacity',50,false),
      country = private.rpos_req_text(p_country,'Country',100,true), region = private.rpos_req_text(p_region,'Region',100,false),
      stage = private.rpos_req_text(p_stage,'Stage',50,true), status = p_status, budget = p_budget, cod = p_cod,
      objective = private.rpos_req_text(p_objective,'Objective',2000,false)
    WHERE id = p_id RETURNING * INTO new_row;
  END IF;
  INSERT INTO public.audit_events (project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (new_row.id, uid, CASE WHEN p_id IS NULL THEN 'create' ELSE 'update' END, 'project', new_row.id,
    CASE WHEN p_id IS NULL THEN NULL ELSE to_jsonb(old_row) END, to_jsonb(new_row));
  RETURN new_row;
END $$;

REVOKE ALL ON FUNCTION public.rpos_upsert_portfolio(text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpos_upsert_project(text,text,text,text,text,text,text,text,text,numeric,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpos_upsert_portfolio(text,text,text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpos_upsert_project(text,text,text,text,text,text,text,text,text,numeric,date,text) TO authenticated;
GRANT SELECT ON public.audit_events TO authenticated;