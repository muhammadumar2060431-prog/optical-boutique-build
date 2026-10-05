import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configure local Supabase access first.");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) },
});
const tables = [
  "products",
  "categories",
  "collections",
  "hero_slides",
  "brands",
  "social_reels",
  "testimonials",
  "faqs",
  "orders",
  "queries",
  "subscribers",
  "store_settings",
  "announcements",
  "video_settings",
  "blog_posts",
  "admin_users",
  "admin_security_profiles",
  "admin_login_attempts",
  "checkout_idempotency",
  "checkout_idempotency_orders",
  "api_rate_limits",
];

async function readWithRetry(operation, label) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await operation();
    if (!result.error) return result;
    console.log(
      JSON.stringify({
        readRetry: label,
        attempt: attempt + 1,
        status: result.error.statusCode ?? result.error.code ?? result.error.name,
      }),
    );
    if (attempt === 3) throw new Error(`${label} failed; backup is incomplete.`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
}

async function listObjects(bucket, prefix, offset) {
  try {
    const response = await fetch(
      new URL(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, url),
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix,
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    const data = await response.json();
    return response.ok && Array.isArray(data)
      ? { data, error: null }
      : { error: { statusCode: response.status } };
  } catch (error) {
    return { error: { name: error.name } };
  }
}

async function downloadObject(object) {
  try {
    const parts = object.path.split("/");
    if (parts.some((part) => part === "." || part === ".."))
      return { error: { name: "InvalidObjectPath" } };
    const path = [object.bucket, ...parts].map(encodeURIComponent).join("/");
    const delivery = object.public ? "public" : "authenticated";
    const response = await fetch(new URL(`/storage/v1/object/${delivery}/${path}`, url), {
      ...(object.public ? {} : { headers: { apikey: key, Authorization: `Bearer ${key}` } }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return { error: { statusCode: response.status } };
    const data = await response.blob();
    if (object.metadata?.size !== undefined && data.size !== Number(object.metadata.size))
      return { error: { name: "ObjectSizeMismatch" } };
    return { data, error: null };
  } catch (error) {
    return { error: { name: error.name } };
  }
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function protect(bytes, undo = false) {
  if (process.platform !== "win32")
    throw new Error(
      "This backup uses Windows DPAPI. Configure a portable encrypted backup before using another OS.",
    );
  const operation = undo ? "Unprotect" : "Protect";
  const command = `Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $p=[System.Security.Cryptography.ProtectedData]::${operation}($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($p))`;
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { input: bytes.toString("base64"), encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0 || !result.stdout)
    throw new Error("Windows backup key protection failed.");
  return Buffer.from(result.stdout.trim(), "base64");
}
function encrypt(bytes, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}
function decrypt(bytes, key) {
  const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
}
async function readTables() {
  const snapshot = {};
  for (const table of tables) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const result = await readWithRetry(
        () =>
          db
            .from(table)
            .select("*")
            .range(offset, offset + 499),
        "table-export",
      );
      if (result.error) throw new Error(`Cannot export ${table}: ${result.error.code}`);
      rows.push(...result.data);
      if (result.data.length < 500) break;
    }
    snapshot[table] = rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return snapshot;
}

const out = resolve(".tmp", "backups", randomUUID());
await mkdir(resolve(out, "objects"), { recursive: true, mode: 0o700 });
const encryptionKey = randomBytes(32);
await writeFile(resolve(out, "key.dpapi"), protect(encryptionKey), { mode: 0o600 });
const startedAt = new Date().toISOString();
const snapshot = await readTables();
const tableBytes = Buffer.from(JSON.stringify(snapshot));
await writeFile(resolve(out, "tables.enc"), encrypt(tableBytes, encryptionKey), { mode: 0o600 });
if (hash(decrypt(await readFile(resolve(out, "tables.enc")), encryptionKey)) !== hash(tableBytes))
  throw new Error("Table backup readback verification failed.");
console.log(JSON.stringify({ tableExportVerified: true, tables: tables.length }));
const manifest = {
  format: 1,
  startedAt,
  finishedAt: null,
  tables: snapshot,
  buckets: [],
  objects: [],
  scope: "Application row export and Storage bytes only; not a SQL/schema/Auth credential backup.",
};
const buckets = await readWithRetry(() => db.storage.listBuckets(), "bucket-list");
if (buckets.error) throw new Error("Cannot list Storage buckets.");
const objects = [];
for (const bucket of buckets.data) {
  manifest.buckets.push(bucket);
  const queue = [""];
  while (queue.length) {
    const prefix = queue.shift();
    for (let offset = 0; ; offset += 100) {
      const result = await readWithRetry(
        () => listObjects(bucket.id, prefix, offset),
        "object-list",
      );
      if (result.error) throw new Error("Storage listing failed; backup is incomplete.");
      for (const file of result.data) {
        const path = prefix ? `${prefix}/${file.name}` : file.name;
        if (!file.id && !file.metadata) queue.push(path);
        else
          objects.push({ bucket: bucket.id, public: bucket.public, path, metadata: file.metadata });
      }
      if (result.data.length < 100) break;
    }
  }
}
let next = 0;
let completed = 0;
const saved = new Map();
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < objects.length) {
      const object = objects[next++];
      const result = await readWithRetry(() => downloadObject(object), "object-download");
      if (result.error) throw new Error("Storage object download failed; backup is incomplete.");
      const bytes = Buffer.from(await result.data.arrayBuffer());
      const digest = hash(bytes);
      let saving = saved.get(digest);
      if (!saving) {
        saving = (async () => {
          const path = resolve(out, "objects", `${digest}.enc`);
          await writeFile(path, encrypt(bytes, encryptionKey), { mode: 0o600 });
          if (hash(decrypt(await readFile(path), encryptionKey)) !== digest)
            throw new Error("Backup byte verification failed.");
        })();
        saved.set(digest, saving);
      }
      await saving;
      manifest.objects.push({ ...object, bytes: bytes.length, sha256: digest });
      completed++;
      if (completed % 200 === 0)
        console.log(JSON.stringify({ downloadedAndVerified: completed, total: objects.length }));
    }
  }),
);
const endingSnapshot = await readTables();
const dataStableDuringExport =
  hash(Buffer.from(JSON.stringify(snapshot))) === hash(Buffer.from(JSON.stringify(endingSnapshot)));
manifest.finishedAt = new Date().toISOString();
manifest.dataStableDuringExport = dataStableDuringExport;
const manifestBytes = Buffer.from(JSON.stringify(manifest));
await writeFile(resolve(out, "manifest.enc"), encrypt(manifestBytes, encryptionKey), {
  mode: 0o600,
});
const restoredKey = protect(await readFile(resolve(out, "key.dpapi")), true);
if (
  hash(decrypt(await readFile(resolve(out, "manifest.enc")), restoredKey)) !== hash(manifestBytes)
)
  throw new Error("Manifest readback verification failed.");
const summary = {
  folder: out,
  startedAt,
  finishedAt: manifest.finishedAt,
  tableCount: tables.length,
  rowCounts: Object.fromEntries(
    Object.entries(snapshot).map(([table, rows]) => [table, rows.length]),
  ),
  objectCount: objects.length,
  uniqueObjectContents: saved.size,
  objectBytes: manifest.objects.reduce((sum, object) => sum + object.bytes, 0),
  encryption: "AES-256-GCM; key protected with Windows CurrentUser DPAPI",
  dataStableDuringExport,
  verifiedReadable: true,
  fullDatabaseRestoreVerified: false,
};
await writeFile(resolve(out, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary));
encryptionKey.fill(0);
restoredKey.fill(0);
