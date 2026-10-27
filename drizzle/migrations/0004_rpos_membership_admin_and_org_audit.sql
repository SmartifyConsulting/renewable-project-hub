ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS organisation_id text REFERENCES public.organisations(id);
CREATE INDEX IF NOT EXISTS audit_events_org_idx ON public.audit_events (organisation_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_project_idx ON public.audit_events (project_id, occurred_at DESC);

-- Backfill org scope for existing events (additive; audit rows stay otherwise unchanged).
ALTER TABLE public.audit_events DISABLE TRIGGER rpos_audit_immutable;
UPDATE public.audit_events a SET organisation_id = a.after_state->>'org_id'
  WHERE a.entity_type = 'portfolio' AND a.organisation_id IS NULL AND EXISTS (SELECT 1 FROM public.organisations o WHERE o.id = a.after_state->>'org_id');
ALTER TABLE public.audit_events ENABLE TRIGGER rpos_audit_immutable;

CREATE OR REPLACE FUNCTION private.rpos_is_org_admin(target_org text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.organisation_memberships m
    WHERE m.organisation_id = target_org AND m.user_id = auth.uid() AND m.role = 'admin')
$$;
REVOKE ALL ON FUNCTION private.rpos_is_org_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.rpos_is_org_admin(text) TO authenticated;

-- Organisation-scoped events (portfolio, membership) are readable by org admin/director/manager only.
-- Project-scoped events keep the existing project-member policy.
CREATE POLICY rpos_audit_org_read ON public.audit_events FOR SELECT TO authenticated
  USING (project_id IS NULL AND organisation_id IS NOT NULL AND private.rpos_can_write_org(organisation_id));

CREATE OR REPLACE FUNCTION private.rpos_check_role(r text) RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path TO '' AS $$
BEGIN
  IF r IS NULL OR r NOT IN ('admin','director','manager','member','viewer') THEN
    RAISE EXCEPTION 'Role must be admin, director, manager, member or viewer' USING ERRCODE = '22023'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rpos_set_org_membership(p_org_id text, p_user_id uuid, p_role text)
RETURNS public.organisation_memberships LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid := auth.uid(); old_row public.organisation_memberships; new_row public.organisation_memberships;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT private.rpos_is_org_admin(p_org_id) THEN RAISE EXCEPTION 'Only organisation admins can manage members' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User ID is required' USING ERRCODE = '22023'; END IF;
  IF p_user_id = uid THEN RAISE EXCEPTION 'You cannot change your own membership; ask another admin' USING ERRCODE = '42501'; END IF;
  PERFORM private.rpos_check_role(p_role);
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'No account exists with that user ID' USING ERRCODE = '22023'; END IF;
  SELECT * INTO old_row FROM public.organisation_memberships WHERE organisation_id = p_org_id AND user_id = p_user_id FOR UPDATE;
  INSERT INTO public.organisation_memberships (organisation_id, user_id, role) VALUES (p_org_id, p_user_id, p_role)
    ON CONFLICT (organisation_id, user_id) DO UPDATE SET role = EXCLUDED.role RETURNING * INTO new_row;
  INSERT INTO public.audit_events (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (p_org_id, NULL, uid, CASE WHEN old_row.user_id IS NULL THEN 'add' ELSE 'change_role' END, 'organisation_membership',
    p_user_id::text, to_jsonb(old_row), to_jsonb(new_row));
  RETURN new_row;
END $$;

CREATE OR REPLACE FUNCTION public.rpos_remove_org_membership(p_org_id text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid := auth.uid(); old_row public.organisation_memberships; pm record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT private.rpos_is_org_admin(p_org_id) THEN RAISE EXCEPTION 'Only organisation admins can manage members' USING ERRCODE = '42501'; END IF;
  SELECT * INTO old_row FROM public.organisation_memberships WHERE organisation_id = p_org_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found' USING ERRCODE = '22023'; END IF;
  IF old_row.role = 'admin' AND (SELECT count(*) FROM public.organisation_memberships
      WHERE organisation_id = p_org_id AND role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last admin of an organisation' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.organisation_memberships WHERE organisation_id = p_org_id AND user_id = p_user_id;
  INSERT INTO public.audit_events (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (p_org_id, NULL, uid, 'remove', 'organisation_membership', p_user_id::text, to_jsonb(old_row), NULL);
  -- Revoke the user's direct project memberships inside this organisation.
  FOR pm IN DELETE FROM public.project_memberships m USING public.projects p, public.portfolios pf
      WHERE m.user_id = p_user_id AND p.id = m.project_id AND pf.id = p.portfolio_id AND pf.org_id = p_org_id
      RETURNING m.* LOOP
    INSERT INTO public.audit_events (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
    VALUES (p_org_id, pm.project_id, uid, 'remove', 'project_membership', p_user_id::text, to_jsonb(pm), NULL);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.rpos_project_org(p_project_id text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT pf.org_id FROM public.projects p JOIN public.portfolios pf ON pf.id = p.portfolio_id WHERE p.id = p_project_id
$$;
REVOKE ALL ON FUNCTION private.rpos_project_org(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.rpos_project_org(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.rpos_set_project_membership(p_project_id text, p_user_id uuid, p_role text)
RETURNS public.project_memberships LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid := auth.uid(); org text; old_row public.project_memberships; new_row public.project_memberships;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  org := private.rpos_project_org(p_project_id);
  IF org IS NULL OR NOT private.rpos_is_org_admin(org) THEN
    RAISE EXCEPTION 'Only admins of the project''s organisation can manage project members' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User ID is required' USING ERRCODE = '22023'; END IF;
  IF p_user_id = uid THEN RAISE EXCEPTION 'You cannot change your own membership; ask another admin' USING ERRCODE = '42501'; END IF;
  PERFORM private.rpos_check_role(p_role);
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'No account exists with that user ID' USING ERRCODE = '22023'; END IF;
  SELECT * INTO old_row FROM public.project_memberships WHERE project_id = p_project_id AND user_id = p_user_id FOR UPDATE;
  INSERT INTO public.project_memberships (project_id, user_id, role) VALUES (p_project_id, p_user_id, p_role)
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role RETURNING * INTO new_row;
  INSERT INTO public.audit_events (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (org, p_project_id, uid, CASE WHEN old_row.user_id IS NULL THEN 'add' ELSE 'change_role' END, 'project_membership',
    p_user_id::text, to_jsonb(old_row), to_jsonb(new_row));
  RETURN new_row;
END $$;

CREATE OR REPLACE FUNCTION public.rpos_remove_project_membership(p_project_id text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid := auth.uid(); org text; old_row public.project_memberships;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  org := private.rpos_project_org(p_project_id);
  IF org IS NULL OR NOT private.rpos_is_org_admin(org) THEN
    RAISE EXCEPTION 'Only admins of the project''s organisation can manage project members' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.project_memberships WHERE project_id = p_project_id AND user_id = p_user_id RETURNING * INTO old_row;
  IF old_row.user_id IS NULL THEN RAISE EXCEPTION 'Membership not found' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.audit_events (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (org, p_project_id, uid, 'remove', 'project_membership', p_user_id::text, to_jsonb(old_row), NULL);
END $$;

-- Portfolio events now carry organisation scope so org leaders can read them.
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
  INSERT INTO public.audit_events (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (new_row.org_id, NULL, uid, CASE WHEN p_id IS NULL THEN 'create' ELSE 'update' END, 'portfolio', new_row.id,
    CASE WHEN p_id IS NULL THEN NULL ELSE to_jsonb(old_row) END, to_jsonb(new_row));
  RETURN new_row;
END $$;

REVOKE ALL ON FUNCTION public.rpos_set_org_membership(text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpos_remove_org_membership(text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpos_set_project_membership(text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpos_remove_project_membership(text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpos_upsert_portfolio(text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpos_set_org_membership(text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpos_remove_org_membership(text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpos_set_project_membership(text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpos_remove_project_membership(text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpos_upsert_portfolio(text,text,text,text,text,text,text,text) TO authenticated;