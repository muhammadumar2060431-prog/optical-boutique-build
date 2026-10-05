import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

it("removes public Storage writes without changing images or admin access", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE FUNCTION public.is_admin() RETURNS BOOLEAN LANGUAGE SQL AS $$ SELECT current_setting('test.admin',true)='true' $$;
      CREATE SCHEMA storage; GRANT USAGE ON SCHEMA storage,public TO anon,authenticated;
      CREATE TABLE storage.objects (id TEXT PRIMARY KEY,bucket_id TEXT,name TEXT);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON storage.objects TO anon,authenticated;
      CREATE POLICY "Public reads" ON storage.objects FOR SELECT USING (true);
      CREATE POLICY "Administrators upload optique images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
      CREATE POLICY "Administrators update optique images" ON storage.objects FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
      CREATE POLICY "Administrators delete optique images" ON storage.objects FOR DELETE TO authenticated USING (public.is_admin());
      CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT TO anon,authenticated WITH CHECK (true);
      CREATE POLICY "Allow public updates" ON storage.objects FOR UPDATE TO anon,authenticated USING (true);
      CREATE POLICY "Allow public delete" ON storage.objects FOR DELETE TO anon,authenticated USING (true);
      INSERT INTO storage.objects VALUES ('image','optique-images','original.png');`);
    for (const table of [
      "hero_slides",
      "social_reels",
      "store_settings",
      "video_settings",
      "blog_posts",
    ]) {
      await db.exec(`CREATE TABLE public.${table} (id TEXT PRIMARY KEY);
        CREATE POLICY "Administrators manage ${table.replaceAll("_", " ")}" ON public.${table} FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
        CREATE POLICY "Authenticated users manage ${table}" ON public.${table} FOR ALL TO authenticated USING (true) WITH CHECK (true);`);
    }
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261002030000_remove_legacy_public_storage_writes.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`RESET ROLE; SELECT set_config('test.admin','false',false); SET ROLE ${role};`);
      assert.equal((await db.query("SELECT id FROM storage.objects")).rows.length, 1);
      await assert.rejects(
        db.query("INSERT INTO storage.objects VALUES ('attack','optique-images','bad.png')"),
        { code: "42501" },
      );
      assert.equal(
        (await db.query("UPDATE storage.objects SET name='bad.png' RETURNING id")).rows.length,
        0,
      );
      assert.equal((await db.query("DELETE FROM storage.objects RETURNING id")).rows.length, 0);
    }
    await db.exec(
      "RESET ROLE; SELECT set_config('test.admin','true',false); SET ROLE authenticated;",
    );
    assert.equal(
      (await db.query("UPDATE storage.objects SET name='original.png' RETURNING id")).rows.length,
      1,
    );
    await db.exec("RESET ROLE;");
    assert.equal(
      (
        await db.query(
          "SELECT policyname FROM pg_policies WHERE policyname LIKE 'Authenticated users manage %'",
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
