import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError, readJsonBody } from "../src/lib/api/http.server.ts";

function request(body: string, headers?: HeadersInit) {
  return new Request("https://example.test/api", { method: "POST", body, headers });
}

describe("bounded JSON request bodies", () => {
  it("accepts valid JSON without Content-Length", async () => {
    assert.deepEqual(await readJsonBody(request('{"name":"test"}'), 100), { name: "test" });
  });

  it("rejects oversized bodies with absent or understated Content-Length", async () => {
    for (const headers of [{}, { "Content-Length": "1" }]) {
      await assert.rejects(
        readJsonBody(request(JSON.stringify({ value: "x".repeat(100) }), headers), 50),
        (error: unknown) => error instanceof ApiError && error.status === 413,
      );
    }
  });

  it("counts UTF-8 bytes, not string length", async () => {
    await assert.rejects(
      readJsonBody(request(JSON.stringify("\u00e9".repeat(20))), 30),
      (error: unknown) => error instanceof ApiError && error.status === 413,
    );
  });

  it("returns a controlled error for malformed JSON", async () => {
    await assert.rejects(
      readJsonBody(request("{broken"), 100),
      (error: unknown) => error instanceof ApiError && error.status === 400,
    );
  });
});
