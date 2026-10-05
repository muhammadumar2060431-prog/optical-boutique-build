import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { createOrdersSchema, updateOrderSchema } from "../src/lib/api/contracts.ts";

describe("atomic order quantity and inventory in PostgreSQL", () => {
  let db: PGlite;
  const line = {
    id: "new-order",
    reference: "OPT-TEST12345",
    customerName: "Test Customer",
    contact: "test@example.test",
    productId: "base",
    productName: "Untrusted label",
    variantId: null,
    variantLabel: null,
    quantity: 3,
    unitPrice: 1,
    total: 1,
    source: "cart",
    message: "Delivery address: test fixture",
  };
  async function checkout(order = line, key = `checkout:${order.id}`) {
    return (
      await db.query<{ result: { orders: Array<Record<string, unknown>>; replayed: boolean } }>(
        "SELECT create_checkout_order_v2($1,$2,$3::jsonb,$4) AS result",
        [key, "a".repeat(64), JSON.stringify([order]), `rate:${order.id}`],
      )
    ).rows[0]!.result;
  }
  async function status(id: string, value: string) {
    return db.query<{ result: { order: { stock_deducted: boolean } } }>(
      "SELECT update_order_inventory_v1($1,$2::jsonb) AS result",
      [id, JSON.stringify({ status: value })],
    );
  }
  before(async () => {
    db = await PGlite.create();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql AS $$
        SELECT COALESCE(current_setting('test.admin',true),'false')::boolean $$;
      CREATE TABLE products(id text PRIMARY KEY,name text,price numeric(12,2),stock integer,
        variants jsonb DEFAULT '[]',enabled boolean DEFAULT true);
      CREATE TABLE orders(id text PRIMARY KEY,reference text,customer_name text,phone text,address text,city text,
        product_id text REFERENCES products(id),product_name text,variant_id text,variant_label text,items jsonb,
        total numeric(12,2) NOT NULL DEFAULT 0,status text,source text,stock_deducted boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),deleted_at timestamptz,courier_name text,tracking_number text,dispatched_at timestamptz);
      INSERT INTO products VALUES ('base','Real Frame',12.25,10,'[]',true),
        ('variant','Color Frame',99,0,'[{"id":"red","label":"Red","stock":8,"price":15.50}]',true),
        ('draft','Draft Frame',12,5,'[]',false), ('scarce','Scarce Frame',5,2,'[]',true);
      INSERT INTO orders(id,reference,source,address) VALUES
        ('legacy','OPT-OLD12345','cart','Checkout order OPT-OLD12345 - quantity 2 (Rs. 24.50).'),
        ('unknown','OPT-OLD99999','cart','Unstructured old request');
      INSERT INTO orders(id,reference,source,address,stock_deducted,status,product_id) VALUES
        ('historic-deduction','OPT-OLD88888','cart','Checkout order OPT-OLD88888 - quantity 2 (Rs. 24.50).',true,'Completed','base');
    `);
    for (const filename of [
      "20260925120000_api_v1_orders.sql",
      "20261006010000_atomic_order_inventory.sql",
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${filename}`, import.meta.url), "utf8"),
      );
    }
    await db.exec("SELECT set_config('test.admin','true',false)");
  });
  after(async () => {
    await db?.close();
  });

  it("persists structured quantity and authoritative decimal pricing", async () => {
    const result = await checkout();
    assert.equal(result.orders[0]?.quantity, 3);
    assert.equal(result.orders[0]?.unitPrice, 12.25);
    assert.equal(result.orders[0]?.total, 36.75);
    assert.equal(result.orders[0]?.productName, "Real Frame");
    assert.deepEqual(
      (await db.query("SELECT quantity,unit_price,total FROM orders WHERE id='new-order'")).rows,
      [{ quantity: 3, unit_price: "12.25", total: "36.75" }],
    );
  });
  it("deducts three once, restores three once, and deducts again after cancellation", async () => {
    await Promise.all([status("new-order", "Completed"), status("new-order", "Completed")]);
    assert.equal(
      (await db.query<{ stock: number }>("SELECT stock FROM products WHERE id='base'")).rows[0]
        ?.stock,
      7,
    );
    await status("new-order", "Cancelled");
    await status("new-order", "Cancelled");
    assert.equal(
      (await db.query<{ stock: number }>("SELECT stock FROM products WHERE id='base'")).rows[0]
        ?.stock,
      10,
    );
    await status("new-order", "Completed");
    assert.equal(
      (await db.query<{ stock: number }>("SELECT stock FROM products WHERE id='base'")).rows[0]
        ?.stock,
      7,
    );
  });
  it("handles variant price/quantity without modifying base stock", async () => {
    const result = await checkout({
      ...line,
      id: "variant-order",
      productId: "variant",
      variantId: "red",
    } as typeof line);
    assert.equal(result.orders[0]?.total, 46.5);
    await status("variant-order", "Completed");
    assert.equal(
      (
        await db.query<{ qty: number }>(
          "SELECT (variants->0->>'stock')::integer AS qty FROM products WHERE id='variant'",
        )
      ).rows[0]?.qty,
      5,
    );
    await status("variant-order", "Cancelled");
    assert.equal(
      (
        await db.query<{ qty: number }>(
          "SELECT (variants->0->>'stock')::integer AS qty FROM products WHERE id='variant'",
        )
      ).rows[0]?.qty,
      8,
    );
  });
  it("rolls back both order state and inventory when stock runs out", async () => {
    await checkout({ ...line, id: "scarce-a", productId: "scarce", quantity: 2 });
    await checkout({ ...line, id: "scarce-b", productId: "scarce", quantity: 2 });
    await status("scarce-a", "Completed");
    await assert.rejects(status("scarce-b", "Completed"), /INSUFFICIENT_STOCK/);
    assert.deepEqual(
      (await db.query("SELECT status,stock_deducted FROM orders WHERE id='scarce-b'")).rows,
      [{ status: "New", stock_deducted: false }],
    );
  });
  it("rejects drafts, unknown variants and insufficient checkout stock", async () => {
    await assert.rejects(
      checkout({ ...line, id: "draft-order", productId: "draft" }),
      /PRODUCT_UNAVAILABLE/,
    );
    await assert.rejects(
      checkout({ ...line, id: "bad-variant", variantId: "missing" } as typeof line),
      /VARIANT_UNAVAILABLE/,
    );
    await assert.rejects(
      checkout({ ...line, id: "too-many", quantity: 999 }),
      /INSUFFICIENT_STOCK/,
    );
  });
  it("rejects a cart splitting excessive quantity across duplicate lines", async () => {
    await assert.rejects(
      db.query("SELECT create_checkout_order_v2($1,$2,$3::jsonb,$4)", [
        "checkout:duplicate-lines",
        "a".repeat(64),
        JSON.stringify([
          { ...line, id: "dup-a", quantity: 5 },
          { ...line, id: "dup-b", quantity: 5 },
        ]),
        "rate:duplicate",
      ]),
      /INSUFFICIENT_STOCK/,
    );
    assert.equal(
      (await db.query("SELECT id FROM orders WHERE id IN ('dup-a','dup-b')")).rows.length,
      0,
    );
  });
  it("prevents stale product saves and direct stock overwrites", async () => {
    await assert.rejects(
      db.exec("UPDATE products SET stock=50 WHERE id='base'"),
      /INVENTORY_RPC_REQUIRED/,
    );
    await assert.rejects(
      db.query("SELECT set_inventory_quantity_v1('base',NULL,50,0)"),
      /INVENTORY_CONFLICT/,
    );
    const revision = (
      await db.query<{ inventory_revision: number }>(
        "SELECT inventory_revision FROM products WHERE id='base'",
      )
    ).rows[0]!.inventory_revision;
    await db.query("SELECT save_product_inventory_v1($1::jsonb,$2)", [
      JSON.stringify({ id: "base", name: "Changed Frame", stock: 7 }),
      revision,
    ]);
    await assert.rejects(
      db.query("SELECT save_product_inventory_v1($1::jsonb,$2)", [
        JSON.stringify({ id: "base", stock: 10 }),
        revision,
      ]),
      /INVENTORY_CONFLICT/,
    );
  });
  it("backfills explicit legacy values while leaving unknown amounts alone", async () => {
    assert.deepEqual(
      (await db.query("SELECT quantity,unit_price,total FROM orders WHERE id='legacy'")).rows,
      [{ quantity: 2, unit_price: "12.25", total: "24.50" }],
    );
    assert.deepEqual(
      (await db.query("SELECT quantity,total FROM orders WHERE id='unknown'")).rows,
      [{ quantity: null, total: "0.00" }],
    );
    await assert.rejects(status("unknown", "Completed"), /LEGACY_QUANTITY_REQUIRED/);
  });
  it("denies non-admin RPCs and public checkout function access", async () => {
    await db.exec("SELECT set_config('test.admin','false',false); SET ROLE authenticated");
    await assert.rejects(status("new-order", "Cancelled"), { code: "42501" });
    await assert.rejects(db.query("SELECT set_inventory_quantity_v1('base',NULL,20,0)"), {
      code: "42501",
    });
    await db.exec("RESET ROLE; SET ROLE anon");
    await assert.rejects(db.query("SELECT create_checkout_order_v2('x','x','[]','x')"), {
      code: "42501",
    });
    await db.exec("RESET ROLE; SELECT set_config('test.admin','true',false)");
  });
  it("replays authoritative pricing without inserting another order", async () => {
    const replay = await checkout();
    assert.equal(replay.replayed, true);
    assert.equal(replay.orders[0]?.quantity, 3);
    assert.equal(replay.orders[0]?.total, 36.75);
    assert.equal((await db.query("SELECT id FROM orders WHERE id='new-order'")).rows.length, 1);
  });
  it("does not guess how much stock a historical completion deducted", async () => {
    await assert.rejects(status("historic-deduction", "Cancelled"), /LEGACY_QUANTITY_REQUIRED/);
    assert.deepEqual(
      (
        await db.query(
          "SELECT status,stock_deducted,inventory_quantity FROM orders WHERE id='historic-deduction'",
        )
      ).rows,
      [{ status: "Completed", stock_deducted: true, inventory_quantity: 0 }],
    );
  });
  it("keeps order snapshots immutable and rejects invented stock flags", async () => {
    await assert.rejects(
      db.exec("UPDATE orders SET quantity=1,total=1 WHERE id='new-order'"),
      /ORDER_SNAPSHOT_IMMUTABLE/,
    );
    await assert.rejects(
      db.query("SELECT update_order_inventory_v1('new-order',$1::jsonb)", [
        JSON.stringify({ stockDeducted: false }),
      ]),
      /INVALID_ORDER/,
    );
  });
  it("recovers quantities from old clients without defaulting cart lines to one", async () => {
    const { quantity: _quantity, ...oldLine } = line;
    const parsed = createOrdersSchema.parse({
      orders: [
        {
          ...oldLine,
          id: "old-client",
          message: "Checkout order OPT-TEST12345 - quantity 2 (Rs. 24.50).",
        },
      ],
    });
    assert.equal(parsed.orders[0]?.quantity, undefined);
    const result = (
      await db.query<{ result: { orders: Array<{ quantity: number; total: number }> } }>(
        "SELECT create_checkout_order_v2($1,$2,$3::jsonb,$4) AS result",
        ["checkout:old-client", "b".repeat(64), JSON.stringify(parsed.orders), "rate:old-client"],
      )
    ).rows[0]!.result;
    assert.equal(result.orders[0]?.quantity, 2);
    assert.equal(result.orders[0]?.total, 24.5);
    await assert.rejects(
      db.query("SELECT create_checkout_order_v2($1,$2,$3::jsonb,$4)", [
        "checkout:missing-quantity",
        "b".repeat(64),
        JSON.stringify([{ ...oldLine, id: "missing-quantity" }]),
        "rate:missing-quantity",
      ]),
      /QUANTITY_REQUIRED/,
    );
  });
  it("preserves product-less WhatsApp inquiries without inventing a price", async () => {
    const result = await checkout({
      ...line,
      id: "general-inquiry",
      productId: null,
      source: "whatsapp",
    } as unknown as typeof line);
    assert.equal(result.orders[0]?.unitPrice, null);
    assert.equal(result.orders[0]?.total, 0);
    await assert.rejects(status("general-inquiry", "Completed"), /PRODUCT_UNAVAILABLE/);
  });
  it("rejects fractional, zero and excessive quantities before database access", () => {
    for (const quantity of [0, -1, 1.5, 1000]) {
      assert.equal(
        createOrdersSchema.safeParse({ orders: [{ ...line, quantity }] }).success,
        false,
      );
    }
    assert.equal(updateOrderSchema.safeParse({ stockDeducted: true }).success, false);
  });
});
