import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { healthHandler } from "../src/lib/api/health-handler.ts";
import { resetRateLimitsForTests, withApi } from "../src/lib/api/http.server.ts";
import { createOrderHandlers, type OrdersRepository } from "../src/lib/api/order-handlers.ts";
import { applySecurityHeaders } from "../src/lib/security-headers.ts";

const validOrder = {
  id: "ord-test-1",
  reference: "OPT-TEST12345",
  customerName: "Ayesha Khan",
  contact: "+92 300 1234567 · ayesha@example.com",
  productId: "product-1",
  productName: "Classic Frame",
  variantId: null,
  variantLabel: null,
  message: "Delivery address: Lahore",
  source: "cart",
};

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://www.nigah.store${path}`, {
    ...init,
    headers: { origin: "https://www.nigah.store", ...init.headers },
  });
}

function createRepository() {
  const rows = new Map<string, Record<string, unknown>>();
  const idempotency = new Map<string, unknown>();
  const repository: OrdersRepository = {
    async create(input, key) {
      const existing = idempotency.get(key);
      if (existing) return { ...(existing as object), replayed: true };
      const order = (input as { orders: Array<Record<string, unknown>> }).orders[0]!;
      rows.set(String(order["id"]), order);
      const result = { reference: order["reference"], orders: [order], replayed: false };
      idempotency.set(key, result);
      return result;
    },
    async list() {
      return [...rows.values()];
    },
    async read(_request, id) {
      return rows.get(id) ?? null;
    },
    async update(_request, id, input) {
      const current = rows.get(id);
      if (!current) return null;
      const updated = { ...current, ...(input as object) };
      rows.set(id, updated);
      return updated;
    },
    async remove(_request, id) {
      return rows.delete(id);
    },
    async track(reference) {
      return [...rows.values()].filter((row) => row["reference"] === reference);
    },
  };
  return repository;
}

function protectedHandler(handler: (request: Request) => Promise<Response>, name: string) {
  return withApi(({ request: apiRequest }) => handler(apiRequest), {
    name,
    rateLimit: { max: 100, windowMs: 60_000 },
  });
}

describe("API v1 order handlers", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("creates once and replays the same idempotent request", async () => {
    const handlers = createOrderHandlers(createRepository());
    const create = protectedHandler(handlers.create, "test.orders.create");
    const init = {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "checkout:test-key-12345" },
      body: JSON.stringify({ orders: [validOrder] }),
    };
    const first = await create({ request: request("/api/v1/orders", init) });
    const replay = await create({ request: request("/api/v1/orders", init) });
    assert.equal(first.status, 201);
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).replayed, true);
  });

  it("covers list, read, update, and delete", async () => {
    const handlers = createOrderHandlers(createRepository());
    await handlers.create(
      request("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "checkout:crud-key-12345",
        },
        body: JSON.stringify({ orders: [validOrder] }),
      }),
    );
    const listed = (await (await handlers.list(request("/api/v1/orders"))).json()) as {
      data: unknown[];
    };
    assert.equal(listed.data.length, 1);
    assert.equal(
      (await handlers.read(request("/api/v1/orders/ord-test-1"), "ord-test-1")).status,
      200,
    );
    const tracked = (await (await handlers.track("OPT-TEST12345")).json()) as {
      data: unknown[];
    };
    assert.equal(tracked.data.length, 1);
    const updated = await handlers.update(
      request("/api/v1/orders/ord-test-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      }),
      "ord-test-1",
    );
    const updatedBody = (await updated.json()) as { data: { status: string } };
    assert.equal(updatedBody.data.status, "Completed");
    assert.equal(
      (await handlers.remove(request("/api/v1/orders/ord-test-1"), "ord-test-1")).status,
      204,
    );
  });

  it("rejects invalid input without exposing details", async () => {
    const handlers = createOrderHandlers(createRepository());
    const create = protectedHandler(handlers.create, "test.orders.validation");
    const response = await create({
      request: request("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "checkout:test-key-12345",
        },
        body: JSON.stringify({ orders: [] }),
      }),
    });
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "VALIDATION_ERROR");
  });
});

describe("API transport controls", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("rejects unapproved browser origins", async () => {
    const handler = withApi(() => Response.json({ ok: true }), { name: "test.cors" });
    const response = await handler({
      request: new Request("https://www.nigah.store/api/v1/test", {
        headers: { origin: "https://attacker.example" },
      }),
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  });

  it("returns 429 after the configured request limit", async () => {
    const handler = withApi(() => Response.json({ ok: true }), {
      name: "test.rate-limit",
      rateLimit: { max: 1, windowMs: 60_000 },
    });
    assert.equal((await handler({ request: request("/api/v1/test") })).status, 200);
    assert.equal((await handler({ request: request("/api/v1/test") })).status, 429);
  });

  it("provides a healthy monitoring response", async () => {
    const response = await healthHandler({ request: request("/health") });
    const body = (await response.json()) as { status: string; apiVersion: string };
    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.apiVersion, "v1");
  });
  it("never exposes unexpected exception details", async () => {
    const handler = withApi(
      () => {
        throw new Error("database-password-should-stay-private");
      },
      { name: "test.error-sanitization" },
    );
    const response = await handler({ request: request("/api/v1/test") });
    const body = JSON.stringify(await response.json());
    assert.equal(response.status, 500);
    assert.equal(body.includes("database-password"), false);
  });
});
describe("Browser security headers", () => {
  it("sets CSP, anti-framing, MIME and HSTS headers on HTTPS responses", () => {
    const response = applySecurityHeaders(
      new Response("ok"),
      new Request("https://www.nigah.store/admin"),
    );
    assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=63072000/);
  });
});
