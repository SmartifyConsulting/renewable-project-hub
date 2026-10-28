<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## RPOS database
- Knowledge Intelligence opts into the shared ViewTabs wrapping presentation; other modules retain their existing grouped navigation to keep presentation changes scoped.
- Keep `public.projects` private with RLS and service-role-only grants until real workspace access policies are implemented; the prototype role selector is not authentication.
- Store project fields in snake_case matching the RPOS Project model; defer the portfolio foreign key until its table exists so this table can be created independently.
- Real customer data lives only under `/workspace` (Supabase email auth, `_authenticated` gate, read-only via RLS SELECT grants); the root `AppShell` demo with mock data and role selector must never read real records nor be presented as authentication.
- Memberships are admin-provisioned; never auto-create memberships or grant client writes.
- Portfolio/project writes go only through SECURITY DEFINER RPCs (`rpos_upsert_portfolio`, `rpos_upsert_project`) that check auth.uid() + org role admin/director/manager and append an audit_events row; clients keep SELECT-only table grants.
- Membership changes go only through admin-only SECURITY DEFINER RPCs (`rpos_set/remove_org_membership`, `rpos_set/remove_project_membership`): caller must be org admin, cannot change self, last org admin cannot be removed, and each change appends an audit event. Org-scoped audit rows (project_id NULL, organisation_id set) are readable by org admin/director/manager; project rows keep project-member visibility.
