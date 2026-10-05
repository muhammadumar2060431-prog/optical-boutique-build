import { writeFile } from "node:fs/promises";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !token) throw new Error("Missing local Supabase configuration");
const ref = new URL(url).hostname.split(".")[0];
const query = `BEGIN TRANSACTION READ ONLY;
SELECT
  (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
    AND (roles && ARRAY['anon','public']::name[])) AS anonymous_storage_write_policies,
  (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND policyname IN ('Administrators upload optique images','Administrators update optique images','Administrators delete optique images')
    AND 'authenticated'=ANY(roles) AND COALESCE(qual,with_check) LIKE '%is_admin%') AS admin_storage_policies,
  (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND cmd='SELECT' AND qual LIKE '%optique-images%') AS public_image_read_policies,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('hero_slides','social_reels','store_settings','video_settings','blog_posts')
    AND cmd='ALL' AND ('authenticated'=ANY(roles) OR 'public'=ANY(roles))
    AND COALESCE(qual,'') NOT LIKE '%is_admin%') AS broad_content_write_policies,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('hero_slides','social_reels','store_settings','video_settings','blog_posts')
    AND cmd='ALL' AND qual LIKE '%is_admin%' AND with_check LIKE '%is_admin%') AS admin_content_policies,
  (SELECT bool_and(rowsecurity) FROM pg_tables WHERE schemaname='public'
    OR (schemaname='storage' AND tablename='objects')) AS rls_enabled;
COMMIT;`;
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, read_only: true }),
  signal: AbortSignal.timeout(45000),
});
if (!response.ok) {
  console.log(JSON.stringify({ status: response.status, verified: false }));
  process.exit(1);
}
const result = await response.json();
const row = result[0];
const verified =
  row?.anonymous_storage_write_policies === 0 &&
  row?.broad_content_write_policies === 0 &&
  row?.admin_storage_policies === 3 &&
  row?.admin_content_policies === 5 &&
  row?.public_image_read_policies > 0 &&
  row?.rls_enabled === true;
await writeFile(
  ".tmp/database-audit/permission-fix-verification.json",
  JSON.stringify({ checkedAt: new Date().toISOString(), verified, result }, null, 2),
);
console.log(JSON.stringify({ verified, result }));
if (!verified) process.exitCode = 1;
