import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase configuration is required.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const selections = {
  products: "id,images,hover_image,new_arrival_image,variants,details",
  categories: "id,image,banner",
  collections: "id,banner",
  hero_slides: "id,image",
  brands: "id,logo",
  social_reels: "id,thumbnail",
  store_settings: "id,logo",
  testimonials: "id,avatar",
  blog_posts: "id,cover_image,blocks",
};
const references = new Map();
function visit(value, location) {
  if (
    typeof value === "string" &&
    /^https?:\/\//.test(value) &&
    /\.(avif|webp|png|jpe?g)(?:[?#]|$)/i.test(value)
  ) {
    references.set(value, [...(references.get(value) || []), location]);
  } else if (Array.isArray(value))
    value.forEach((item, index) => visit(item, `${location}[${index}]`));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([name, item]) => visit(item, `${location}.${name}`));
}
const tables = [];
for (const [table, columns] of Object.entries(selections)) {
  const { data, error } = await client.from(table).select(columns);
  if (error) {
    tables.push({ table, error: error.message });
    continue;
  }
  tables.push({ table, rows: data.length });
  data.forEach((row) => visit(row, `${table}:${row.id}`));
}
const assets = [];
const queue = [...references];
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (queue.length) {
      const [source, locations] = queue.shift();
      try {
        const response = await fetch(source, { signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        const metadata = await sharp(bytes).metadata();
        assets.push({
          source,
          locations,
          status: response.status,
          bytes: bytes.length,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          cors: response.headers.get("access-control-allow-origin"),
        });
      } catch (error) {
        assets.push({ source, locations, error: error.message });
      }
    }
  }),
);
await mkdir(".tmp/admin-image-audit", { recursive: true });
await writeFile(
  ".tmp/admin-image-audit/remote-assets.json",
  JSON.stringify({ tables, assets }, null, 2),
);
console.log(
  JSON.stringify(
    {
      tables,
      uniqueImages: assets.length,
      failedImages: assets.filter((asset) => asset.error).length,
      over5MB: assets.filter((asset) => asset.bytes > 5 * 1024 * 1024).length,
      largestBytes: Math.max(0, ...assets.map((asset) => asset.bytes || 0)),
    },
    null,
    2,
  ),
);
