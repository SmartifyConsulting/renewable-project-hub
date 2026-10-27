# RPOS secure foundation

Use the existing Supabase database and preserve the current Lovable UI.

## Database foundation applied (2026-10-27)

The existing `public.projects` table was preserved. Created:
- `public.organisations` — organisation ID, name, country and timestamps.
- `public.portfolios` — organisation-linked portfolio and operational attributes.
- `public.organisation_memberships` — authenticated user/organisation/role association.
- `public.project_memberships` — authenticated user/project/role association.

Both membership tables reference `auth.users`. All four new tables have RLS enabled. `anon` and `authenticated` table grants were revoked on the four new tables until safe policies are implemented. Existing `projects` RLS remains enabled. No seed records were added.

**Access-policy update (2026-10-27):** Five authenticated SELECT policies now exist for organisations, portfolios, organisation memberships, project memberships and projects. Private SECURITY DEFINER membership-check functions support the policies; anonymous access remains disallowed. No client INSERT/UPDATE/DELETE permissions were granted. Policies were verified in `pg_policies`.\n\n**Not complete:** user login, membership provisioning, secured write operations, end-to-end isolation tests, canonical objects, durable audit, and frontend integration. The existing frontend demo role selector is not a security boundary.

## Next implementation sequence

1. Implement verified user identity and secure membership provisioning.
2. Add scoped RLS policies and server-side authorisation before granting client access.
3. Link projects to portfolios after confirming existing data and relationship constraints.
4. Add canonical objects, evidence, decisions and append-only audit.
5. Connect existing UI screens incrementally; run isolation and persistence tests.

## GitHub workflow

Always GET latest `main`, review affected files, check for concurrent changes and push only non-force commits to `main`. Never rewrite Lovable's published history. Preserve the existing UI.
