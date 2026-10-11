import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { discountedPrice } from "../src/lib/discounts.ts";

describe("bulk discounts in PostgreSQL", () => {
  let db: PGlite;
  const save = (
    enabled: boolean,
    percentage = 20,
    rates: Record<string, number> = {},
    mode = "flat",
  ) =>
    db.query("SELECT save_discount_campaign_v1($1,$2,$3,$4::jsonb)", [
      enabled,
      mode,
      percentage,
      JSON.stringify(rates),
    ]);
  const price = async (id = "frame") =>
    (
      await db.query<{
        price: string;
        compare_at: string | null;
        effective_price: string;
        bulk_discount_percent: string | null;
      }>(
        "SELECT price,compare_at,effective_price,bulk_discount_percent FROM products WHERE id=$1",
        [id],
      )
    ).rows[0]!;
  before(async () => {
    db = await PGlite.create();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT COALESCE(current_setting('test.admin',true),'false')::boolean $$;
      CREATE TABLE categories(id text PRIMARY KEY);
      INSERT INTO categories VALUES ('glasses'),('lenses');
      CREATE TABLE products(id text PRIMARY KEY,name text,price numeric(12,2),compare_at numeric(12,2),
        category_id text REFERENCES categories(id),collection_ids text[] DEFAULT '{}',created_at timestamptz DEFAULT now(),
        stock integer,variants jsonb DEFAULT '[]',enabled boolean DEFAULT true);
      CREATE TABLE orders(id text PRIMARY KEY,reference text,customer_name text,phone text,address text,city text,
        product_id text REFERENCES products(id),product_name text,variant_id text,variant_label text,items jsonb,
        total numeric(12,2) NOT NULL DEFAULT 0,status text,source text,stock_deducted boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),deleted_at timestamptz,courier_name text,tracking_number text,dispatched_at timestamptz);
      INSERT INTO products(id,name,price,compare_at,category_id,stock,variants) VALUES
        ('frame','Frame',1000,900,'glasses',10,'[]'),
        ('lens','Lens',500,450,'lenses',10,'[]'),
        ('variant','Variant Frame',1000,900,'glasses',0,'[{"id":"red","label":"Red","stock":5,"price":1250},{"id":"blue","label":"Blue","stock":5}]');
    `);
    for (const filename of [
      "20260925120000_api_v1_orders.sql",
      "20261006010000_atomic_order_inventory.sql",
      "20261011010000_bulk_discount_campaign.sql",
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${filename}`, import.meta.url), "utf8"),
      );
    }
  });
  beforeEach(async () => {
    await db.exec("SELECT set_config('test.admin','true',false)");
    await save(false);
  });
  after(async () => {
    await db?.close();
  });

  it("applies from original prices and restores manual sale prices without mutating them", async () => {
    await save(true);
    assert.deepEqual(await price(), {
      price: "1000.00",
      compare_at: "900.00",
      effective_price: "800.00",
      bulk_discount_percent: "20.00",
    });
    await save(true, 10);
    assert.equal((await price()).effective_price, "900.00");
    await save(true, 30);
    assert.equal((await price()).effective_price, "700.00");
    await save(false);
    assert.equal((await price()).effective_price, "900.00");
    assert.equal((await price()).bulk_discount_percent, null);
  });
  it("supports independent category overrides and a zero-rate exclusion", async () => {
    await save(true, 20, { glasses: 20, lenses: 10 }, "upto");
    assert.equal((await price()).effective_price, "800.00");
    assert.equal((await price("lens")).effective_price, "450.00");
    await save(true, 20, { lenses: 0 });
    assert.equal((await price("lens")).bulk_discount_percent, null);
    assert.equal((await price("lens")).compare_at, "450.00");
  });
  it("applies to future products and category or original-price edits", async () => {
    await save(true, 20, { lenses: 10 });
    await db.exec(
      "INSERT INTO products(id,name,price,category_id,stock) VALUES ('future','Future',999.99,'glasses',5)",
    );
    assert.equal((await price("future")).effective_price, "799.99");
    await db.exec("UPDATE products SET category_id='lenses',price=800 WHERE id='future'");
    assert.equal((await price("future")).effective_price, "720.00");
    await db.exec("UPDATE products SET compare_at=600 WHERE id='future'");
    assert.equal((await price("future")).effective_price, "720.00");
    await save(false);
    assert.equal((await price("future")).effective_price, "600.00");
  });
  it("uses authoritative discounted prices for checkout and variants, preserving historical orders", async () => {
    await save(true, 20);
    const order = async (id: string, productId: string, variantId: string | null) => {
      await db.query(
        `INSERT INTO orders(id,source,product_id,variant_id,quantity,unit_price,total,items)
        VALUES ($1,'cart',$2,$3,2,1,1,'[{}]')`,
        [id, productId, variantId],
      );
      return (
        await db.query<{ unit_price: string; total: string }>(
          "SELECT unit_price,total FROM orders WHERE id=$1",
          [id],
        )
      ).rows[0];
    };
    assert.deepEqual(await order("base-order", "frame", null), {
      unit_price: "800.00",
      total: "1600.00",
    });
    assert.deepEqual(await order("variant-order", "variant", "red"), {
      unit_price: "1000.00",
      total: "2000.00",
    });
    assert.deepEqual(await order("fallback-order", "variant", "blue"), {
      unit_price: "800.00",
      total: "1600.00",
    });
    await save(false);
    assert.deepEqual(await order("manual-order", "frame", null), {
      unit_price: "900.00",
      total: "1800.00",
    });
    assert.equal(
      (
        await db.query<{ unit_price: string }>(
          "SELECT unit_price FROM orders WHERE id='base-order'",
        )
      ).rows[0]?.unit_price,
      "800.00",
    );
    assert.equal(
      (
        await db.query<{ variants: Array<{ price?: number }> }>(
          "SELECT variants FROM products WHERE id='variant'",
        )
      ).rows[0]?.variants[0]?.price,
      1250,
    );
  });
  it("sorts and filters by the price the shopper pays", async () => {
    await save(true, 20);
    const page = (
      await db.query<{ result: { rows: Array<{ id: string }>; total: number } }>(
        "SELECT catalog_product_page_v1(NULL,NULL,350,450,'price-asc',12,0) AS result",
      )
    ).rows[0]!.result;
    assert.equal(page.total, 1);
    assert.equal(page.rows[0]?.id, "lens");
  });
  it("rejects non-admin, invalid, and cap-exceeding updates atomically", async () => {
    await db.exec("SELECT set_config('test.admin','false',false)");
    await assert.rejects(save(true), /Administrator permission/);
    await db.exec("SELECT set_config('test.admin','true',false)");
    for (const percentage of [-1, 101, 12.345])
      await assert.rejects(save(true, percentage), /INVALID_DISCOUNT/);
    await assert.rejects(save(true, 20, { glasses: 30 }, "upto"), /INVALID_CATEGORY/);
    await assert.rejects(save(true, 20, { unknown: 10 }), /INVALID_CATEGORY/);
    assert.equal((await price()).bulk_discount_percent, null);
  });
  it("supports 100% and matches frontend rounding for decimal prices", async () => {
    await save(true, 100);
    assert.equal((await price()).effective_price, "0.00");
    for (const original of [0, 0.01, 0.05, 12.25, 199.99, 999.99, 9999999999.99]) {
      for (const percentage of [0, 10, 12.5, 33.33, 99.99, 100]) {
        const result = (
          await db.query<{ price: string }>("SELECT discounted_price_v1($1,$2) AS price", [
            original,
            percentage,
          ])
        ).rows[0]!;
        assert.equal(Number(result.price), discountedPrice(original, percentage));
      }
    }
  });
});
