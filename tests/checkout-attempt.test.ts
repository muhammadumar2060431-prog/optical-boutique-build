import assert from "node:assert/strict";
import { it } from "node:test";
import { reuseCheckoutAttempt, stableCheckoutOrderIds } from "../src/lib/checkout-attempt.ts";
import { createOrdersSchema } from "../src/lib/api/contracts.ts";
import { clientAddress } from "../src/lib/api/client-address.ts";

it("reuses the complete checkout payload after a lost response and rotates when intent changes", async () => {
  let calls = 0;
  const create = () => ({ reference: `OPT-TEST${++calls}`, eventId: `event-${calls}` });
  const first = reuseCheckoutAttempt("same intent", null, create);
  const retry = reuseCheckoutAttempt("same intent", first, create);
  assert.equal(retry, first);
  assert.equal(calls, 1);
  assert.deepEqual(
    await stableCheckoutOrderIds(first.key, 2),
    await stableCheckoutOrderIds(retry.key, 2),
  );
  const next = reuseCheckoutAttempt("changed cart/contact/address", retry, create);
  assert.notEqual(next.key, first.key);
  assert.equal(calls, 2);
});
it("keeps validated/hashable order IDs stable when timestamps are regenerated", async () => {
  const [id] = await stableCheckoutOrderIds("checkout:stable-test", 1);
  const order = {
    id,
    reference: "OPT-TEST123",
    customerName: "Test Customer",
    contact: "test@example.test",
    productId: "frame",
    productName: "Frame",
    variantId: null,
    variantLabel: null,
    message: "Delivery address: test",
    source: "cart",
    quantity: 2,
  };
  assert.deepEqual(
    createOrdersSchema.parse({ orders: [{ ...order, createdAt: "first" }] }),
    createOrdersSchema.parse({ orders: [{ ...order, createdAt: "retry" }] }),
  );
});
it("does not let spoofed forwarding headers select a production rate-limit identity", () => {
  const request = new Request("https://nigah.store", {
    headers: {
      "x-vercel-forwarded-for": "203.0.113.1, 203.0.113.2",
      "cf-connecting-ip": "spoofed",
      "x-forwarded-for": "spoofed",
    },
  });
  assert.equal(clientAddress(request, { VERCEL: "1", NODE_ENV: "production" }), "203.0.113.1");
  assert.equal(clientAddress(request, { NODE_ENV: "production" }), "unknown");
});
