import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

it("hides unpublished content from signed-in non-admins while preserving admin drafts", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(
      "CREATE ROLE anon; CREATE ROLE authenticated; GRANT USAGE ON SCHEMA public TO anon,authenticated; CREATE FUNCTION public.is_admin() RETURNS BOOLEAN LANGUAGE SQL AS $$ SELECT COALESCE(current_setting('test.admin',true),'false')::BOOLEAN $$;",
    );
    for (const table of [
      "products",
      "brands",
      "hero_slides",
      "social_reels",
      "faqs",
      "testimonials",
      "blog_posts",
    ]) {
      const blog = table === "blog_posts";
      await db.exec(`CREATE TABLE public.${table} (id TEXT PRIMARY KEY,${blog ? "status TEXT" : "enabled BOOLEAN"}); ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY; GRANT SELECT ON public.${table} TO anon,authenticated;
        CREATE POLICY "Administrators manage ${table.replaceAll("_", " ")}" ON public.${table} FOR ALL TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
        CREATE POLICY "Public reads ${blog ? "published blog posts" : "enabled " + table.replaceAll("_", " ")}" ON public.${table} FOR SELECT USING(true);
        INSERT INTO public.${table} VALUES ('published',${blog ? "'published'" : "true"}),('draft',${blog ? "'draft'" : "false"});`);
    }
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261003010000_limit_public_catalog_reads.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`RESET ROLE; SELECT set_config('test.admin','false',false); SET ROLE ${role};`);
      assert.deepEqual((await db.query("SELECT id FROM products")).rows, [{ id: "published" }]);
      assert.deepEqual((await db.query("SELECT id FROM blog_posts")).rows, [{ id: "published" }]);
    }
    await db.exec(
      "RESET ROLE; SELECT set_config('test.admin','true',false); SET ROLE authenticated;",
    );
    assert.equal((await db.query("SELECT id FROM products")).rows.length, 2);
    assert.equal((await db.query("SELECT id FROM blog_posts")).rows.length, 2);
  } finally {
    await db.close();
  }
});
