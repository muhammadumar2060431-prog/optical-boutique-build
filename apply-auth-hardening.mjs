import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!token || !url) throw new Error("Missing local Supabase configuration");
const ref = new URL(url).hostname.split(".")[0];
const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const fields = ["password_min_length", "security_update_password_require_reauthentication"];
const beforeResponse = await fetch(endpoint, { headers, signal: AbortSignal.timeout(20_000) });
assert.equal(beforeResponse.status, 200);
const config = await beforeResponse.json();
const before = Object.fromEntries(fields.map((field) => [field, config[field]]));
const patch = {
  password_min_length: Math.max(10, config.password_min_length || 0),
  security_update_password_require_reauthentication: true,
};
await mkdir(".tmp/database-audit", { recursive: true });
await writeFile(".tmp/database-audit/auth-hardening-before.json", JSON.stringify(before, null, 2));
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ dryRun: true, before, proposed: patch }));
  process.exit(0);
}
const applied = await fetch(endpoint, {
  method: "PATCH",
  headers,
  body: JSON.stringify(patch),
  signal: AbortSignal.timeout(20_000),
});
assert.equal(applied.status, 200, "Auth configuration update was not confirmed");
const verified = await fetch(endpoint, { headers, signal: AbortSignal.timeout(20_000) });
assert.equal(verified.status, 200);
const afterConfig = await verified.json();
const after = Object.fromEntries(fields.map((field) => [field, afterConfig[field]]));
assert.deepEqual(after, patch);
assert.equal(afterConfig.disable_signup, config.disable_signup);
assert.equal(afterConfig.external_anonymous_users_enabled, config.external_anonymous_users_enabled);
const result = {
  checkedAt: new Date().toISOString(),
  verified: true,
  before,
  after,
  userCredentialsChanged: false,
};
await writeFile(".tmp/database-audit/auth-hardening-result.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
