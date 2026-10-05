import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configure the Supabase URL and service-role key locally.");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = "optique-images";
const fields = {
  products: ["images", "image", "hover_image", "new_arrival_image", "details", "variants"],
  categories: ["image", "banner.image"],
  collections: ["banner.image"],
  testimonials: ["avatar", "photo", "review_image", "reviewImage"],
};
const extensions = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/avif": "avif",
};

function readField(row, field) {
  return field.split(".").reduce((value, part) => value?.[part], row);
}

function inlineFields(value, path) {
  if (typeof value === "string") return value.startsWith("data:image/") ? [path] : [];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([part, child]) => inlineFields(child, `${path}.${part}`));
}

function decodeImage(value) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(value);
  if (!match || !extensions[match[1].toLowerCase()]) throw new Error("Unsupported inline image.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("Invalid image size.");
  return { bytes, mime: match[1].toLowerCase() };
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const entries = [];
  for (const [table, paths] of Object.entries(fields)) {
    const { data, error } = await db.from(table).select("*");
    if (error) throw new Error(`Cannot read ${table}: ${error.code}`);
    for (const row of data ?? []) {
      const images = paths.flatMap((field) => inlineFields(readField(row, field), field));
      if (images.length) entries.push({ table, row, images });
    }
  }

  const imageCount = entries.reduce((count, entry) => count + entry.images.length, 0);
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      imageCount,
      images: entries.flatMap(({ table, row, images }) =>
        images.map((field) => ({
          table,
          id: row.id,
          name: row.name,
          field,
          bytes: decodeImage(readField(row, field)).bytes.length,
        })),
      ),
    }),
  );
  if (!apply || imageCount === 0) return;

  const { data: bucketInfo, error: bucketError } = await db.storage.getBucket(bucket);
  if (bucketError || !bucketInfo?.public)
    throw new Error("The existing image bucket must be public.");

  const backupDir = resolve(".tmp", "image-migration", randomUUID());
  await mkdir(backupDir, { recursive: true });
  const backupPath = resolve(backupDir, "backup.json");
  await writeFile(
    backupPath,
    JSON.stringify(
      entries.map(({ table, row, images }) => ({
        table,
        id: row.id,
        original: Object.fromEntries(
          [...new Set(images.map((field) => field.split(".")[0]))].map((column) => [
            column,
            row[column],
          ]),
        ),
      })),
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ backupPath }));

  const results = [];
  for (const { table, row, images } of entries) {
    const replacements = {};
    for (const field of images) {
      const { bytes, mime } = decodeImage(readField(row, field));
      const path = `${table}/migration-${randomUUID()}.${extensions[mime]}`;
      const { error } = await db.storage
        .from(bucket)
        .upload(path, bytes, { upsert: false, contentType: mime, cacheControl: "31536000" });
      if (error)
        throw new Error(
          `Upload failed for ${table}/${row.id}/${field}: ${error.statusCode ?? "unknown"}`,
        );
      const publicUrl = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      const response = await fetch(publicUrl, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== hash(bytes)) {
        throw new Error(`Public image verification failed for ${table}/${row.id}/${field}`);
      }
      replacements[field] = publicUrl;
    }

    const { data: current, error: readError } = await db
      .from(table)
      .select("*")
      .eq("id", row.id)
      .single();
    if (readError) throw new Error(`Cannot re-read ${table}/${row.id}`);
    if (images.some((field) => readField(current, field) !== readField(row, field))) {
      throw new Error(`Image changed during migration: ${table}/${row.id}; original left intact.`);
    }
    const patch = {};
    for (const [field, publicUrl] of Object.entries(replacements)) {
      const [column, ...nested] = field.split(".");
      if (!nested.length) {
        patch[column] = publicUrl;
        continue;
      }
      patch[column] ??= structuredClone(current[column]);
      const target = nested.slice(0, -1).reduce((value, part) => value[part], patch[column]);
      target[nested.at(-1)] = publicUrl;
    }
    let update = db.from(table).update(patch).eq("id", row.id);
    if (current.updated_at) update = update.eq("updated_at", current.updated_at);
    const { data: saved, error: saveError } = await update.select("id");
    if (saveError || saved?.length !== 1)
      throw new Error(`Image update failed or conflicted: ${table}/${row.id}`);
    const { data: verified, error: verifyError } = await db
      .from(table)
      .select("*")
      .eq("id", row.id)
      .single();
    if (
      verifyError ||
      Object.entries(replacements).some(
        ([field, publicUrl]) => readField(verified, field) !== publicUrl,
      )
    )
      throw new Error(`Database verification failed: ${table}/${row.id}`);
    results.push({ table, id: row.id, images: images.length });
    console.log(JSON.stringify({ migrated: results.at(-1) }));
  }

  await writeFile(resolve(backupDir, "result.json"), JSON.stringify(results, null, 2));
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: { retries: 0 },
      signal: () => AbortSignal.timeout(15_000),
    });
    await redis.del("optique:storefront:v1");
    console.log("Storefront Redis cache invalidated.");
  }
  console.log(JSON.stringify({ migratedImages: imageCount, migratedRows: results.length }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
