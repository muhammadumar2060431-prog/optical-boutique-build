import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { buildMetaCapiPayload, hashMetaValue } from "../src/lib/meta-capi.server.ts";

function expectedHash(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase(), "utf8").digest("hex");
}

function trackingRequest() {
  return new Request("https://www.nigah.store/api/v1/meta/events", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "user-agent": "Meta-CAPI-Test/1.0",
      cookie: "_fbp=fb.1.1234567890.123456789; _fbc=fb.1.1234567890.test-click",
    },
  });
}

describe("Meta Conversions API payload", () => {
  it("uses Vercel's forwarded visitor IP and never sends unhashed customer fields", () => {
    const payload = buildMetaCapiPayload(
      {
        eventName: "ViewContent",
        eventId: "view:test-12345",
        eventSourceUrl: "https://www.nigah.store/glasses",
      },
      new Request("https://www.nigah.store/api/v1/meta/events", {
        headers: {
          "x-vercel-forwarded-for": "203.0.113.11, 10.0.0.1",
          "user-agent": "Meta-CAPI-Test/1.0",
        },
      }),
    );
    assert.equal(payload.data[0]?.user_data.client_ip_address, "203.0.113.11");
    assert.equal("custom_data" in payload.data[0]!, false);
  });
  it("normalizes and hashes PII with SHA-256", () => {
    assert.equal(hashMetaValue("  AYESHA@EXAMPLE.COM "), expectedHash("ayesha@example.com"));
  });

  it("maps hashed PII, request context, cookies, and custom data", () => {
    const payload = buildMetaCapiPayload(
      {
        eventName: "Purchase",
        eventId: "purchase:test-12345",
        eventSourceUrl: "https://www.nigah.store/checkout",
        userData: {
          email: " AYESHA@EXAMPLE.COM ",
          phone: " +92 300 1234567 ",
          firstName: " Ayesha ",
          lastName: " Khan ",
          city: " Lahore ",
          state: " Punjab ",
          zip: " 54000 ",
          country: " PK ",
          externalId: " customer-123 ",
        },
        customData: {
          value: 12500,
          currency: "pkr",
          contentIds: ["product-1"],
          contentType: "product",
          contentName: "Classic Frame",
          numItems: 1,
        },
      },
      trackingRequest(),
      { eventTime: 1_700_000_000 },
    );

    const event = payload.data[0]!;
    assert.equal(event.event_time, 1_700_000_000);
    assert.equal(event.action_source, "website");
    assert.deepEqual(event.user_data.em, [expectedHash("ayesha@example.com")]);
    assert.deepEqual(event.user_data.ph, [expectedHash("923001234567")]);
    assert.deepEqual(event.user_data.external_id, [expectedHash("customer-123")]);
    assert.equal(event.user_data.client_ip_address, "203.0.113.10");
    assert.equal(event.user_data.client_user_agent, "Meta-CAPI-Test/1.0");
    assert.equal(event.user_data.fbp, "fb.1.1234567890.123456789");
    assert.equal(event.user_data.fbc, "fb.1.1234567890.test-click");
    assert.deepEqual(event.custom_data, {
      value: 12500,
      currency: "PKR",
      content_ids: ["product-1"],
      content_type: "product",
      content_name: "Classic Frame",
      num_items: 1,
    });
    assert.equal("test_event_code" in payload, false);
  });

  it("includes a non-empty test event code only when configured", () => {
    const payload = buildMetaCapiPayload(
      {
        eventName: "Lead",
        eventId: "lead:test-12345",
        eventSourceUrl: "https://www.nigah.store/contact",
      },
      trackingRequest(),
      { testEventCode: "TEST12345" },
    );
    assert.equal(payload.test_event_code, "TEST12345");
  });
});
