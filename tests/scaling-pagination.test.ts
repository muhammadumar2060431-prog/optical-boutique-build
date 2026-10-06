import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

describe("bounded database pagination and persistent abuse limits", () => {
  let db: PGlite;
  before(async () => {
    db = await PGlite.create();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'false')::boolean $$;
      CREATE TABLE orders(id text PRIMARY KEY,created_at timestamptz DEFAULT now(),customer_name text,product_name text,reference text,source text,status text,deleted_at timestamptz,phone text,address text);
      CREATE TABLE queries(id text PRIMARY KEY,created_at timestamptz DEFAULT now(),name text,contact text,product_name text,message text,status text,deleted_at timestamptz);
      CREATE TABLE subscribers(id text PRIMARY KEY,created_at timestamptz DEFAULT now(),email text,status text);
      CREATE TABLE products(id text PRIMARY KEY,created_at timestamptz DEFAULT now(),updated_at timestamptz,name text,sku text,price numeric,category_id text,collection_ids text[],enabled boolean,stock integer DEFAULT 0,variants jsonb DEFAULT '[]',images text[]);
      CREATE TABLE categories(id text PRIMARY KEY,name text);
      CREATE TABLE store_settings(id text PRIMARY KEY,low_stock_threshold integer);
      CREATE TABLE testimonials(id text PRIMARY KEY);
      INSERT INTO orders(id,customer_name,product_name,reference,source,status) SELECT 'order-'||lpad(n::text,4,'0'),'Customer '||n,'Frame','OPT-'||n,'cart','New' FROM generate_series(1,1250) n;
      INSERT INTO orders(id,customer_name,source,status) VALUES('legacy-form','Legacy Enquiry','form','New');
      INSERT INTO queries(id,name,contact,message,status) VALUES ('wildcard','100% literal','contact','a_b','New');
      INSERT INTO products(id,name,price,category_id,collection_ids,enabled) SELECT 'product-'||n,'Frame '||n,n,'frames',ARRAY['collection'],true FROM generate_series(1,1250) n;
      INSERT INTO products(id,name,price,enabled) VALUES('draft','Private draft',1,false);
      SELECT set_config('test.admin','true',false);`);
    for (const file of [
      "20261006020000_shared_api_rate_limits.sql",
      "20261006021000_database_pagination.sql",
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    }
  });
  after(async () => {
    await db?.close();
  });
  async function page(kind: string, offset = 0, search = "", status = "all", source = "all") {
    return (
      await db.query<{ result: { rows: Array<{ id: string }>; total: number } }>(
        "SELECT admin_record_page_v1($1,50,$2,$3,$4,$5) AS result",
        [kind, offset, search, status, source],
      )
    ).rows[0]!.result;
  }
  it("returns bounded, deterministic pages beyond PostgREST's default row cap", async () => {
    const first = await page("orders");
    const second = await page("orders", 50);
    assert.equal(first.total, 1250);
    assert.equal(first.rows.length, 50);
    assert.equal(new Set([...first.rows, ...second.rows].map((row) => row.id)).size, 100);
    assert.deepEqual((await page("orders")).rows, first.rows);
    const empty = await page("orders", 1500);
    assert.equal(empty.total, 1250);
    assert.equal(empty.rows.length, 0);
  });
  it("filters on the server and treats search wildcards as literal text", async () => {
    assert.equal((await page("orders", 0, "Customer 1250")).total, 1);
    assert.equal((await page("orders", 0, "", "Completed")).total, 0);
    assert.equal((await page("queries", 0, "%")).total, 1);
    assert.equal((await page("queries", 0, "_")).total, 1);
    assert.equal((await page("queries", 0, "' OR true --")).total, 0);
    assert.equal((await page("queries")).total, 2);
  });
  it("rejects unauthorized access, invalid kinds, and excessive page sizes", async () => {
    await db.exec("SELECT set_config('test.admin','false',false)");
    await assert.rejects(page("orders"), { code: "42501" });
    await db.exec("SELECT set_config('test.admin','true',false)");
    await assert.rejects(page("orders; DROP TABLE orders"), /INVALID_PAGE/);
    await assert.rejects(db.query("SELECT admin_record_page_v1('orders',1001,0)"), /INVALID_PAGE/);
  });
  it("public catalog pages never contain drafts and honor filters/sorting", async () => {
    await db.exec("SET ROLE anon");
    const result = (
      await db.query<{ result: { rows: Array<{ id: string; price: number }>; total: number } }>(
        "SELECT catalog_product_page_v1('frames','collection',10,30,'price-desc',12,0) AS result",
      )
    ).rows[0]!.result;
    assert.equal(result.total, 21);
    assert.equal(result.rows.length, 12);
    assert.equal(result.rows[0]?.price, 30);
    await assert.rejects(page("orders"), { code: "42501" });
    await db.exec("RESET ROLE");
  });
  it("paginates variants and computes dashboard alerts globally", async () => {
    await db.exec(
      `INSERT INTO products(id,name,stock,variants,enabled,category_id) VALUES('variants','Variant frame',100,'[{"id":"a","label":"A","stock":2},{"id":"b","label":"B","stock":10}]',true,'frames');`,
    );
    const inventory = await page("inventory", 0, "Variant frame", "Low stock");
    assert.equal(inventory.total, 1);
    assert.equal((inventory.rows[0] as unknown as { stock: number }).stock, 2);
    const stats = (
      await db.query<{ result: { stockAlerts: number } }>(
        "SELECT admin_dashboard_stats_v1() AS result",
      )
    ).rows[0]!.result;
    assert.equal(stats.stockAlerts, 1252);
    assert.equal((await page("products", 0, "Frame", "all", "frames")).total, 1251);
  });
  it("shared database limits reject requests after the configured maximum", async () => {
    const params = ["api.v1.contact.create", "f".repeat(64), 5, 3600000];
    for (let n = 1; n <= 6; n++) {
      const result = (
        await db.query<{ result: { allowed: boolean; remaining: number } }>(
          "SELECT consume_api_rate_limit_v1($1,$2,$3,$4) AS result",
          params,
        )
      ).rows[0]!.result;
      assert.equal(result.allowed, n <= 5);
      assert.equal(result.remaining, Math.max(0, 5 - n));
    }
    await db.exec("SET ROLE anon");
    await assert.rejects(db.query("SELECT consume_api_rate_limit_v1($1,$2,$3,$4)", params), {
      code: "42501",
    });
    await db.exec("RESET ROLE");
  });
});
