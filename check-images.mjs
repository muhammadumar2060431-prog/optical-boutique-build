// Image diagnostic script — check what images are actually in Supabase
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jebzcorqtizjakontrrl.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplYnpjb3JxdGl6amFrb250cnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTU5OTksImV4cCI6MjEwNDMzMTk5OX0.YzSFgPGdETAAZ1yvbVxuYU3h17Y5f671AQSqFgmtpto";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, images, hover_image")
    .limit(20);

  if (error) {
    console.error("❌ Supabase error:", error.message);
    return;
  }

  console.log(`\n📦 Found ${data.length} products\n`);

  let noImage = 0;
  let hasBase64 = 0;
  let hasUrl = 0;
  let hasPlaceholder = 0;

  for (const p of data) {
    const imgs = Array.isArray(p.images) ? p.images : [];
    const primary = imgs[0] || null;

    let type = "❓ NONE";
    if (!primary || primary === "/placeholder.svg") {
      type = "🔴 PLACEHOLDER/EMPTY";
      noImage++;
      if (primary === "/placeholder.svg") hasPlaceholder++;
    } else if (primary.startsWith("data:")) {
      type = `🟡 BASE64 (${Math.round(primary.length / 1024)}KB)`;
      hasBase64++;
    } else if (primary.startsWith("http")) {
      type = `🟢 URL: ${primary.substring(0, 80)}`;
      hasUrl++;
    }

    console.log(`  ${p.name} (${p.slug})`);
    console.log(`    images count: ${imgs.length}  |  primary: ${type}`);
  }

  console.log("\n── Summary ──────────────────────");
  console.log(`  🟢 Has URL images:     ${hasUrl}`);
  console.log(`  🟡 Has Base64 images:  ${hasBase64}`);
  console.log(`  🔴 Placeholder/Empty:  ${noImage}`);
  console.log(`  📝 Total products:     ${data.length}`);

  if (hasBase64 > 0) {
    console.log("\n⚠️  BASE64 IMAGES FOUND — these are stored as huge strings in DB.");
    console.log("   They should be uploaded to Supabase Storage instead.");
    console.log("   This may also be why images appear broken (CSP/size limits).");
  }
  if (noImage > 0) {
    console.log(`\n⚠️  ${noImage} products have NO valid image — they will show 'No image'.`);
  }
}

main().catch(console.error);
