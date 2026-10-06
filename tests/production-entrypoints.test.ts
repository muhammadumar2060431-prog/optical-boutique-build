import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

it("keeps admin/service access while denying submission and tracking API bypasses", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE SQL STABLE AS
        $$ SELECT COALESCE(current_setting('test.admin', true), 'false')::boolean $$;
      CREATE TABLE orders (id text PRIMARY KEY);
      CREATE TABLE queries (id text PRIMARY KEY);
      CREATE TABLE subscribers (id text PRIMARY KEY);
      CREATE TABLE video_settings (id text PRIMARY KEY, enabled boolean);
      INSERT INTO video_settings VALUES ('public', true), ('draft', false);
      CREATE FUNCTION subscribe_email(text, text) RETURNS text LANGUAGE SQL AS $$ SELECT $2 $$;
      CREATE FUNCTION lookup_order_by_reference(text) RETURNS text LANGUAGE SQL AS $$ SELECT $1 $$;
      GRANT ALL ON orders, queries, subscribers, video_settings TO anon, authenticated;
      CREATE POLICY "Public creates valid orders" ON orders FOR INSERT TO anon WITH CHECK (true);
      CREATE POLICY "Public creates valid queries" ON queries FOR INSERT TO anon WITH CHECK (true);
      CREATE POLICY "Public reads enabled video" ON video_settings FOR SELECT
        USING (enabled = true OR current_user = 'authenticated');
    `);
    for (const table of ["orders", "queries", "subscribers", "video_settings"]) {
      await db.exec(`
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Administrators manage ${table}" ON ${table} FOR ALL TO authenticated
          USING (public.is_admin()) WITH CHECK (public.is_admin());
      `);
    }
    for (const filename of [
      "20261005140000_video_read_policy.sql",
      "20261005150000_server_only_public_submissions.sql",
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${filename}`, import.meta.url), "utf8"),
      );
    }
    await db.exec("SET ROLE anon");
    await assert.rejects(db.exec("INSERT INTO orders VALUES ('bypass')"), { code: "42501" });
    await assert.rejects(db.exec("INSERT INTO queries VALUES ('bypass')"), { code: "42501" });
    await assert.rejects(db.query("SELECT subscribe_email('id','test@example.test')"), {
      code: "42501",
    });
    await assert.rejects(db.query("SELECT lookup_order_by_reference('reference')"), {
      code: "42501",
    });
    await db.exec("RESET ROLE; SET ROLE authenticated");
    assert.deepEqual((await db.query("SELECT id FROM video_settings ORDER BY id")).rows, [
      { id: "public" },
    ]);
    await db.exec("SELECT set_config('test.admin', 'true', false)");
    assert.equal((await db.query("SELECT id FROM video_settings")).rows.length, 2);
    await db.exec("INSERT INTO orders VALUES ('admin')");
    await db.exec("RESET ROLE; SET ROLE service_role");
    assert.equal(
      (await db.query("SELECT subscribe_email('id','test@example.test') AS email")).rows[0]?.email,
      "test@example.test",
    );
    assert.equal(
      (await db.query("SELECT lookup_order_by_reference('reference') AS reference")).rows[0]
        ?.reference,
      "reference",
    );
    await db.exec("RESET ROLE");
    assert.equal((await db.query("SELECT id FROM video_settings")).rows.length, 2);
    assert.deepEqual((await db.query("SELECT id FROM orders")).rows, [{ id: "admin" }]);
  } finally {
    await db.close();
  }
});
