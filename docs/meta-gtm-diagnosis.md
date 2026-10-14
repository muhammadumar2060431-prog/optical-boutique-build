# GTM / Meta Event Diagnosis

Checked 14 October 2026, before the fixes in this task.

## Production Findings

- On https://www.nigah.store/product/ar10, a real browser received `meta_view_content` and `meta_add_to_cart`. Checkout received `meta_initiate_checkout`.
- Each included numeric `value: 6000`, `currency: "PKR"`, `content_ids: ["prd-he3xye1"]`, and a distinct event ID.
- React hydration completed; no page errors occurred. Exactly one GTM loader was present.
- Production loaded the event mapping in `/assets/WhatsAppModal-CK28sA-z.js`. Its filename does not imply the event helper is unused: shared modules were bundled into that chunk.
- The reported absence of events cannot currently be reproduced. A stale page or inspecting before hydration is possible, but not proven.
- No real purchase was made during diagnosis. Purchase is verified separately with mocked order responses.

## Commit And Deployment

- Local HEAD and the actual remote `refs/heads/main` both resolved to `344dde6c93a09c2242dda4b19e8ab835c4b24e47`.
- `git show HEAD:src/lib/meta-events.ts` confirms the four requested event names are committed.
- The live assets contain that mapping; production is not missing the event mapping.
- The exact Vercel deployment commit and configured Production Branch cannot be independently confirmed without Vercel project access.
- Other workspace edits, including WhatsApp form removal and newsletter checkout changes, were still uncommitted at diagnosis. They are not proof that tracking is uncommitted.

## Push Locations And Wiring

One shared push handles all four commerce events:

`src/lib/meta-events.ts:58`

```ts
window.dataLayer.push({
  event: commerceEvent ?? "meta_event",
  event_name: input.eventName,
  event_id: eventId,
  ...input.customData,
  ...customData,
});
```

`window.dataLayer = window.dataLayer || []` runs immediately before this push at line 57, without replacing an existing GTM queue. The push is synchronous and does not wait for the Pixel, cookies, CAPI, or a network response.

The other push is the standard GTM bootstrap in `src/routes/__root.tsx:331`:

```js
w[l] = w[l] || [];
w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
```

No other application `dataLayer.push` calls were found. Lead and newsletter events use the shared helper too, with `event: "meta_event"`.

### ViewContent

Call: `src/routes/product.$slug.tsx:198`, inside a product-dependent `useEffect`. The ref prevents repeated renders from duplicating a view, and changes when another product opens. This is an active routed component.

```ts
{
  event: "meta_view_content",
  event_name: "ViewContent",
  event_id: eventId, // "viewcontent:" + unique UUID
  value: product.salePrice ?? product.price,
  currency: "PKR",
  contentIds: [product.id],
  contentType: "product",
  contentName: product.name,
  numItems: 1,
  content_ids: [product.id],
  content_type: "product",
  content_name: product.name,
  num_items: 1
}
```

### AddToCart

Call: `src/lib/cart.tsx:144`, in the real CartProvider `addItem` handler. Product and catalog add buttons call it. It runs once per add action, outside the React state updater.

```ts
{
  event: "meta_add_to_cart",
  event_name: "AddToCart",
  event_id: eventId, // "addtocart:" + unique UUID
  value: getProductUnitPrice(product, variant) * qty,
  currency: "PKR",
  contentIds: [product.id],
  contentType: "product",
  contentName: product.name,
  numItems: qty,
  content_ids: [product.id],
  content_type: "product",
  content_name: product.name,
  num_items: qty
}
```

### InitiateCheckout

Call: `src/routes/checkout.tsx:106`, inside `useEffect`. It waits for cart hydration and a nonempty cart, and uses a ref to avoid rerender duplicates. It runs when checkout mounts through SPA navigation as well as full page loads. Empty checkout intentionally does not send this event.

```ts
{
  event: "meta_initiate_checkout",
  event_name: "InitiateCheckout",
  event_id: eventId, // "initiatecheckout:" + unique UUID
  value: subtotal,
  currency: "PKR",
  contentIds: items.map(item => item.productId),
  contentType: "product",
  contentName: "Shopping bag checkout",
  numItems: items.reduce((total, item) => total + item.qty, 0),
  content_ids: items.map(item => item.productId),
  content_type: "product",
  content_name: "Shopping bag checkout",
  num_items: items.reduce((total, item) => total + item.qty, 0)
}
```

