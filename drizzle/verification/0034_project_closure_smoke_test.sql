-- RPOS closure smoke test: read-only checks, safe to run in Supabase SQL Editor.
-- SQL Editor runs as a privileged database role, so this does NOT prove authenticated-user RLS or RPC permissions.
SELECT 'closure_table' AS check_name,
       to_regclass('public.rpos_project_closures') IS NOT NULL AS passed;
SELECT 'closure_rpc' AS check_name,
       to_regprocedure('public.rpos_signoff_project_closure(text,text,text)') IS NOT NULL AS passed;
SELECT 'closure_rls_enabled' AS check_name, c.relrowsecurity AS passed
FROM pg_class c WHERE c.oid=to_regclass('public.rpos_project_closures');
SELECT 'closure_select_policy' AS check_name,
       EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='rpos_project_closures' AND policyname='rpos_project_closure_read') AS passed;
SELECT 'closure_rpc_authenticated_execute' AS check_name,
       has_function_privilege('authenticated',
       'public.rpos_signoff_project_closure(text,text,text)', 'EXECUTE') AS passed;
SELECT 'closure_table_authenticated_select' AS check_name,
       has_table_privilege('authenticated','public.rpos_project_closures','SELECT') AS passed;
SELECT project_id, signed_at, signed_by, evidence_reference
FROM public.rpos_project_closures ORDER BY signed_at DESC LIMIT 20;
-- For real end-to-end verification, sign in as an organisation admin/director in the app
-- and attempt both a blocked project and a genuinely eligible project.
