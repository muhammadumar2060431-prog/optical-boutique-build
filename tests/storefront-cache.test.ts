import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createStorefrontCacheHandler } from "../src/lib/api/storefront-cache.server.ts";
import type { InitialSupabaseData } from "../src/lib/supabaseSync.ts";

const data: InitialSupabaseData = {
  products: [],
  categories: [],
  collections: [],
  orders: null,
  queries: null,
  heroSlides: [],
  brands: [],
  socialReels: [],
  testimonials: [],
  faqs: [],
  subscribers: null,
  settings: null,
  announcement: null,
  video: null,
};

describe("storefront cache", () => {
  it("uses a fresh generation after invalidation even while an older fill is pending", async () => {
    let revision = 0;
    const keys: string[] = [];
    let releaseOld!: (value: InitialSupabaseData) => void;
    let started!: () => void;
    const oldStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const oldData = new Promise<InitialSupabaseData>((resolve) => {
      releaseOld = resolve;
    });
    let loads = 0;
    const handler = createStorefrontCacheHandler({
      getRevision: async () => revision,
      getCache: async (key) => {
        keys.push(key);
        return null;
      },
      loadData: async () => {
        if (++loads === 1) {
          started();
          return oldData;
        }
        return data;
      },
      setCache: async (key) => {
        keys.push(key);
        return true;
      },
    });
    const oldRequest = handler();
    await oldStarted;
    revision = 1;
    const newRequest = await handler();
    assert.equal(newRequest.headers.get("X-Redis-Cache"), "MISS");
    assert.equal(loads, 2);
    releaseOld(data);
    await oldRequest;
    assert.ok(keys.includes("optique:storefront:v1:0"));
    assert.ok(keys.includes("optique:storefront:v1:1"));
  });
  it("serves a Redis hit without querying the database", async () => {
    const handler = createStorefrontCacheHandler({
      getCache: async () => data,
      setCache: async () => {
        assert.fail("A hit must not write");
      },
      loadData: async () => {
        assert.fail("A hit must not query the database");
      },
    });
    const response = await handler();
    assert.equal(response.headers.get("X-Redis-Cache"), "HIT");
    assert.match(response.headers.get("Server-Timing")!, /redis_read;dur=/);
    assert.deepEqual((await response.json()).data, data);
  });

  it("shares concurrent cold fills and returns independently readable responses", async () => {
    let loads = 0,
      writes = 0;
    let release!: (value: InitialSupabaseData) => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const loaded = new Promise<InitialSupabaseData>((resolve) => {
      release = resolve;
    });
    const handler = createStorefrontCacheHandler({
      getCache: async () => null,
      loadData: async () => {
        loads++;
        markStarted();
        return loaded;
      },
      setCache: async (_key, value, ttl) => {
        writes++;
        assert.deepEqual(value, data);
        assert.equal(ttl, 120);
        return true;
      },
    });
    const first = handler(),
      second = handler();
    await started;
    assert.equal(loads, 1);
    release(data);
    const responses = await Promise.all([first, second]);
    for (const response of responses) {
      assert.equal(response.headers.get("X-Redis-Cache"), "MISS");
      assert.deepEqual((await response.json()).data, data);
    }
    assert.equal(writes, 1);
  });

  it("reports bypass when Redis cannot store the data", async () => {
    const handler = createStorefrontCacheHandler({
      getCache: async () => null,
      loadData: async () => data,
      setCache: async () => false,
    });
    const response = await handler();
    assert.equal(response.headers.get("X-Redis-Cache"), "BYPASS");
    assert.equal(response.headers.get("X-Redis-Cache-TTL"), null);
    assert.deepEqual((await response.json()).data, data);
  });

  it("clears failed fills so subsequent requests can retry", async () => {
    let attempts = 0;
    const handler = createStorefrontCacheHandler({
      getCache: async () => null,
      loadData: async () => {
        if (++attempts === 1) throw new Error("Database temporarily unavailable");
        return data;
      },
      setCache: async () => true,
    });
    await assert.rejects(handler());
    assert.equal((await handler()).headers.get("X-Redis-Cache"), "MISS");
    assert.equal(attempts, 2);
  });
});
