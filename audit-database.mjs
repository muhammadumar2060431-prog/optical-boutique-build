import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// This audit performs reads only. Reports contain counts and asset paths, not customer records.
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey)
  throw new Error("Required local Supabase configuration is missing.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(url, serviceKey, options);
const anon = createClient(url, anonKey, options);
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
const privateTables = new Set([
  "orders",
  "queries",
  "subscribers",
  "admin_users",
  "admin_security_profiles",
  "admin_login_attempts",
  "checkout_idempotency",
  "checkout_idempotency_orders",
  "api_rate_limits",
]);
const rows = {};
const references = new Map();
const report = {
  at: new Date().toISOString(),
  mode: "read-only",
  tables: [],
  integrity: [],
  storage: [],
  inlineImages: 0,
  limitations: [
    "Service-role reads bypass RLS; successful anonymous reads are checked separately.",
    "No writes, destructive probes, user creation, or unknown RPC calls are performed.",
    "Live policy definitions, grants, indexes, backups and query plans require SQL or management access.",
    "Unreferenced assets are candidates only; external use and backups must be checked before deletion.",
  ],
};

function inspect(value, table, path) {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) report.inlineImages++;
    if (value.startsWith(url)) {
      try {
        const parts = new URL(value).pathname.split("/storage/v1/object/public/");
        if (parts.length === 2) {
          const asset = decodeURIComponent(parts[1]);
          const locations = references.get(asset) ?? [];
          locations.push({ table, path });
          references.set(asset, locations);
        }
      } catch {
        /* Non-URL strings are not storage references. */
      }
    }
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) inspect(child, table, `${path}.${key}`);
  }
}

for (const table of tables) {
  const start = performance.now();
  const all = [];
  let error;
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from(table)
      .select("*")
      .range(offset, offset + 499);
    if (result.error) {
      error = result.error;
      break;
    }
    all.push(...result.data);
    if (result.data.length < 500) break;
  }
  const entry = {
    table,
    private: privateTables.has(table),
    serviceReadMs: Math.round(performance.now() - start),
    rows: error ? null : all.length,
    serviceError: error?.code,
  };
  if (!error) {
    rows[table] = all;
    entry.payloadBytes = Buffer.byteLength(JSON.stringify(all));
    for (const row of all) inspect(row, table, "row");
    entry.softDeletedRows = all.filter((row) => row.deleted_at).length;
  }
  const publicResult = await anon.from(table).select("*", { count: "exact" }).limit(1);
  entry.anonError = publicResult.error?.code;
  entry.anonVisibleRows = publicResult.error ? null : publicResult.count;
  if (!publicResult.error && publicResult.data.length) {
    entry.publicSensitiveColumns = Object.keys(publicResult.data[0]).filter(
      (key) =>
        /email|phone|address|password|hash|secret|token|customer|contact/i.test(key) &&
        publicResult.data[0][key],
    );
  }
  report.tables.push(entry);
  console.log(JSON.stringify(entry));
}

function duplicates(table, field) {
  const counts = new Map();
  for (const row of rows[table] ?? []) {
    if (!row[field]) continue;
    const normalized = String(row[field]).trim().toLowerCase();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}
for (const table of ["products", "categories", "collections"])
  report.integrity.push({
    check: `${table}.duplicate_slug_groups`,
    count: duplicates(table, "slug"),
  });
report.integrity.push({
  check: "products.duplicate_sku_groups",
  count: duplicates("products", "sku"),
});
report.integrity.push({
  check: "subscribers.duplicate_email_groups",
  count: duplicates("subscribers", "email"),
});
for (const [table, field, parent] of [
  ["products", "category_id", "categories"],
  ["collections", "category_id", "categories"],
  ["testimonials", "product_id", "products"],
  ["social_reels", "product_id", "products"],
  ["queries", "product_id", "products"],
  ["orders", "product_id", "products"],
]) {
  if (!rows[table] || !rows[parent]) continue;
  const ids = new Set(rows[parent].map((row) => row.id));
  report.integrity.push({
    check: `${table}.${field}.missing_parent`,
    count: rows[table].filter((row) => row[field] && !ids.has(row[field])).length,
  });
}
const collectionIds = new Set((rows.collections ?? []).map((row) => row.id));
report.integrity.push({
  check: "products.collection_ids.missing_parent",
  count: (rows.products ?? []).filter(
    (row) =>
      Array.isArray(row.collection_ids) && row.collection_ids.some((id) => !collectionIds.has(id)),
  ).length,
});
report.integrity.push({
  check: "products.negative_price_or_stock",
  count: (rows.products ?? []).filter((row) => Number(row.price) < 0 || Number(row.stock) < 0)
    .length,
});
report.integrity.push({
  check: "testimonials.invalid_rating",
  count: (rows.testimonials ?? []).filter(
    (row) => !(Number(row.rating) >= 1 && Number(row.rating) <= 5),
  ).length,
});

const buckets = await db.storage.listBuckets();
if (buckets.error) report.storageError = buckets.error.statusCode;
const assets = new Set();
for (const bucket of buckets.data ?? []) {
  const files = [];
  const queue = [""];
  let listingComplete = true;
  while (queue.length) {
    const prefix = queue.shift();
    for (let offset = 0; ; offset += 100) {
      const result = await db.storage
        .from(bucket.id)
        .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (result.error) {
        listingComplete = false;
        break;
      }
      for (const item of result.data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (!item.id && !item.metadata) queue.push(path);
        else {
          const asset = `${bucket.id}/${path}`;
          assets.add(asset);
          files.push({
            path,
            bytes: Number(item.metadata?.size ?? 0),
            mime: item.metadata?.mimetype,
            referenced: references.has(asset),
            createdAt: item.created_at,
          });
        }
      }
      if (result.data.length < 100) break;
    }
  }
  const entry = {
    bucket: bucket.id,
    public: bucket.public,
    fileSizeLimit: bucket.file_size_limit,
    allowedMimeTypes: bucket.allowed_mime_types,
    listingComplete,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    unreferencedCandidates: files.filter((file) => !file.referenced),
    over1MB: files.filter((file) => file.bytes > 1024 * 1024),
    nonImageFiles: files.filter((file) => file.mime && !file.mime.startsWith("image/")),
  };
  report.storage.push(entry);
  console.log(
    JSON.stringify({
      bucket: entry.bucket,
      fileCount: entry.fileCount,
      public: entry.public,
      unreferencedCandidates: entry.unreferencedCandidates.length,
      over1MB: entry.over1MB.length,
      listingComplete,
    }),
  );
}
report.missingStorageObjects = [...references]
  .filter(([asset]) => !assets.has(asset))
  .map(([asset, locations]) => ({ asset, locations }));
report.assetHttpChecks = [];
for (const [asset] of references) {
  const target = new URL(
    `storage/v1/object/public/${asset.split("/").map(encodeURIComponent).join("/")}`,
    `${url}/`,
  );
  try {
    const response = await fetch(target, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    if (!response.ok) report.assetHttpChecks.push({ asset, status: response.status });
  } catch {
    report.assetHttpChecks.push({ asset, error: "network_or_timeout" });
  }
}
report.referencedAssetCount = references.size;
const out = resolve(".tmp", "database-audit", "audit.json");
await mkdir(resolve(".tmp", "database-audit"), { recursive: true });
await writeFile(out, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    report: ".tmp/database-audit/audit.json",
    integrity: report.integrity,
    inlineImages: report.inlineImages,
    missingStorageObjects: report.missingStorageObjects.length,
    failedPublicAssetRequests: report.assetHttpChecks.length,
  }),
);