### Purchase

Call: `src/routes/checkout.tsx:268`, only after `addOrders` returns saved orders. Its payload and UUID are created once per reusable checkout attempt. Values and IDs below are those captured in that attempt, not freshly generated after submission.

```ts
{
  event: "meta_purchase",
  event_name: "Purchase",
  event_id: purchaseEvent.eventId, // "purchase:" + unique UUID
  value: subtotal,
  currency: "PKR",
  contentIds: items.map(item => item.productId),
  contentType: "product",
  contentName: "Order " + reference,
  numItems: items.reduce((total, item) => total + item.qty, 0),
  content_ids: items.map(item => item.productId),
  content_type: "product",
  content_name: "Order " + reference,
  num_items: items.reduce((total, item) => total + item.qty, 0)
}
```

Checkout displays this same subtotal as its total; no additional shipping amount is added. The confirmation page has no Purchase push, so refreshing it does not replay Purchase.

The checkout lock was released immediately after the order request, before post-success processing/navigation. A completed-order guard will close that small repeat-submission window.

## CAPI And GTM

- For views/cart/checkout, `trackMetaEvent` uses the browser event ID in `/api/v1/meta/events`.
- Purchase passes its existing event ID to the order API; the server creation hook sends CAPI with that ID and skips replayed order requests.
- One GTM script appears in the document head, and one noscript iframe is the first body child. These are the paired standard snippet, not two container installations.
- A direct `window.fbq("track", ...)` still existed in `src/lib/meta-events.ts:68` for non-commerce events. Commerce already avoided it. The fix removes it entirely so GTM owns all browser Pixel tags.
- All GTM Data Layer Variable names are top-level: `value`, `currency`, `content_ids`, `event_id`, optionally `event_name`. Do not use `ecommerce.value` or other ecommerce-prefixed names.

## Browser Verification And Deployment

Use the main/top browser frame, with an ad blocker disabled, and wait until the product page is interactive. Inspect a snapshot after each action:

```js
console.table((window.dataLayer || [])
  .filter(x => /^meta_/.test(x.event || ""))
  .map(({ event, value, currency, content_ids, event_id }) =>
    ({ event, value, currency, content_ids: JSON.stringify(content_ids), event_id })));
```

1. Open a product page: expect one ViewContent. Navigate through internal links to another product: expect another ViewContent.
2. Click Add to bag: expect AddToCart with added quantity value.
3. Use the internal checkout link with a populated cart: expect InitiateCheckout.
4. Place an authorized test order: expect Purchase only after success. A failed order, repeated click while saving, or confirmation-page refresh must not add another Purchase.

The same UUID must appear in browser `event_id` and the CAPI request's `eventId`. GTM tags must forward it to Meta's `eventID` option.

After reviewing/staging the intended changes, commit and push normally to `main`. In Vercel, verify the nigah.store project's Production Branch is `main`, then deploy that new commit and wait for Ready. A redeploy of an older commit does not include new changes. Publish matching Custom Event triggers and Pixel tags in GTM separately.

No source debug console logs are needed: browser assertions inspect the actual queue.

## Fix And Verification Results

- Removed the remaining direct Pixel call and its Window type declaration. GTM is the browser Pixel owner for all events.
- Added `orderCompletedRef` in checkout. It is set before the submission lock is released after a successful save, preventing a second successful checkout action during navigation.
- Typecheck, focused lint, the production build, and 12 Meta/checkout unit tests passed. Generated browser assets contain the event mapping and no `fbq` code.
- Browser verification against the local application passed product-to-product SPA navigation, AddToCart, checkout route entry, and browser/CAPI event ID matching.
- Mocked order API browser checks passed: failure emits no Purchase; success emits exactly one Purchase for PKR 3998; double form submission produces one order request; confirmation-page refresh produces no additional Purchase.
- Order requests were mocked for verification; no live customer order was created.
- New fixes remain uncommitted/unpushed in the workspace. Existing tracking mapping is already on remote main and was observed live.
- GTM must have triggers for the four commerce event names. Lead/newsletter browser tracking now also requires GTM handling of the existing `meta_event` event and its `event_name`.
