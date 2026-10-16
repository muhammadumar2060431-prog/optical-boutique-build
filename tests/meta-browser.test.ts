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

it("routes non-commerce events through GTM without calling the Pixel directly", (t) => {
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
  assert.deepEqual(calls, []);
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

it("returns eventId and does nothing else when window is undefined", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  if (originalWindow) {
    Reflect.deleteProperty(globalThis, "window");
  }
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  });

  const eventId = trackMetaBrowserEvent({
    eventName: "AddToCart",
    eventId: "cart:ssr-test",
    customData: { value: 1000 },
  });
  assert.equal(eventId, "cart:ssr-test");

  const generatedId = trackMetaBrowserEvent({
    eventName: "Purchase",
  });
  assert.match(generatedId, /^purchase:/);
});

it("tracks distinct dynamic purchase values for different orders (e.g. 2400, 3500, 5200 PKR)", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { dataLayer: [] as Record<string, unknown>[] };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });

  const testOrders = [
    { reference: "OPT-ORD001", total: 2400, items: ["prd-1"] },
    { reference: "OPT-ORD002", total: 3500, items: ["prd-2"] },
    { reference: "OPT-ORD003", total: 5200, items: ["prd-1", "prd-3"] },
  ];

  for (const order of testOrders) {
    const eventId = `purchase_${order.reference}`;
    trackMetaBrowserEvent({
      eventName: "Purchase",
      eventId,
      customData: {
        value: order.total,
        currency: "PKR",
        contentIds: order.items,
        contentType: "product",
        contentName: "Order " + order.reference,
        numItems: order.items.length,
      },
    });
  }

  assert.equal(browser.dataLayer.length, 3);
  assert.equal(browser.dataLayer[0]?.["event"], "meta_purchase");
  assert.equal(browser.dataLayer[0]?.["value"], 2400);
  assert.equal(browser.dataLayer[0]?.["event_id"], "purchase_OPT-ORD001");
  assert.equal(browser.dataLayer[0]?.["currency"], "PKR");

  assert.equal(browser.dataLayer[1]?.["value"], 3500);
  assert.equal(browser.dataLayer[1]?.["event_id"], "purchase_OPT-ORD002");

  assert.equal(browser.dataLayer[2]?.["value"], 5200);
  assert.equal(browser.dataLayer[2]?.["event_id"], "purchase_OPT-ORD003");
  assert.deepEqual(browser.dataLayer[2]?.["content_ids"], ["prd-1", "prd-3"]);
});

it("suppresses Purchase browser push when value is invalid, 0, or missing", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { dataLayer: [] as Record<string, unknown>[] };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });

  trackMetaBrowserEvent({
    eventName: "Purchase",
    eventId: "purchase_INVALID_ZERO",
    customData: { value: 0 },
  });
  assert.equal(browser.dataLayer.length, 0, "Purchase with value 0 must be suppressed");

  trackMetaBrowserEvent({
    eventName: "Purchase",
    eventId: "purchase_INVALID_NEGATIVE",
    customData: { value: -500 },
  });
  assert.equal(browser.dataLayer.length, 0, "Purchase with negative value must be suppressed");

  trackMetaBrowserEvent({
    eventName: "Purchase",
    eventId: "purchase_INVALID_NAN",
    customData: { value: NaN },
  });
  assert.equal(browser.dataLayer.length, 0, "Purchase with NaN value must be suppressed");
});

it("includes contents array in purchase customData for Meta catalog matching", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { dataLayer: [] as Record<string, unknown>[] };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });

  trackMetaBrowserEvent({
    eventName: "Purchase",
    eventId: "purchase_OPT-CATALOG1",
    customData: {
      value: 4800,
      currency: "PKR",
      contentIds: ["frame-black", "lens-blue"],
      contents: [
        { id: "frame-black", quantity: 1, item_price: 3600 },
        { id: "lens-blue", quantity: 2, item_price: 600 },
      ],
      numItems: 3,
    },
  });

  const entry = browser.dataLayer[0]!;
  assert.equal(entry["event"], "meta_purchase");
  assert.equal(entry["value"], 4800);
  assert.deepEqual(entry["contents"], [
    { id: "frame-black", quantity: 1, item_price: 3600 },
    { id: "lens-blue", quantity: 2, item_price: 600 },
  ]);
});

