import { readFile, writeFile } from "node:fs/promises";
import { buildPermissionFixQuery } from "./permission-fix-query.ts";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!token || !url) throw new Error("Missing local Supabase configuration");
const ref = new URL(url).hostname.split(".")[0];
const audit = JSON.parse(await readFile(".tmp/database-audit/management-audit.json", "utf8"));
if (audit.checks.policies.status !== 201) throw new Error("Verified policy inventory required");

const sql = await readFile(
  process.argv.includes("--catalog-reads")
    ? "supabase/migrations/20261003010000_limit_public_catalog_reads.sql"
    : process.argv.includes("--catalog")
      ? "supabase/migrations/20261002010000_preserve_catalog_and_fix_policy_names.sql"
      : "supabase/migrations/20261002030000_remove_legacy_public_storage_writes.sql",
  "utf8",
);
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ dryRun: true, removesLegacyWritePoliciesOnly: true }));
  process.exit(0);
}

// Verify row contents inside the same transaction; any unintended data change aborts it.
const query = buildPermissionFixQuery(sql);
await writeFile(
  ".tmp/database-audit/permission-fix-before.json",
  JSON.stringify(audit.checks.policies.data, null, 2),
);
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, read_only: false }),
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) {
  const error = await response.json().catch(() => ({}));
  let message = typeof error.message === "string" ? error.message : "No diagnostic message";
  for (const name of [
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_SECURITY_PEPPER",
    "ADMIN_SETUP_SECRET",
    "UPSTASH_REDIS_REST_TOKEN",
  ]) {
    if (process.env[name]) message = message.replaceAll(process.env[name], "[REDACTED]");
  }
  console.log(
    JSON.stringify({ status: response.status, applied: false, message: message.slice(0, 500) }),
  );
  process.exit(1);
}
const result = await response.json();
await writeFile(
  ".tmp/database-audit/permission-fix-result.json",
  JSON.stringify({ checkedAt: new Date().toISOString(), result }, null, 2),
);
console.log(JSON.stringify({ status: response.status, result }));
