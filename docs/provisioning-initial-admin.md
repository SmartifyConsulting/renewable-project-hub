# Provisioning the first organisation admin (operators only)

RPOS never creates memberships automatically, and the app has no way to grant
the *first* admin of an organisation: every membership RPC requires the caller
to already be an admin of that organisation. Bootstrapping is therefore a
manual, audited operator task.

**Who may do this:** only an authorised operator with privileged database
access to the RPOS backend (e.g. via the backend SQL editor), acting on a
verified request from the customer organisation. Never put service-role keys,
database passwords or tokens in the app, scripts committed to the repo, chat,
or tickets.

## Before you start

1. Obtain a written request from the organisation naming the first admin.
2. Ask that person to sign in to RPOS once and send the **user ID** shown on
   their "No organisation membership yet" screen, plus their email address.
3. Verify the user ID belongs to that email:
   ```sql
   select id, email, email_confirmed_at from auth.users where id = '<USER_UUID>';
   ```
   Stop if no row is returned or the email does not match.

## Provision (single transaction)

Replace the placeholders. Do not run this without a verified request.

```sql
begin;

-- 1. Create the organisation if it does not already exist.
insert into public.organisations (id, name, country)
values ('<ORG_ID>', '<Organisation name>', 'South Africa')
on conflict (id) do nothing;

-- 2. Grant the first admin membership.
insert into public.organisation_memberships (organisation_id, user_id, role)
values ('<ORG_ID>', '<USER_UUID>', 'admin');

-- 3. Record the bootstrap in the append-only audit log.
--    actor_user_id is NULL because an operator, not an app user, acted.
insert into public.audit_events
  (organisation_id, project_id, actor_user_id, action, entity_type, entity_id, before_state, after_state)
values
  ('<ORG_ID>', null, null, 'add', 'organisation_membership', '<USER_UUID>', null,
   jsonb_build_object('organisation_id', '<ORG_ID>', 'user_id', '<USER_UUID>', 'role', 'admin',
                      'provisioned_by', 'operator', 'request_ref', '<TICKET_OR_REQUEST_REF>'));

commit;
```

## After provisioning

- Ask the new admin to refresh `/workspace`; they should see their organisation
  and the **Members** page controls.
- From then on, the admin adds everyone else through **Members** (by user ID).
  Operators should not add further members by hand.
- Recommend that the organisation appoints at least two admins: the database
  refuses to remove or demote the last admin.

## Do not

- Grant INSERT/UPDATE/DELETE on any public table to client roles.
- Create user accounts on someone's behalf or reuse another person's user ID.
- Edit or delete audit events (they are append-only and the database blocks it).
