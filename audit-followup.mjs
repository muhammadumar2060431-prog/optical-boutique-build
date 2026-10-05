import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { getOptimizedSupabaseImageSrc } from "./src/lib/product-images.ts";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !key || !token) throw new Error("Missing local audit configuration");
const ref = new URL(url).hostname.split(".")[0];
const report = { checkedAt: new Date().toISOString(), readOnly: true, checks: {}, images: [] };
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
});
await mkdir(".tmp/database-audit", { recursive: true });
async function save() {
  await writeFile(".tmp/database-audit/followup.json", JSON.stringify(report, null, 2));
}
async function sql(name, query) {
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, read_only: true }),
      signal: AbortSignal.timeout(20000),
    });
    report.checks[name] = {
      status: response.status,
      ...(response.ok ? { data: await response.json() } : {}),
    };
  } catch (error) {
    report.checks[name] = { error: error.name, cause: error.cause?.code };
  }
  console.log(
    JSON.stringify({
      check: name,
      status: report.checks[name].status,
      error: report.checks[name].error,
    }),
  );
  await save();
}
await sql(
  "integrity",
  `SELECT
 (SELECT count(*) FROM public.products p WHERE p.category_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.categories c WHERE c.id=p.category_id)) AS missing_product_categories,
 (SELECT count(*) FROM public.collections c WHERE c.category_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.categories t WHERE t.id=c.category_id)) AS missing_collection_categories,
 (SELECT count(*) FROM public.products p CROSS JOIN LATERAL unnest(p.collection_ids) AS linked(id) WHERE NOT EXISTS(SELECT 1 FROM public.collections c WHERE c.id=linked.id)) AS missing_product_collections,
 (SELECT count(*) FROM public.testimonials t WHERE t.product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id=t.product_id)) AS missing_review_products,
 (SELECT count(*) FROM public.products WHERE price<0 OR stock<0) AS invalid_product_values,
 (SELECT count(*) FROM (SELECT slug FROM public.products GROUP BY slug HAVING count(*)>1) d) AS duplicate_product_slugs,
 (SELECT count(*) FROM public.products) AS products,
 (SELECT count(*) FROM storage.objects) AS storage_objects`,
);
await sql(
  "permissions",
  `SELECT n.nspname AS schema_name,c.relname AS table_name,
 CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,x.privilege_type
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) x
 WHERE n.nspname IN ('public','storage') AND (x.grantee=0 OR pg_get_userbyid(x.grantee) IN ('anon','authenticated')) ORDER BY 1,2,3,4`,
);
await sql(
  "privacy",
  "SELECT has_column_privilege('anon','public.testimonials','email','SELECT') AS review_email_public,has_column_privilege('anon','public.store_settings','admin_email','SELECT') AS admin_email_public",
);
await sql(
  "adminGuard",
  `SELECT p.prosecdef,p.proconfig,
 pg_get_functiondef(p.oid) LIKE '%auth.uid()%' AS checks_user_id,
 pg_get_functiondef(p.oid) LIKE '%admin_users%' AS checks_admin_allowlist,
 pg_get_functiondef(p.oid) LIKE '%admin_security_profiles%' AS checks_security_profile,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_admin'`,
);
await sql(
  "catalogGuards",
  `SELECT c.relname AS table_name,t.tgname,p.proname,t.tgenabled
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_proc p ON p.oid=t.tgfoid
 WHERE NOT t.tgisinternal AND p.proname IN ('prevent_linked_catalog_delete','validate_product_collection_links') ORDER BY 1,2`,
);
await sql(
  "catalogReadPolicies",
  `SELECT tablename,policyname,qual FROM pg_policies WHERE schemaname='public' AND cmd='SELECT'
 AND tablename IN ('products','brands','hero_slides','social_reels','faqs','testimonials','blog_posts') ORDER BY 1,2`,
);
await sql(
  "slowQueries",
  `SELECT queryid::text,calls,round(mean_exec_time::numeric,2) AS mean_ms,
 CASE WHEN query ILIKE '%storage.%' THEN 'storage' WHEN query ILIKE '%products%' THEN 'products'
 WHEN query ILIKE '%pg_%' OR query ILIKE '%information_schema%' THEN 'metadata' ELSE 'other' END AS scope
 FROM extensions.pg_stat_statements WHERE userid=(SELECT oid FROM pg_roles WHERE rolname='authenticator') ORDER BY total_exec_time DESC LIMIT 15`,
);
await sql(
  "productPlan",
  "EXPLAIN (FORMAT JSON) SELECT id FROM public.products WHERE enabled=true AND category_id=(SELECT id FROM public.categories LIMIT 1)",
);

const slides = await db.from("hero_slides").select("id,image").eq("enabled", true);
const products = await db.from("products").select("id,images").eq("enabled", true);
report.checks.publicImages = { heroError: slides.error?.code, productError: products.error?.code };
const productImages = (products.data || [])
  .map((product) => ({ id: product.id, image: product.images?.[0] }))
  .sort(
    (a, b) =>
      Number(/\.avif(?:\?|$)/i.test(b.image || "")) - Number(/\.avif(?:\?|$)/i.test(a.image || "")),
  )
  .slice(0, 4);
for (const item of [...(slides.data || []), ...productImages]) {
  if (!item.image) continue;
  const original = new URL(item.image, url);
  if (
    original.origin !== new URL(url).origin ||
    !original.pathname.startsWith("/storage/v1/object/public/")
  )
    continue;
  const probes = [original.toString()];
  const optimized = getOptimizedSupabaseImageSrc(original.toString(), 640);
  if (optimized !== probes[0]) probes.push(optimized);
  for (const source of probes) {
    const start = performance.now();
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(12000) });
      const bytes = response.ok ? (await response.arrayBuffer()).byteLength : 0;
      const result = {
        id: item.id,
        path: new URL(source).pathname,
        status: response.status,
        bytes,
        elapsedMs: Math.round(performance.now() - start),
        mime: response.headers.get("content-type"),
        cacheControl: response.headers.get("cache-control"),
        cacheStatus: response.headers.get("cf-cache-status"),
      };
      report.images.push(result);
      console.log(JSON.stringify({ image: item.id, ...result }));
    } catch (error) {
      report.images.push({ id: item.id, path: new URL(source).pathname, error: error.name });
    }
    await save();
  }
}
console.log(JSON.stringify({ saved: ".tmp/database-audit/followup.json" }));
