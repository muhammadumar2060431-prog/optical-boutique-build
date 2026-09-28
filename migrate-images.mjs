/**
 * Migrates legacy base64 product images into Supabase Storage.
 *
 * Run with:
 *   npm run migrate:images
 *
 * Required environment variables:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = "optique-images";
const concurrency = 4;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env before running this migration.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function safePathPart(value) {
  return String(value || "image")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uploadDataUrl(dataUrl, slug, index) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type.includes("webp")
    ? "webp"
    : blob.type.includes("png")
      ? "png"
      : blob.type.includes("gif")
        ? "gif"
        : "jpg";
  const path = `products/${safePathPart(slug)}-${index}.${extension}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
}

async function mapWithConcurrency(items, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

async function migrateImages(images, slug) {
  return mapWithConcurrency(images, async (image, index) => {
    if (typeof image !== "string" || !image.startsWith("data:image/")) return image;
    return uploadDataUrl(image, slug, index);
  });
}

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, images, details");

  if (error) throw error;

  let migrated = 0;
  let skipped = 0;

  for (const product of products ?? []) {
    const images = Array.isArray(product.images) ? product.images : [];
    const details = product.details && typeof product.details === "object" ? product.details : {};
    const subImages = Array.isArray(details.subImages) ? details.subImages : [];
    const hasLegacyImages = [...images, ...subImages].some(
      (image) => typeof image === "string" && image.startsWith("data:image/"),
    );

    if (!hasLegacyImages) {
      skipped++;
      continue;
    }

    const [nextImages, nextSubImages] = await Promise.all([
      migrateImages(images, product.slug),
      migrateImages(subImages, `${product.slug}-sub`),
    ]);

    const { error: updateError } = await supabase
      .from("products")
      .update({
        images: nextImages,
        details: { ...details, subImages: nextSubImages },
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (updateError) throw updateError;
    migrated++;
  }

  console.log(`Image migration complete. Migrated: ${migrated}, skipped: ${skipped}.`);
}

main().catch((error) => {
  console.error("Image migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
