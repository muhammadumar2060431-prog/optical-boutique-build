/**
 * migrate-images.mjs - Uploads base64 images to Supabase Storage
 * Run: node migrate-images.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jebzcorqtizjakontrrl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplYnpjb3JxdGl6amFrb250cnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTU5OTksImV4cCI6MjEwNDMzMTk5OX0.YzSFgPGdETAAZ1yvbVxuYU3h17Y5f671AQSqFgmtpto";
const BUCKET = "optique-images";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadBase64(dataUrl, slug, index) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes("webp") ? "webp" : blob.type.includes("png") ? "png" : blob.type.includes("gif") ? "gif" : "jpg";
    const path = products/--.;
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: blob.type });
    if (error) { console.warn(    ERR []:, error.message); return null; }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData?.publicUrl ?? null;
  } catch (e) { console.warn(    EXC [/]:, e.message); return null; }
}

async function main() {
  console.log("Checking bucket...");
  const { data: buckets, error: buckErr } = await supabase.storage.listBuckets();
  if (buckErr) { console.error("Cannot list buckets:", buckErr.message); return; }
  const bucketExists = buckets?.some(b => b.name === BUCKET);
  if (!bucketExists) {
    console.error("BUCKET NOT FOUND: optique-images");
    console.log("Please create it in Supabase Dashboard: Storage > New Bucket > Name: optique-images > Public: ON");
    return;
  }
  console.log("Bucket OK. Fetching products...");
  const { data: products, error } = await supabase.from("products").select("id, name, slug, images, details");
  if (error) { console.error("Fetch failed:", error.message); return; }
  console.log(Found  products);
  let migrated = 0, skipped = 0, failed = 0;
  for (const prod of products) {
    const imgs = Array.isArray(prod.images) ? prod.images : [];
    if (!imgs.some(img => typeof img === "string" && img.startsWith("data:"))) { skipped++; continue; }
    console.log(  Uploading:  ( images));
    const newImages = [];
    for (let i = 0; i < imgs.length; i++) {
      if (typeof imgs[i] === "string" && imgs[i].startsWith("data:")) {
        const url = await uploadBase64(imgs[i], prod.slug, i);
        newImages.push(url || imgs[i]);
        if (url) console.log(    OK []: ...);
        else { failed++; console.log(    FAILED []); }
      } else { newImages.push(imgs[i]); }
    }
    let details = prod.details || {};
    if (typeof details === "string") { try { details = JSON.parse(details); } catch {} }
    const subs = Array.isArray(details?.subImages) ? details.subImages : [];
    const newSubs = [];
    for (let i = 0; i < subs.length; i++) {
      if (typeof subs[i] === "string" && subs[i].startsWith("data:")) {
        const url = await uploadBase64(subs[i], prod.slug + "-sub", i);
        newSubs.push(url || subs[i]);
      } else newSubs.push(subs[i]);
    }
    const { error: upErr } = await supabase.from("products").update({
      images: newImages,
      details: { ...details, subImages: newSubs.length > 0 ? newSubs : newImages.slice(1) },
      updated_at: new Date().toISOString()
    }).eq("id", prod.id);
    if (upErr) { console.log(    DB update failed: ); failed++; } else { migrated++; console.log(    DB updated); }
  }
  console.log(\nDone! Migrated: , Skipped: , Failed: );
}
main().catch(console.error);
