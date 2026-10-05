import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import sharp from "sharp";

const apply = process.argv.includes("--apply");
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Local Supabase access is missing.");
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) },
});
const out = resolve(".tmp", "hero-optimization", randomUUID());
await mkdir(out, { recursive: true });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (apply) {
  let verifiedBackup = false;
  for (const folder of await readdir(resolve(".tmp", "backups"))) {
    try {
      const summary = JSON.parse(
        await readFile(resolve(".tmp", "backups", folder, "summary.json"), "utf8"),
      );
      if (
        summary.verifiedReadable &&
        summary.dataStableDuringExport &&
        summary.objectCount > 0 &&
        Date.now() - Date.parse(summary.finishedAt) < 86400000
      )
        verifiedBackup = true;
    } catch {
      /* Incomplete backup folders cannot authorize an update. */
    }
  }
  if (!verifiedBackup)
    throw new Error(
      "Create a complete, verified application/Storage backup before applying image changes.",
    );
}
const rows = await db.from("hero_slides").select("*");
if (rows.error) throw new Error(`Cannot read hero slides: ${rows.error.code}`);
await writeFile(resolve(out, "original-rows.json"), JSON.stringify(rows.data, null, 2));
const result = [];
for (const row of rows.data) {
  let image;
  try {
    image = new URL(row.image);
  } catch {
    continue;
  }
  if (image.origin !== new URL(url).origin) continue;
  const prefix = "/storage/v1/object/public/optique-images/";
  if (!image.pathname.startsWith(prefix)) continue;
  const path = decodeURIComponent(image.pathname.slice(prefix.length));
  const source = await db.storage.from("optique-images").download(path);
  if (source.error) throw new Error("Cannot download the source banner.");
  const bytes = Buffer.from(await source.data.arrayBuffer());
  if (bytes.length <= 1024 * 1024) continue;
  const metadata = await sharp(bytes).metadata();
  if (metadata.orientation && metadata.orientation !== 1)
    throw new Error("Banner has orientation metadata; review it before converting.");
  const encoded = await sharp(bytes).webp({ lossless: true, effort: 6 }).toBuffer();
  const decodedOriginal = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decodedOptimized = await sharp(encoded)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    JSON.stringify(decodedOriginal.info) !== JSON.stringify(decodedOptimized.info) ||
    digest(decodedOriginal.data) !== digest(decodedOptimized.data)
  )
    throw new Error("Conversion changed banner pixels or dimensions; refusing update.");
  if (encoded.length >= bytes.length)
    throw new Error("Lossless conversion did not reduce the image size.");
  const index = result.length;
  await writeFile(resolve(out, `${index}-original.png`), bytes);
  await writeFile(resolve(out, `${index}-optimized.webp`), encoded);
  const newPath = `hero/optimized-${digest(encoded).slice(0, 32)}.webp`;
  const { data: publicImage } = db.storage.from("optique-images").getPublicUrl(newPath);
  const entry = {
    id: row.id,
    beforeUrl: row.image,
    afterUrl: publicImage.publicUrl,
    beforeBytes: bytes.length,
    afterBytes: encoded.length,
    width: metadata.width,
    height: metadata.height,
    pixelsIdentical: true,
    applied: false,
  };
  if (apply) {
    const upload = await db.storage.from("optique-images").upload(newPath, encoded, {
      upsert: false,
      contentType: "image/webp",
      cacheControl: "31536000",
    });
    if (upload.error && !["409", "400"].includes(String(upload.error.statusCode)))
      throw new Error("Optimized image upload failed.");
    const publicResponse = await fetch(publicImage.publicUrl, {
      signal: AbortSignal.timeout(15000),
    });
    if (
      !publicResponse.ok ||
      digest(Buffer.from(await publicResponse.arrayBuffer())) !== digest(encoded)
    )
      throw new Error("Public optimized image bytes could not be verified.");
    const update = await db
      .from("hero_slides")
      .update({ image: publicImage.publicUrl })
      .eq("id", row.id)
      .eq("image", row.image)
      .select("id");
    if (update.error || update.data?.length !== 1) {
      console.log(
        JSON.stringify({
          updateErrorCode: update.error?.code,
          status: update.status,
          matchedRows: update.data?.length,
          id: row.id,
        }),
      );
      throw new Error(
        "Banner changed concurrently or update failed; source data was not overwritten.",
      );
    }
    entry.applied = true;
    result.push(entry);
    await writeFile(resolve(out, "result.json"), JSON.stringify(result, null, 2));
    const saved = await db.from("hero_slides").select("image").eq("id", row.id).single();
    if (saved.error || saved.data.image !== publicImage.publicUrl)
      throw new Error(
        "Banner URL readback verification failed; inspect result.json for rollback information.",
      );
  } else result.push(entry);
  console.log(JSON.stringify(entry));
}
await writeFile(resolve(out, "result.json"), JSON.stringify(result, null, 2));
if (
  apply &&
  result.length &&
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    retry: { retries: 0 },
    signal: () => AbortSignal.timeout(15000),
  });
  await redis.incr("optique:storefront:revision");
  await redis.del("optique:storefront:v1");
}
console.log(
  JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    changed: result.length,
    folder: out,
    originalsDeleted: false,
  }),
);
