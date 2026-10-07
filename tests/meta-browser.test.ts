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

it("maps Pixel parameters and preserves the same deduplication ID for GTM", (t) => {
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
  assert.deepEqual(calls[0], [
    "track",
    "AddToCart",
    {
      currency: "PKR",
      content_ids: ["frame-1"],
      content_type: "product",
      num_items: 2,
      value: 4000,
    },
    { eventID: id },
  ]);
  assert.equal(browser.dataLayer[0]?.["event_id"], id);
  assert.deepEqual(browser.dataLayer[0]?.["contentIds"], ["frame-1"]);
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
