-- Run in the Supabase SQL Editor. This transaction cannot modify data.
BEGIN TRANSACTION READ ONLY;

SELECT schemaname, tablename, rowsecurity
FROM pg_tables WHERE schemaname IN ('public', 'storage') ORDER BY 1, 2;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname IN ('public', 'storage') ORDER BY 1, 2, 3;

SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema IN ('public', 'storage') AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY 1, 2, 3, 4;

SELECT table_schema, table_name, column_name, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY 1, 2, 3, 4;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname IN ('public', 'storage') ORDER BY 1, 2, 3;

SELECT n.nspname AS schema_name, t.relname AS table_name, c.conname,
       c.convalidated, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' ORDER BY 1, 2, 3;

SELECT n.nspname AS schema_name, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer, p.proconfig, p.proacl,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' ORDER BY 1, 2, 3;

SELECT schemaname, relname, n_live_tup, n_dead_tup, seq_scan, idx_scan,
       last_autovacuum, last_autoanalyze, pg_total_relation_size(relid) AS total_bytes
FROM pg_stat_user_tables WHERE schemaname IN ('public', 'storage') ORDER BY total_bytes DESC;

SELECT schemaname, relname, indexrelname, idx_scan, pg_relation_size(indexrelid) AS index_bytes
FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY 1, 2, 3;

SELECT tgrelid::regclass AS table_name, tgname, pg_get_triggerdef(oid) AS definition
FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (
  SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'
) ORDER BY 1, 2;

COMMIT;
