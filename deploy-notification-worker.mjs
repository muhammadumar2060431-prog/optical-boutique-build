import { readFile } from "node:fs/promises";
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !token) throw new Error("Missing Supabase deployment configuration");
const ref = new URL(url).hostname.split(".")[0];
const form = new FormData();
form.set(
  "metadata",
  JSON.stringify({
    name: "notification-worker",
    entrypoint_path: "notification-worker/index.ts",
    verify_jwt: false,
  }),
);
for (const path of [
  "notification-worker/index.ts",
  "notification-worker/worker.ts",
  "notification-worker/emails.ts",
  "resend-emails/templates.ts",
]) {
  form.append(
    "file",
    new Blob([await readFile(`supabase/functions/${path}`)], { type: "application/typescript" }),
    path,
  );
}
const response = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=notification-worker`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  },
);
if (!response.ok)
  throw new Error(
    `Worker deployment failed (${response.status}): ${JSON.stringify(await response.json()).slice(0, 600)}`,
  );
const result = await response.json();
console.log(JSON.stringify({ slug: result.slug, version: result.version, status: result.status }));
