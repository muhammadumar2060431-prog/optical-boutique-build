import assert from "node:assert/strict";
import { it } from "node:test";

import { AdminAuthError, postAdminAuth } from "../src/lib/admin-auth.ts";

it("sends the exact password and returns login tokens", async (context) => {
  context.mock.method(globalThis, "fetch", async (_path: string, options: RequestInit) => {
    assert.deepEqual(JSON.parse(String(options.body)), {
      email: "admin@example.com",
      password: " password with spaces ",
    });
    return Response.json({ accessToken: "access", refreshToken: "refresh" });
  });
  const result = await postAdminAuth("/api/v1/admin/login", {
    email: "admin@example.com",
    password: " password with spaces ",
  });
  assert.deepEqual(result, { accessToken: "access", refreshToken: "refresh" });
});

it("retains server lockout details and gives a retry time", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { error: { code: "LOGIN_LOCKED", message: "Too many failed attempts.", retryAfter: 90 } },
      { status: 429 },
    ),
  );
  await assert.rejects(postAdminAuth("/api/v1/admin/login", {}), (error: unknown) => {
    assert.ok(error instanceof AdminAuthError);
    assert.equal(error.name, "LOGIN_LOCKED");
    assert.equal(error.retryAfter, 90);
    assert.match(error.message, /2 minute/);
    return true;
  });
});

it("aborts a stalled request and reports a retryable timeout", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    (_path: string, options: RequestInit) =>
      new Promise((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => reject(new Error("Aborted")), {
          once: true,
        });
      }),
  );
  await assert.rejects(postAdminAuth("/api/v1/admin/login", {}, 10), /request timed out/);
});

it("reports an unavailable server instead of a password error for non-JSON responses", async (context) => {
  context.mock.method(
    globalThis,
    "fetch",
    async () => new Response("Bad gateway", { status: 502 }),
  );
  await assert.rejects(postAdminAuth("/api/v1/admin/login", {}), /Unable to reach authentication/);
});
