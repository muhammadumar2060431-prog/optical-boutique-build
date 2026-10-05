import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildPermissionFixQuery } from "./permission-fix-query.ts";

const privacy = process.argv.includes("--privacy");
const apply = process.argv.includes("--apply");
const filename = privacy
  ? "20261002020000_private_contact_columns.sql"
  : "20261006010000_atomic_order_inventory.sql";
const sql = await readFile(`supabase/migrations/${filename}`, "utf8");
if (apply && !privacy && !process.argv.includes("--compatible-app-deployed")) {
  throw new Error(
    "Deploy the compatible inventory application before activating inventory write guards.",
  );
}
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!token || !url) throw new Error("Missing local Supabase configuration.");
const ref = new URL(url).hostname.split(".")[0];
let query;
if (privacy) {
  query = buildPermissionFixQuery(sql).replace(
    "COMMIT;",
    () => `
DO $$ BEGIN
  IF has_column_privilege('anon','public.testimonials','email','SELECT')
    OR has_column_privilege('anon','public.store_settings','admin_email','SELECT') THEN
    RAISE EXCEPTION 'Private column protection failed';
  END IF;
END $$;
${apply ? "COMMIT;" : "ROLLBACK;"}`,
  );
} else {
  // Rehearsal changes definitions/backfills only inside a rolled-back transaction.
  query = sql.replace(
    "COMMIT;",
    () => `
SELECT count(*) FILTER(WHERE quantity IS NOT NULL) AS structured_orders,
  count(*) FILTER(WHERE quantity IS NULL AND source<>'form') AS legacy_quantity_review,
  count(*) FILTER(WHERE stock_deducted AND inventory_quantity=0) AS legacy_deduction_review,
  count(*) FILTER(WHERE total>0) AS nonzero_totals FROM public.orders;
${apply ? "COMMIT;" : "ROLLBACK;"}`,
  );
}
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, read_only: false }),
  signal: AbortSignal.timeout(45_000),
});
if (!response.ok) {
  const result = await response.json().catch(() => ({}));
  let message = String(result.message || "Database verification failed");
  for (const name of [
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_SECURITY_PEPPER",
    "ADMIN_SETUP_SECRET",
    "UPSTASH_REDIS_REST_TOKEN",
  ]) {
    if (process.env[name]) message = message.replaceAll(process.env[name], "[REDACTED]");
  }
  throw new Error(`Database operation ${response.status}: ${message.slice(0, 500)}`);
}
const result = {
  checkedAt: new Date().toISOString(),
  filename,
  applied: apply,
  rolledBack: !apply,
  checks: await response.json(),
};
await mkdir(".tmp/database-audit", { recursive: true });
await writeFile(
  `.tmp/database-audit/${privacy ? "privacy" : "inventory"}-${apply ? "applied" : "rehearsal"}.json`,
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
