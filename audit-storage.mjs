import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";

const origin = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!origin || !key) throw new Error("Storage audit credentials are unavailable.");
const client = createClient(origin, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const specResponse = await fetch(`${origin}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!specResponse.ok) throw new Error("Database schema could not be inspected. Audit stopped.");
const spec = await specResponse.json();
const tables = Object.keys(spec.paths ?? {})
  .filter((path) => /^\/[A-Za-z_][A-Za-z0-9_]*$/.test(path))
  .map((path) => path.slice(1));
if (!tables.includes("products") || !tables.includes("hero_slides") || !tables.includes("brands")) {
  throw new Error("Database schema is incomplete. Audit stopped.");
}
const references = new Set();
function inspect(value) {
  if (Array.isArray(value)) return value.forEach(inspect);
  if (value && typeof value === "object") return Object.values(value).forEach(inspect);
  if (typeof value !== "string") return;
  for (const match of value.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    try {
      const url = new URL(match[0]);
      if (url.origin !== new URL(origin).origin) continue;
      const prefix = url.pathname.match(
        /^\/storage\/v1\/(?:object\/(?:public|sign)|render\/image\/(?:public|sign))\/optique-images\/(.+)$/,
      );
      if (prefix) references.add(decodeURIComponent(prefix[1]));
    } catch {
      throw new Error("An image reference could not be decoded. Audit stopped.");
    }
  }
}
for (const table of tables) {
  if (table === "storage_cleanup_queue") continue;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not inspect ${table}. Audit stopped.`);
    data.forEach(inspect);
    if (data.length < 1000) break;
  }
}
const files = [];
async function list(prefix = "") {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage
      .from("optique-images")
      .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("Storage listing failed. Audit stopped.");
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id == null && entry.metadata == null) await list(path);
      else
        files.push({
          path,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
          bytes: Number(entry.metadata?.size ?? 0),
        });
    }
    if (data.length < 1000) break;
  }
}
await list();
const folders = new Set([
  "products",
  "categories",
  "collections",
  "hero",
  "brands",
  "reels",
  "testimonials",
  "reviews",
  "settings",
  "blog",
]);
const cutoff = Date.now() - 86400000;
const candidates = files.filter(
  (file) =>
    folders.has(file.path.split("/")[0]) &&
    !file.path.endsWith(".emptyFolderPlaceholder") &&
    !references.has(file.path) &&
    Date.parse(file.createdAt) < cutoff &&
    Date.parse(file.updatedAt) < cutoff,
);
const byFolder = {};
for (const file of candidates) {
  const folder = file.path.split("/")[0];
  byFolder[folder] = (byFolder[folder] ?? 0) + 1;
}
const report = {
  auditedAt: new Date().toISOString(),
  bucket: "optique-images",
  tablesInspected: tables.length,
  storedFiles: files.length,
  referencedFiles: files.filter((file) => references.has(file.path)).length,
  candidates: candidates.length,
  candidateBytes: candidates.reduce((sum, file) => sum + file.bytes, 0),
  byFolder,
  note: "Read-only audit. Nothing was deleted. These files have no saved database references and are older than 24 hours; this does not prove prior admin deletion.",
  files: candidates,
};
await mkdir(".tmp/storage-audit", { recursive: true });
await writeFile(".tmp/storage-audit/report.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({ ...report, files: undefined, report: ".tmp/storage-audit/report.json" }),
);
