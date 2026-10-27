# RPOS secure foundation

Use the existing Supabase database and preserve the current Lovable UI.

Implementation sequence: authenticated memberships; organisations and portfolios; tenant-scoped RLS; canonical records, evidence and append-only audit; incremental UI integration; isolation tests.

Before every push: GET latest main, review affected files, verify latest main has not changed, and push without force. Never rewrite Lovable's published history.

Do not expose public.projects until authenticated, project-scoped policies are in place.
