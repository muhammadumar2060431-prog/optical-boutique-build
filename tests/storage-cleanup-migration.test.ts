import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const origin = "https://jebzcorqtizjakontrrl.supabase.co";
const image = (path: string) => `${origin}/storage/v1/object/public/optique-images/${path}`;

describe("storage deletion reference protection in PostgreSQL", () => {
  let db: PGlite;
  const candidates = async () =>
    (await db.query<{ path: string }>("SELECT * FROM storage_cleanup_candidates_v1()")).rows
      .map((row) => row.path)
      .sort();
  const claim = async () =>
    (await db.query<{ path: string }>("SELECT * FROM claim_storage_cleanup_v1()")).rows
      .map((row) => row.path)
      .sort();
  before(async () => {
    db = await PGlite.create();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      CREATE TABLE products(id text PRIMARY KEY,enabled boolean,details jsonb);
      CREATE TABLE hero_slides(id text PRIMARY KEY,enabled boolean,image text);
      CREATE TABLE brands(id text PRIMARY KEY,enabled boolean,logo text);
      CREATE TABLE blog_posts(id text PRIMARY KEY,status text,body text);
      CREATE TABLE store_settings(id text PRIMARY KEY,logo text);
      CREATE TABLE categories(id text PRIMARY KEY,banner jsonb);
      CREATE TABLE orders(id text PRIMARY KEY,items jsonb);`);
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/20261011020000_storage_cleanup.sql", import.meta.url),
        "utf8",
      ),
    );
  });
  beforeEach(async () => {
    await db.exec(
      "TRUNCATE products,hero_slides,brands,blog_posts,store_settings,categories,orders,storage_cleanup_queue",
    );
  });
  after(async () => {
    await db?.close();
  });

  it("queues only images removed by deleting or replacing admin content", async () => {
    await db.query("INSERT INTO hero_slides VALUES ('deleted',true,$1),('active',true,$2)", [
      image("hero/deleted.webp"),
      image("hero/active.webp"),
    ]);
    assert.deepEqual(await candidates(), []);
    await db.exec("DELETE FROM hero_slides WHERE id='deleted'");
    assert.deepEqual(await candidates(), ["hero/deleted.webp"]);
    assert.deepEqual(await claim(), ["hero/deleted.webp"]);
    assert.equal((await db.query("SELECT * FROM hero_slides WHERE id='active'")).rows.length, 1);
    await db.query("UPDATE hero_slides SET image=$1 WHERE id='active'", [
      image("hero/replacement.webp"),
    ]);
    assert.deepEqual(await candidates(), ["hero/active.webp"]);
  });
  it("protects shared images, including disabled products and nested variant/gallery data", async () => {
    const url = image("products/shared.webp");
    await db.query("INSERT INTO products VALUES ('draft',false,$1::jsonb)", [
      JSON.stringify({ variants: [{ image: url }], gallery: [url] }),
    ]);
    await db.query("INSERT INTO hero_slides VALUES ('deleted',true,$1)", [url]);
    await db.exec("DELETE FROM hero_slides WHERE id='deleted'");
    assert.deepEqual(await claim(), []);
    assert.equal((await db.query("SELECT * FROM products")).rows.length, 1);
    await db.exec("DELETE FROM products WHERE id='draft'");
    assert.deepEqual(await claim(), ["products/shared.webp"]);
  });
  it("protects current banners, brands, settings, category banners, draft blog HTML and order snapshots", async () => {
    const url = image("hero/shared.webp");
    await db.query("INSERT INTO hero_slides VALUES ('source',true,$1),('kept',false,$1)", [url]);
    await db.query("INSERT INTO brands VALUES ('kept',false,$1)", [url]);
    await db.query("INSERT INTO store_settings VALUES ('default',$1)", [url]);
    await db.query("INSERT INTO categories VALUES ('kept',$1::jsonb)", [
      JSON.stringify({ image: url }),
    ]);
    await db.query("INSERT INTO blog_posts VALUES ('kept','draft',$1)", [`<img src="${url}">`]);
    await db.query("INSERT INTO orders VALUES ('history',$1::jsonb)", [
      JSON.stringify([{ image: url }]),
    ]);
    await db.exec("DELETE FROM hero_slides WHERE id='source'");
    assert.deepEqual(await claim(), []);
  });
  it("does not queue fresh or old unreferenced uploads and ignores foreign storage URLs", async () => {
    await db.query("INSERT INTO hero_slides VALUES ('foreign',true,$1)", [
      "https://other.supabase.co/storage/v1/object/public/optique-images/hero/unrelated.webp",
    ]);
    await db.exec("DELETE FROM hero_slides");
    assert.deepEqual(await claim(), []);
  });
  it("protects images in single-quoted HTML, Markdown and HTML entities", async () => {
    const url = image("hero/blog-shared.webp");
    for (const body of [`<img src='${url}'>`, `![image](${url})`, `<img src=&quot;${url}&quot;>`]) {
      await db.query("INSERT INTO hero_slides VALUES ('source',true,$1)", [url]);
      await db.query("INSERT INTO blog_posts VALUES ('kept','draft',$1)", [body]);
      await db.exec("DELETE FROM hero_slides");
      assert.deepEqual(await claim(), []);
      await db.exec("DELETE FROM blog_posts; DELETE FROM storage_cleanup_queue");
    }
  });
  it("prevents a concurrent/new record from linking an image already claimed for removal", async () => {
    const url = image("hero/removed.webp");
    await db.query("INSERT INTO hero_slides VALUES ('source',true,$1)", [url]);
    await db.exec("DELETE FROM hero_slides");
    assert.deepEqual(await claim(), ["hero/removed.webp"]);
    await assert.rejects(
      db.query("INSERT INTO brands VALUES ('new',true,$1)", [url]),
      /IMAGE_REMOVED_UPLOAD_AGAIN/,
    );
    await db.query("SELECT finish_storage_cleanup_v1($1::text[],NULL)", [["hero/removed.webp"]]);
    await assert.rejects(
      db.query("INSERT INTO hero_slides VALUES ('restored',true,$1)", [url]),
      /IMAGE_REMOVED_UPLOAD_AGAIN/,
    );
  });
  it("allows reusing pending images before cleanup and then protects them", async () => {
    const url = image("hero/reused.webp");
    await db.query("INSERT INTO hero_slides VALUES ('source',true,$1)", [url]);
    await db.exec("DELETE FROM hero_slides");
    await db.query("INSERT INTO brands VALUES ('replacement',true,$1)", [url]);
    assert.deepEqual(await claim(), []);
  });
  it("keeps ambiguous failures protected and supports lease-based retries", async () => {
    await db.query("INSERT INTO hero_slides VALUES ('source',true,$1)", [image("hero/retry.webp")]);
    await db.exec("DELETE FROM hero_slides");
    await claim();
    await db.query("SELECT finish_storage_cleanup_v1($1::text[],$2)", [
      ["hero/retry.webp"],
      "Network error",
    ]);
    assert.deepEqual(await claim(), []);
    await db.exec("UPDATE storage_cleanup_queue SET claimed_at=now()-interval '6 minutes'");
    assert.deepEqual(await claim(), ["hero/retry.webp"]);
  });
  it("decodes encoded filenames and supports signed/transformed image URLs", async () => {
    const base = `${origin}/storage/v1/render/image/public/optique-images/hero/a%20b.webp?width=1440`;
    await db.query("INSERT INTO hero_slides VALUES ('source',true,$1)", [base]);
    await db.exec("DELETE FROM hero_slides");
    assert.deepEqual(await claim(), ["hero/a b.webp"]);
  });
  it("rolls queue changes back when the record deletion is rolled back", async () => {
    await db.query("INSERT INTO hero_slides VALUES ('source',true,$1)", [
      image("hero/rollback.webp"),
    ]);
    await db.exec("BEGIN; DELETE FROM hero_slides; ROLLBACK;");
    assert.deepEqual(await claim(), []);
    assert.equal((await db.query("SELECT * FROM hero_slides")).rows.length, 1);
  });
  it("denies cleanup claims and private reference scans to public/admin browser roles", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(claim(), /permission denied/);
      await assert.rejects(db.query("SELECT * FROM storage_references_v1()"), /permission denied/);
      await db.exec("RESET ROLE");
    }
  });
});
