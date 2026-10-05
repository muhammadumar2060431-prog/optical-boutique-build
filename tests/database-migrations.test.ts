import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

// Disposable PostgreSQL fixtures only: no environment credentials or live connections.
describe("database security migrations in isolated PostgreSQL", () => {
  let db: PGlite;
  const tables = [
    "products",
    "categories",
    "collections",
    "hero_slides",
    "brands",
    "social_reels",
    "testimonials",
    "faqs",
    "orders",
    "queries",
    "subscribers",
    "store_settings",
    "announcements",
    "video_settings",
    "blog_posts",
  ];
  async function role(name: "anon" | "authenticated", admin = false) {
    await db.exec(
      `RESET ROLE; SELECT set_config('test.admin', '${admin}', false); SET ROLE ${name};`,
    );
  }
  before(async () => {
    db = await PGlite.create();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      CREATE FUNCTION public.is_admin() RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER
      SET search_path = '' AS $$ SELECT COALESCE(current_setting('test.admin', true), 'false')::BOOLEAN $$;
      CREATE TABLE public.categories (id TEXT PRIMARY KEY);
      CREATE TABLE public.collections (id TEXT PRIMARY KEY, category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL);
      CREATE TABLE public.products (id TEXT PRIMARY KEY, category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL, collection_ids TEXT[] DEFAULT '{}');
      CREATE TABLE public.testimonials (id TEXT PRIMARY KEY, source TEXT, name TEXT, product_id TEXT, product_name TEXT, title TEXT,
        review TEXT, rating INTEGER, avatar TEXT, verified BOOLEAN, enabled BOOLEAN, sort_order INTEGER, created_at TIMESTAMPTZ, email TEXT);
      CREATE TABLE public.store_settings (id TEXT PRIMARY KEY, store_name TEXT, whatsapp TEXT, phone TEXT, email TEXT, address TEXT,
        hours TEXT, logo TEXT, low_stock_threshold INTEGER, about_headline TEXT, about_body TEXT, updated_at TIMESTAMPTZ, admin_email TEXT);
    `);
    for (const table of tables) {
      if (
        !["categories", "collections", "products", "testimonials", "store_settings"].includes(table)
      ) {
        await db.exec(`CREATE TABLE public.${table} (id TEXT PRIMARY KEY);`);
      }
      await db.exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON public.${table} TO authenticated;
        CREATE POLICY "Administrators manage ${table.replaceAll("_", " ")}" ON public.${table}
          FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
        CREATE POLICY "Authenticated users manage ${table}" ON public.${table}
          FOR ALL TO authenticated USING (true) WITH CHECK (true);`);
    }
    await db.exec(`
      CREATE POLICY "Public reads enabled testimonials" ON public.testimonials FOR SELECT USING (enabled = true);
      CREATE POLICY "Public reads store settings" ON public.store_settings FOR SELECT USING (true);
      GRANT SELECT ON public.testimonials, public.store_settings TO anon;
      INSERT INTO public.categories VALUES ('category');
      INSERT INTO public.collections VALUES ('collection', 'category');
      INSERT INTO public.products VALUES ('product', 'category', ARRAY['collection']);
      INSERT INTO public.testimonials (id,name,email,enabled,verified,sort_order) VALUES ('review','Customer','customer@example.test',true,true,0);
      INSERT INTO public.store_settings (id,store_name,admin_email) VALUES ('default','Shop','owner@example.test');
    `);
    for (const file of [
      "20261002010000_preserve_catalog_and_fix_policy_names.sql",
      "20261002020000_private_contact_columns.sql",
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    }
  });
  afterEach(async () => {
    await db.exec("RESET ROLE;");
  });
  after(async () => {
    await db?.close();
  });

  it("preserves existing products, reviews and private email values", async () => {
    assert.deepEqual((await db.query("SELECT id FROM products")).rows, [{ id: "product" }]);
    assert.deepEqual((await db.query("SELECT email,verified FROM testimonials")).rows, [
      { email: "customer@example.test", verified: true },
    ]);
    assert.deepEqual((await db.query("SELECT admin_email FROM store_settings")).rows, [
      { admin_email: "owner@example.test" },
    ]);
  });
  it("removes the underscore-named legacy permissive policies", async () => {
    const result = await db.query(
      "SELECT policyname FROM pg_policies WHERE policyname LIKE 'Authenticated users manage %'",
    );
    assert.equal(result.rows.length, 0);
  });
  it("allows public review fields but denies customer email and select star", async () => {
    await role("anon");
    assert.deepEqual((await db.query("SELECT id,name FROM testimonials")).rows, [
      { id: "review", name: "Customer" },
    ]);
    await assert.rejects(db.query("SELECT email FROM testimonials"), { code: "42501" });
    await assert.rejects(db.query("SELECT * FROM testimonials"), { code: "42501" });
    await assert.rejects(db.query("SELECT admin_email FROM store_settings"), { code: "42501" });
  });
  it("denies private row reads and RPCs to signed-in non-admin users", async () => {
    await role("authenticated");
    assert.equal((await db.query("SELECT email FROM testimonials")).rows.length, 0);
    assert.equal((await db.query("SELECT admin_email FROM store_settings")).rows.length, 0);
    await assert.rejects(db.query("SELECT * FROM admin_testimonials_v1()"), { code: "42501" });
    await assert.rejects(db.query("SELECT * FROM admin_store_settings_v1()"), { code: "42501" });
  });
  it("retains admin private reads and upsert permissions", async () => {
    await role("authenticated", true);
    assert.equal((await db.query("SELECT * FROM admin_testimonials_v1()")).rows.length, 1);
    assert.equal((await db.query("SELECT * FROM admin_store_settings_v1()")).rows.length, 1);
    await db.query(
      "INSERT INTO store_settings (id,admin_email) VALUES ('default','owner@example.test') ON CONFLICT(id) DO UPDATE SET admin_email=EXCLUDED.admin_email",
    );
    await db.query(
      "INSERT INTO testimonials (id,email) VALUES ('review','customer@example.test') ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email",
    );
  });
  it("blocks a linked category delete without deleting products", async () => {
    await role("authenticated", true);
    await assert.rejects(db.query("DELETE FROM categories WHERE id='category'"), { code: "23503" });
    assert.equal((await db.query("SELECT id FROM products")).rows.length, 1);
  });
  it("blocks a linked collection delete and rejects broken new array links", async () => {
    await role("authenticated", true);
    await assert.rejects(db.query("DELETE FROM collections WHERE id='collection'"), {
      code: "23503",
    });
    await assert.rejects(
      db.query("UPDATE products SET collection_ids=ARRAY['missing'] WHERE id='product'"),
      { code: "23503" },
    );
    assert.deepEqual((await db.query("SELECT collection_ids FROM products")).rows, [
      { collection_ids: ["collection"] },
    ]);
  });
});
