import { mkdir, writeFile } from "node:fs/promises";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!token || !url) throw new Error("Missing local Supabase configuration");
const ref = new URL(url).hostname.split(".")[0];
const directory = ".tmp/database-audit";
await mkdir(directory, { recursive: true });

async function request(path, query) {
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/${path}`, {
      method: query ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(query ? { body: JSON.stringify({ query, read_only: true }) } : {}),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) return { status: response.status };
    return { status: response.status, data: await response.json() };
  } catch (error) {
    return { status: "network-error", error: error.name, cause: error.cause?.code };
  }
}

const queries = {
  tables:
    "SELECT schemaname,tablename,rowsecurity FROM pg_tables WHERE schemaname IN ('public','storage') ORDER BY 1,2",
  policies:
    "SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3",
  grants:
    "SELECT table_schema,table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema IN ('public','storage') AND grantee IN ('anon','authenticated','PUBLIC') ORDER BY 1,2,3,4",
  indexes:
    "SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('public','storage') ORDER BY 1,2,3",
  constraints:
    "SELECT n.nspname AS schema_name,t.relname AS table_name,c.conname,c.convalidated,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY 1,2,3",
  functions:
    "SELECT p.proname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY 1",
  statistics:
    "SELECT schemaname,relname,n_live_tup,n_dead_tup,seq_scan,idx_scan,last_autovacuum,last_autoanalyze,pg_total_relation_size(relid) AS total_bytes FROM pg_stat_user_tables WHERE schemaname IN ('public','storage') ORDER BY total_bytes DESC",
  triggers:
    "SELECT tgrelid::regclass::text AS table_name,tgname,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') ORDER BY 1,2",
  extensions: "SELECT extname FROM pg_extension ORDER BY 1",
  privateColumnPermissions:
    "SELECT has_column_privilege('anon','public.testimonials','email','SELECT') AS review_email_public,has_column_privilege('anon','public.store_settings','admin_email','SELECT') AS admin_email_public",
  adminFunction: "SELECT pg_get_functiondef('public.is_admin()'::regprocedure) AS definition",
  slowQueries:
    "SELECT queryid::text,calls,round(mean_exec_time::numeric,2) AS mean_ms,round(total_exec_time::numeric,2) AS total_ms,rows FROM extensions.pg_stat_statements WHERE userid=(SELECT oid FROM pg_roles WHERE rolname='authenticator') ORDER BY total_exec_time DESC LIMIT 15",
};
const report = { checkedAt: new Date().toISOString(), readOnly: true, checks: {} };
for (const [name, query] of Object.entries(queries)) {
  report.checks[name] = await request(
    "database/query",
    `BEGIN TRANSACTION READ ONLY; ${query}; COMMIT;`,
  );
  if (report.checks[name].status === "network-error") {
    report.checks[name] = await request(
      "database/query",
      `BEGIN TRANSACTION READ ONLY; ${query}; COMMIT;`,
    );
  }
  await writeFile(`${directory}/management-audit.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      check: name,
      status: report.checks[name].status,
      rows: report.checks[name].data?.length,
    }),
  );
}
const backups = await request("database/backups");
const backupData = backups.data;
// Backup download URLs may be signed; retain only availability and timestamps.
report.backups = {
  status: backups.status,
  pitrEnabled: backupData?.pitr_enabled,
  region: backupData?.region,
  backups: backupData?.backups?.map(({ status, inserted_at }) => ({ status, inserted_at })),
};
await writeFile(`${directory}/management-audit.json`, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({ saved: `${directory}/management-audit.json`, backups: report.backups }),
);
