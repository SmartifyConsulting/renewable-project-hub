-- Least privilege: helpers only used inside SECURITY DEFINER RPCs (run as owner) are not needed by client roles.
REVOKE ALL ON FUNCTION private.rpos_project_org(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.rpos_is_org_admin(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.rpos_check_role(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.rpos_req_text(text,text,integer,boolean) FROM PUBLIC, anon, authenticated;

-- Serialises admin-count checks per organisation so two admins cannot concurrently demote/remove each other.
CREATE OR REPLACE FUNCTION private.rpos_assert_other_admin_remains(p_org_id text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  PERFORM 1 FROM public.organisations WHERE id = p_org_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.organisation_memberships
      WHERE organisation_id = p_org_id AND role = 'admin' AND user_id <> p_user_id) THEN
    RAISE EXCEPTION 'Cannot remove or demote the last admin of an organisation' USING ERRCODE = '42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.rpos_assert_other_admin_remains(text,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpos_set_org_membership(p_org_id text, p_user_id uuid, p_role text)
RETURNS public.organisation_memberships LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE uid uuid := auth.uid(); old_row public.organisation_memberships; new_row public.organisation_memberships;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.organisations WHERE id = p_org_id FOR UPDATE;
  IF NOT private.rpos_is_org_admin(p_org_id) THEN RAISE EXCEPTION 'Only organisation admins can manage members' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User ID is required' USING ERRCODE = '22023'; END IF;
  IF p_user_id = uid THEN RAISE EXCEPTION 'You cannot change your own membership; ask another admin' USING ERRCODE = '42501'; END IF;
  PERFORM private.rpos_check_role(p_role);
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'No account exists with that user ID' USING ERRCODE = '22023'; END IF;
  SELECT * INTO old_row FROM public.organisation_memberships WHERE organisation_id = p_org_id AND user_id = p_user_id FOR UPDATE;
  IF old_row.role = 'admin' AND p_role <> 'admin' THEN PERFORM private.rpos_assert_other_admin_remains(p_org_id, p_user_id); END IF;
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
  PERFORM 1 FROM public.organisations WHERE id = p_org_id FOR UPDATE;
  IF NOT private.rpos_is_org_admin(p_org_id) THEN RAISE EXCEPTION 'Only organisation admins can manage members' USING ERRCODE = '42501'; END IF;
  SELECT * INTO old_row FROM public.organisation_memberships WHERE organisation_id = p_org_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found' USING ERRCODE = '22023'; END IF;
  IF old_row.role = 'admin' THEN PERFORM private.rpos_assert_other_admin_remains(p_org_id, p_user_id); END IF;
  DELETE FROM public.organisation_memberships WHERE organisation_id = p_org_id AND user_id = p_user_id;
  INSERT INTO public.audit_events (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (p_org_id, NULL, uid, 'remove', 'organisation_membership', p_user_id::text, to_jsonb(old_row), NULL);
  FOR pm IN DELETE FROM public.project_memberships m USING public.projects p, public.portfolios pf
      WHERE m.user_id = p_user_id AND p.id = m.project_id AND pf.id = p.portfolio_id AND pf.org_id = p_org_id
      RETURNING m.* LOOP
    INSERT INTO public.audit_events (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
    VALUES (p_org_id, pm.project_id, uid, 'remove', 'project_membership', p_user_id::text, to_jsonb(pm), NULL);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.rpos_set_org_membership(text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpos_remove_org_membership(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpos_set_org_membership(text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpos_remove_org_membership(text,uuid) TO authenticated;