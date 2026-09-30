import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createContactHandler, type ContactRepository } from "../src/lib/api/contact-handler.ts";

const validContact = {
  name: "Ayesha Khan",
  contact: "+92 300 1234567",
  productId: null,
  productName: "General enquiry",
  message: "Please tell me about available frames.",
};

function request(body: unknown) {
  return new Request("https://www.nigah.store/api/v1/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("contact API handler", () => {
  it("validates and saves an enquiry", async () => {
    let saved: unknown;
    const repository: ContactRepository = {
      async create(input) {
        saved = input;
        return { id: "qry-test" };
      },
    };
    const handler = createContactHandler(repository, async () => ({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 3_600_000,
    }));

    const response = await handler(request(validContact));
    assert.equal(response.status, 201);
    assert.deepEqual(saved, validContact);
    assert.equal(response.headers.get("x-ratelimit-remaining"), "4");
  });

  it("returns 429 without writing when the distributed limit is exhausted", async () => {
    let writes = 0;
    const repository: ContactRepository = {
      async create() {
        writes += 1;
        return { id: "qry-test" };
      },
    };
    const handler = createContactHandler(repository, async () => ({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60_000,
    }));

    const response = await handler(request(validContact));
    assert.equal(response.status, 429);
    assert.equal(writes, 0);
    assert.ok(Number(response.headers.get("retry-after")) >= 1);
  });
});
