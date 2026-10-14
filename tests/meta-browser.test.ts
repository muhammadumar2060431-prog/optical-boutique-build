import assert from "node:assert/strict";
import { it } from "node:test";
import { trackMetaBrowserEvent, trackMetaEvent } from "../src/lib/meta-events.ts";
import { applySecurityHeaders } from "../src/lib/security-headers.ts";

it("allows the configured Facebook Pixel script and event connection", () => {
  const response = applySecurityHeaders(new Response(), new Request("https://www.nigah.store/"));
  const policy = response.headers.get("Content-Security-Policy")!;
  assert.match(policy, /script-src[^;]*https:\/\/connect\.facebook\.net/);
  assert.match(policy, /connect-src[^;]*https:\/\/www\.facebook\.com/);
  assert.match(policy, /object-src 'none'/);
});

it("pushes normalized commerce fields for GTM without firing the Pixel twice", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const calls: unknown[][] = [];
  const browser = {
    dataLayer: [] as Record<string, unknown>[],
    fbq: (...args: unknown[]) => calls.push(args),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
  const id = trackMetaBrowserEvent({
    eventName: "AddToCart",
    eventId: "cart:test-12345",
    customData: {
      currency: "pkr",
      contentIds: ["frame-1"],
      contentType: "product",
      numItems: 2,
      value: 4000,
    },
  });
  assert.equal(id, "cart:test-12345");
  assert.deepEqual(calls, []);
  assert.equal(browser.dataLayer[0]?.["event"], "meta_add_to_cart");
  assert.equal(browser.dataLayer[0]?.["value"], 4000);
  assert.equal(browser.dataLayer[0]?.["currency"], "PKR");
  assert.deepEqual(browser.dataLayer[0]?.["content_ids"], ["frame-1"]);
  assert.equal(browser.dataLayer[0]?.["event_id"], id);
  assert.deepEqual(browser.dataLayer[0]?.["contentIds"], ["frame-1"]);
});

it("uses the requested GTM event names with unique IDs even before the Pixel loads", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { dataLayer: [] as Record<string, unknown>[] };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
  const events = [
    ["ViewContent", "meta_view_content"],
    ["AddToCart", "meta_add_to_cart"],
    ["InitiateCheckout", "meta_initiate_checkout"],
    ["Purchase", "meta_purchase"],
  ] as const;
  for (const [eventName, event] of events) {
    const id = trackMetaBrowserEvent({
      eventName,
      customData: { value: 1999.5, currency: "PKR", contentIds: ["product-1", "product-2"] },
    });
    const pushed = browser.dataLayer.at(-1)!;
    assert.equal(pushed["event"], event);
    assert.equal(pushed["event_id"], id);
    assert.equal(pushed["value"], 1999.5);
    assert.equal(typeof pushed["value"], "number");
    assert.equal(pushed["currency"], "PKR");
    assert.deepEqual(pushed["content_ids"], ["product-1", "product-2"]);
  }
  assert.equal(new Set(browser.dataLayer.map((event) => event["event_id"])).size, 4);
});

it("continues direct Pixel tracking for non-commerce events", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const calls: unknown[][] = [];
  const browser = {
    fbq: (...args: unknown[]) => calls.push(args),
    dataLayer: [] as Record<string, unknown>[],
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
  trackMetaBrowserEvent({ eventName: "Lead", eventId: "lead:test-12345" });
  assert.equal(browser.dataLayer[0]?.["event"], "meta_event");
  assert.deepEqual(calls[0], ["track", "Lead", {}, { eventID: "lead:test-12345" }]);
});

it("waits for an asynchronously loaded Pixel cookie before sending an anonymous event", async (t) => {
  const originals = new Map(
    ["window", "document", "fetch"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const document = { cookie: "" };
  let sent!: () => void;
  const completed = new Promise<void>((resolve) => {
    sent = resolve;
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { href: "https://www.nigah.store/glasses" } },
  });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (_url: string, init: RequestInit) => {
      assert.match(document.cookie, /_fbp=/);
      assert.equal(init.credentials, "same-origin");
      assert.equal(JSON.parse(init.body as string).eventId, "view:test-12345");
      sent();
      return new Response();
    },
  });
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  trackMetaEvent({ eventName: "ViewContent", eventId: "view:test-12345" });
  document.cookie = "_fbp=fb.1.1700000000000.123456789";
  await completed;
});
