import { readFile, mkdir, writeFile } from "node:fs/promises";

const phase = process.argv.find((arg) => arg.startsWith("--phase="))?.slice(8);
const phases = {
  foundation: [
    "20261006020000_shared_api_rate_limits.sql",
    "20261006021000_database_pagination.sql",
    "20261006023000_scaling_indexes.sql",
  ],
  queue: ["20261006022000_notification_queue.sql", "20261006024000_notification_cron.sql"],
  security: ["20261005150000_server_only_public_submissions.sql"],
};
if (!Object.hasOwn(phases, phase ?? ""))
  throw new Error("Choose --phase=foundation|queue|security.");
const apply = process.argv.includes("--apply");
if (apply && phase === "security" && !process.argv.includes("--compatible-app-deployed"))
  throw new Error("Verify the compatible production APIs before closing direct database access.");
if (apply && phase === "queue" && !process.argv.includes("--worker-deployed"))
  throw new Error("Deploy and verify notification worker authentication before activation.");
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !token) throw new Error("Missing local Supabase configuration.");
const ref = new URL(url).hostname.split(".")[0];
let query = "BEGIN;\n";
if (phase === "queue") {
  const endpoint = `${new URL(url).origin}/functions/v1/notification-worker`.replaceAll("'", "''");
  query += `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='notification_worker_url') THEN PERFORM vault.create_secret('${endpoint}','notification_worker_url'); ELSIF (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='notification_worker_url' LIMIT 1)<>'${endpoint}' THEN RAISE EXCEPTION 'Existing worker URL differs'; END IF; END $$;\n`;
}
for (const filename of phases[phase]) {
  query +=
    (await readFile(`supabase/migrations/${filename}`, "utf8"))
      .replace(/^BEGIN;\s*/i, "")
      .replace(/COMMIT;\s*$/i, "") + "\n";
}
query += `${apply ? "COMMIT" : "ROLLBACK"}; SELECT true AS migration_checks_passed;`;
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, read_only: false }),
  signal: AbortSignal.timeout(90000),
});
if (!response.ok) {
  const error = await response.json().catch(() => ({}));
  let message = String(error.message || "Database operation failed");
  for (const value of [
    token,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.RESEND_WEBHOOK_SECRET,
  ])
    if (value) message = message.replaceAll(value, "[REDACTED]");
  throw new Error(`Migration ${response.status}: ${message.slice(0, 500)}`);
}
const result = {
  checkedAt: new Date().toISOString(),
  phase,
  files: phases[phase],
  applied: apply,
  rolledBack: !apply,
  checks: await response.json(),
};
await mkdir(".tmp/database-audit", { recursive: true });
await writeFile(
  `.tmp/database-audit/scaling-${phase}-${apply ? "applied" : "rehearsal"}.json`,
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
