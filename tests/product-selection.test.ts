import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchInitialProducts,
  fetchProductSelection,
  isProductDataQuery,
  normalizeProductSelection,
} from "../src/lib/product-selection-query.ts";

type Row = Record<string, string | boolean>;

function database(rows: Row[]) {
  let matched = rows;
  let countRequested = false;
  const ordering: Array<{ key: string; ascending: boolean }> = [];
  const query = {
    select(_columns: string, options?: { count: string }) {
      countRequested = Boolean(options?.count);
      return query;
    },
    eq(key: string, value: string | boolean) {
      matched = matched.filter((row) => row[key] === value);
      return query;
    },
    neq(key: string, value: string) {
      matched = matched.filter((row) => row[key] !== value);
      return query;
    },
    in(key: string, values: string[]) {
      matched = matched.filter((row) => values.includes(String(row[key])));
      return query;
    },
    or(expression: string) {
      assert.equal(expression, "featured.eq.true,is_bestseller.eq.true");
      matched = matched.filter((row) => row.featured || row.is_bestseller);
      return query;
    },
    order(key: string, options: { ascending: boolean }) {
      ordering.push({ key, ascending: options.ascending });
      return query;
    },
    async range(from: number, to: number) {
      const result = await query.limit(to + 1);
      return { ...result, data: result.data.slice(from) };
    },
    async limit(limit: number) {
      const sorted = [...matched].sort((a, b) => {
        for (const { key, ascending } of ordering) {
          if (a[key] === b[key]) continue;
          const comparison = a[key]! < b[key]! ? -1 : 1;
          return ascending ? comparison : -comparison;
        }
        return 0;
      });
      return {
        data: sorted.slice(0, limit),
        count: countRequested ? matched.length : null,
        error: null,
      };
    },
  };
  return {
    from: (table: string) => {
      assert.equal(table, "products");
      return query;
    },
  } as unknown as SupabaseClient;
}

const rows: Row[] = Array.from({ length: 1250 }, (_, index) => ({
  id: `product-${String(index).padStart(4, "0")}`,
  enabled: index % 5 !== 0,
  is_new_arrival: index % 2 === 0,
  category_id: index % 3 === 0 ? "lenses" : "frames",
  featured: index % 4 === 0,
  is_bestseller: index % 7 === 0,
  created_at: "2026-10-06T00:00:00Z",
}));

describe("bounded product loading", () => {
  it("refreshes product-dependent caches without refreshing unrelated customer records", () => {
    for (const key of [
      "catalog-page",
      "product-selection",
      "product-selection-infinite",
      "featured-product-counts",
      "admin-product-counts",
      "admin-product-picker",
      "admin-product-lookup",
    ]) {
      assert.equal(isProductDataQuery([key]), true);
    }
    assert.equal(isProductDataQuery(["admin-records", "inventory"]), true);
    assert.equal(isProductDataQuery(["admin-records", "products"]), true);
    assert.equal(isProductDataQuery(["admin-records", "orders"]), false);
    assert.equal(isProductDataQuery(["admin-records", "subscribers"]), false);
  });
  it("initial loading returns only 12 published new arrivals with stable ordering", async () => {
    const result = await fetchInitialProducts(database(rows));
    assert.equal(result.data?.length, 12);
    assert.ok(result.data?.every((row) => row.enabled && row.is_new_arrival));
    assert.deepEqual(result.data, (await fetchInitialProducts(database([...rows].reverse()))).data);
  });

  it("featured category selection has a bounded page and a global filtered count", async () => {
    const expected = rows.filter(
      (row) => row.enabled && row.category_id === "frames" && (row.featured || row.is_bestseller),
    );
    const result = await fetchProductSelection(database(rows), {
      categoryId: "frames",
      featured: true,
      limit: 8,
    });
    assert.equal(result.data?.length, 8);
    assert.equal(result.count, expected.length);
    assert.ok(result.data?.every((row) => expected.some((item) => item.id === row.id)));
  });

  it("scroll pagination can load every featured product without repeating or skipping rows", async () => {
    const expected = rows.filter(
      (row) => row.enabled && row.category_id === "frames" && (row.featured || row.is_bestseller),
    );
    const loaded: string[] = [];
    let offset = 0;
    while (offset < expected.length) {
      const result = await fetchProductSelection(database(rows), {
        categoryId: "frames",
        featured: true,
        limit: 12,
        offset,
      });
      assert.ok(result.data && result.data.length > 0 && result.data.length <= 12);
      assert.equal(result.count, expected.length);
      loaded.push(...result.data.map((row) => String(row.id)));
      offset += result.data.length;
    }
    assert.ok(loaded.length > 8);
    assert.equal(new Set(loaded).size, expected.length);
    assert.deepEqual([...loaded].sort(), expected.map((row) => String(row.id)).sort());
    const end = await fetchProductSelection(database(rows), {
      categoryId: "frames",
      featured: true,
      limit: 12,
      offset,
    });
    assert.equal(end.data?.length, 0);
  });

  it("switching categories starts a separate filtered product list", async () => {
    const frames = await fetchProductSelection(database(rows), {
      categoryId: "frames",
      featured: true,
      limit: 12,
      offset: 0,
    });
    const lenses = await fetchProductSelection(database(rows), {
      categoryId: "lenses",
      featured: true,
      limit: 12,
      offset: 0,
    });
    assert.ok(frames.data?.every((row) => row.category_id === "frames"));
    assert.ok(lenses.data?.every((row) => row.category_id === "lenses"));
    assert.ok(lenses.data?.every((row) => !frames.data?.some((item) => item.id === row.id)));
  });

  it("related products exclude the current product and drafts", async () => {
    const result = await fetchProductSelection(database(rows), {
      categoryId: "frames",
      excludeId: "product-1249",
      limit: 4,
    });
    assert.equal(result.data?.length, 4);
    assert.ok(
      result.data?.every(
        (row) => row.enabled && row.category_id === "frames" && row.id !== "product-1249",
      ),
    );
  });

  it("tagged product selection cannot fetch products outside the requested IDs", async () => {
    const result = await fetchProductSelection(database(rows), {
      ids: ["product-0001", "product-0002", "product-0005"],
      limit: 24,
    });
    assert.deepEqual(
      result.data?.map((row) => row.id),
      ["product-0002", "product-0001"],
    );
    assert.equal(
      (await fetchProductSelection(database(rows), { ids: [], limit: 24 })).data?.length,
      0,
    );
  });

  it("caps oversized requests and normalizes invalid limits", () => {
    assert.equal(normalizeProductSelection({ limit: 10000 }).limit, 24);
    assert.equal(normalizeProductSelection({ limit: NaN }).limit, 8);
    assert.equal(normalizeProductSelection({ limit: -5 }).limit, 1);
    const selection = normalizeProductSelection({
      ids: [...rows.map((row) => String(row.id)), "product-0001"],
      limit: 24,
    });
    assert.equal(selection.ids?.length, 24);
  });
});
