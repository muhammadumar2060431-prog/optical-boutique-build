import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ADMIN_INACTIVITY_MS, isAdminActivityExpired } from "../src/lib/admin-session.ts";

describe("admin inactivity timeout", () => {
  const now = 2_000_000;

  it("keeps an active admin session before ten minutes", () => {
    assert.equal(isAdminActivityExpired(now - ADMIN_INACTIVITY_MS + 1, now), false);
  });

  it("expires an admin session at exactly ten minutes", () => {
    assert.equal(isAdminActivityExpired(now - ADMIN_INACTIVITY_MS, now), true);
  });

  it("rejects restored sessions without a valid activity timestamp", () => {
    assert.equal(isAdminActivityExpired(0, now), true);
    assert.equal(isAdminActivityExpired(Number.NaN, now), true);
  });
});
