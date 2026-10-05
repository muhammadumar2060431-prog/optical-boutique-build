import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicBrowserCache } from "../src/lib/public-browser-cache.ts";

describe("public browser cache", () => {
  it("does not retain draft products or disabled slides in public cache", () => {
    assert.deepEqual(
      publicBrowserCache("products", [
        { id: "live", status: "Published" },
        { id: "private", status: "Draft" },
      ]),
      [{ id: "live", status: "Published" }],
    );
    assert.deepEqual(
      publicBrowserCache("heroSlides", [
        { id: "live", enabled: true },
        { id: "private", enabled: false },
      ]),
      [{ id: "live", enabled: true }],
    );
  });
  it("does not persist admin customer records", () => {
    for (const key of ["orders", "queries", "subscribers"]) {
      assert.equal(publicBrowserCache(key, [{ id: "private" }]), undefined);
    }
  });
  it("redacts current and legacy private identity fields without changing originals", () => {
    const settings = {
      storeName: "Shop",
      email: "public@example.test",
      adminEmail: "owner@example.test",
      admin_email: "legacy@example.test",
      adminPassword: "private",
    };
    const result = publicBrowserCache("settings", settings) as Record<string, unknown>;
    assert.equal(result.email, "public@example.test");
    assert.equal(result.adminEmail, "");
    assert.equal("admin_email" in result, false);
    assert.equal("adminPassword" in result, false);
    assert.equal(settings.adminEmail, "owner@example.test");
  });
  it("keeps private review emails out of cached rows", () => {
    const reviews = [
      {
        id: "review",
        name: "Customer",
        email: "customer@example.test",
        quote: "Nice glasses",
        rating: 5,
      },
    ];
    const cached = publicBrowserCache("testimonials", reviews) as Record<string, unknown>[];
    assert.equal("email" in cached[0]!, false);
    assert.equal(reviews[0]!.email, "customer@example.test");
  });
});
