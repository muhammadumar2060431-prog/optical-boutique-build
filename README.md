# Optique Suite

Lovable Build Prompt — Premium Eyewear E-commerce Store (Detailed)

Copy everything below into Lovable as one prompt.

Build a premium, fully responsive e-commerce web application for a brand selling eyeglasses (frames) and eye contact lenses. The site must feel like a high-end optical boutique — clean, professional, trustworthy, and modern, on the level of a real premium retail brand's website. It needs a complete customer-facing storefront PLUS a full custom admin panel for managing everything (no third-party CMS, no external website builder embeds). Use React with a modern router (multi-page feel, real routes/URLs per page, not just anchor scrolling) and a consistent component library so every button, input, card, and modal looks and behaves the same everywhere.

Data for now: Do NOT set up a real database/backend yet. Use realistic, well-structured mock/demo data (in-app state, e.g. React context or a state manager, seeded from local JSON/TS objects) for products, categories, variants, orders, inventory, hero slides, category banners, announcement bar, video setting, testimonials, and settings. Architect the data layer through a small set of clearly-named functions/hooks (e.g. getProducts(), getCategoryBySlug(), addOrder(), updateStock(), getSettings()) rather than scattering hardcoded values through components — this is important so a real backend/database can be plugged in later with minimal rework. Admin actions should update this in-memory data immediately (optimistic UI, instant feedback) so the whole demo feels alive and connected, even though nothing persists after a hard refresh yet.

1. Brand & Visual Theme

Brand name placeholder: "OPTIQUE" (used in navbar logo, footer, browser tab title, and admin panel header). Make it editable later from Admin → Settings, and make sure that setting actually drives the navbar/footer text (not hardcoded in multiple places).

Color palette — use exactly these as CSS variables/design tokens (so a global theme tweak is a one-line change, not a find-and-replace):

--color-jet-black: #0E0E10 — navbar background, footer background, product image frame/backdrop panels, bold dark buttons/badges, admin sidebar.

--color-off-white: #F6F4EF — main page background, primary card background.

--color-light-gray: #EDECE7 — alternate section background.

--color-light-gray-deep: #E4E2DB — card borders, dividers, input borders, secondary surface.

--color-accent-gold: #B8873A — primary buttons (Add to Cart, WhatsApp, Shop Now, Submit), links, hover/focus states, price text, "New"/"Sale"/"Low stock" badges, active nav/tab underline, form focus rings.

--color-text-primary: #1B1B1D (near-black, not pure black, for headings/body).

--color-text-secondary: #6B6A65 (muted gray for captions/meta text).

The overall base/main background of the site is Off White / Light Gray — this is NOT a dark theme. Jet Black is reserved for the navbar, footer, announcement bar (default), product image backdrops, and select dark CTA sections/admin chrome — never the default page background of content sections.

Typography:

Heading/display font: a refined serif or precision geometric sans (e.g. something in the spirit of a premium editorial serif) used for H1/H2 hero and section titles — conveys "optics/precision + luxury."

Body/UI font: a clean, highly legible sans-serif for paragraphs, labels, buttons, nav, and all admin panel text.

Define a consistent type scale, roughly: H1 40–56px, H2 28–36px, H3 20–24px, body 15–16px, small/caption 12–13px, with appropriate line-height (1.2–1.3 for headings, 1.5–1.6 for body) and consistent font-weight usage (don't randomly mix 3 weights per page).

Signature visual motif — a subtle circular "lens" shape, used consistently but sparingly:

A soft circular frame/ring behind or around product thumbnail images in cards.

A circular hover glow/ring on icon buttons (cart, filter, search).

Circular dot indicators for the hero carousel.

Optionally, a large faint circular outline as a background decorative element behind hero/section headings (very subtle, low-opacity, not distracting).

Icons: use one consistent, professional outline icon set throughout (navigation, filter, cart/bag, WhatsApp, phone, mail, location pin, search, chevron, star for ratings, upload, trash/delete, edit/pencil, plus for "add", warning/alert for low stock). No mismatched icon styles, no emoji-as-icon.

Motion & animation (tasteful, not gimmicky):

Page/section entrance: fade + slight upward slide (~20px) on scroll into view, staggered slightly for grids of cards (each card 50–80ms after the previous).

Hover states: subtle scale (1.02–1.03) or elevation/shadow lift on product cards and buttons; underline/color transition on nav links; smooth color transition on all interactive elements (150–250ms ease).

Hero carousel: smooth crossfade or slide transition (600–800ms), auto-advance every ~5 seconds, pause auto-advance on hover/touch interaction, resume after.

Announcement bar: smooth, constant-speed horizontal marquee scroll, seamlessly looping (no visible jump/reset).

Page transitions between routes: a light fade/slide so navigation doesn't feel like a hard reload.

Respect prefers-reduced-motion — reduce/disable non-essential motion for users who request it.

Overall the design must NOT look like a generic AI-template (no default Bootstrap/Tailwind-starter look, no stock gradient hero, no default shadcn spacing everywhere unchanged). Give it real personality tied to eyewear/optics — lens/aperture-inspired shapes, precision-inspired generous whitespace, confident large typography — so it reads as a bespoke premium optical brand.

2. Full Responsiveness (all pages, storefront AND admin)

Breakpoints (roughly): mobile ≤ 640px, tablet 641–1024px, desktop ≥ 1025px. Design mobile-first, then enhance up.

Navbar: full horizontal nav + filter access on desktop; collapses into a hamburger/drawer menu on mobile/tablet that includes the same category links, filter access, and WhatsApp/contact shortcut.

Announcement bar: shrinks font-size/height slightly on mobile but keeps scrolling smoothly; never overlaps or hides content beneath it.

Hero carousel: full-bleed image with responsive height (e.g. taller on desktop, shorter/more compact on mobile so it doesn't push content too far down); headline/subtext font sizes scale down on mobile while staying readable over the image (maintain dark overlay/gradient for contrast at every size).

Category banners: same responsive treatment as hero — scale height and text size, stay full-width.

Product grids: reflow cleanly — for example 4 columns desktop → 2–3 columns tablet → 1–2 columns mobile — with consistent gutter spacing at every size, no overlapping cards, no orphaned single-card rows looking broken.

Product detail page: image gallery and info stack vertically on mobile (image first, then name/price/variants/description/CTA) instead of side-by-side as on desktop.

Forms (contact form, admin forms): single-column, full-width fields on mobile; labels always visible (not just placeholder-as-label); adequate spacing between fields for touch.

Admin panel on mobile/tablet: sidebar collapses into a top drawer/menu; data tables either become horizontally scrollable within their own container (not the whole page) or reflow into stacked "card" rows on very small screens; image upload controls remain usable (tap to upload, clear preview thumbnail, easy remove).

All buttons/tap targets: minimum ~44x44px touch area on mobile.

No horizontal scrollbars on the page body at any breakpoint (only intentional inner-scroll areas like data tables or the announcement marquee).

Test that images, embedded video, and icons scale proportionally and never overflow their containers at any width.

3. Public-Facing Storefront — Pages & Features

3.0 Scrolling Announcement Bar (topmost strip, above navbar, on every page)

A slim horizontal strip pinned at the very top of the page, above the main navbar, present on every route.

Text scrolls automatically and continuously left (marquee/ticker style), seamless infinite loop, constant readable speed — e.g. "Back in stock: the Classic Aviator • New drop: Blue Light lenses now available • Free delivery on orders above Rs. 5,000 • Visit our warehouse showroom".

Support multiple short messages separated by a bullet/divider, all scrolling in one continuous sequence.

Admin-controlled (see 4.4):

On/off toggle — when off, it collapses completely (navbar moves up, no leftover blank strip).

Editable message text (supports multiple messages).

Background color picker.

Text color picker.

Default demo state: ON, jet-black background, off-white/gold text, one or two sample messages.

Responsive: shorter height and slightly smaller font on mobile, scroll speed stays smooth and readable (not too fast).

3.1 Global Navbar (all pages, sits below the announcement bar)

Left: logo mark (simple circular "lens" icon motif) + brand name/wordmark, links to Home.

Center or right: primary nav links — Home, Glasses, Lenses, About, Contact — with a subtle gold underline/indicator on the active page.

A clearly visible Filter control (icon + label) that opens a filter panel/drawer (not a plain native <select>), containing:

Category checkboxes/tabs (Glasses / Lenses / All).

Price range slider or min/max inputs.

Variant/color swatches to filter by (pulled dynamically from available product variants).

"Apply" and "Clear all" actions.

A cart/inquiry icon on the right (even though there's no full payment checkout, this can represent a lightweight "shortlist" or jump straight to WhatsApp/contact — keep it simple and functional, not a fake feature).

Sticky on scroll (stays visible/accessible while browsing), with a subtle background/shadow change once the user scrolls past the hero, so it stays legible over any content.

Mobile: collapses to a hamburger icon opening a full-height drawer with the same links + filter access, closes on selection or outside-tap.

3.2 Home Page

Hero carousel directly below the navbar:

Auto-cycles through 3 full-width slides on a ~5 second timer, smooth crossfade/slide transition, manual left/right arrows, and clickable dot indicators showing current slide.

Each slide: full-bleed background image, dark gradient overlay (for text legibility), small gold eyebrow label (e.g. "NEW SEASON OPTICS"), large serif headline, one-line subtext, one primary gold CTA button (e.g. "Shop Frames") and optionally a secondary ghost/text link (e.g. "Our story").

Consistent height/crop across all 3 slides so the carousel doesn't jump in size when it transitions.

Fully admin-managed (see 4.4): image, eyebrow label, headline, subtext, CTA text + link per slide; reorder; enable/disable individual slides.

Featured products section: section heading (e.g. "Bestsellers" or "Featured"), responsive grid of product cards pulling live from product data — each card shows product image (with the circular lens motif framing), name, price, category tag, and a quick "View" button/hover overlay; clicking navigates to the Product Detail Page.

Testimonials section: section heading (e.g. "What our customers say"), attractive carousel or 3-column grid of testimonial cards (customer name, short quote, optional 1–5 star rating, optional small circular photo). Admin can add/edit/delete/reorder testimonials.

Warehouse video section: section heading (e.g. "Inside our warehouse"), embedded responsive YouTube player (16:9, scales with container), short caption/description beneath. If no video is configured yet, show a clean placeholder card (icon + "Video coming soon") instead of a broken embed.

Sections alternate Off White / Light Gray backgrounds for rhythm, each with a scroll-reveal entrance animation.

Footer (see 3.8) at the bottom.

3.3 About Page

Hero/intro area with brand story headline + a few paragraphs of editable brand copy (mission, craftsmanship, quality promise).

Same managed warehouse video section/style as Home (same underlying video setting — one video, shown in both places).

Optional supporting content: a row of 3–4 "trust" mini-cards with icon + short label (e.g. "Hand-finished frames", "Optician-fitted", "Warranty included", "Fast local delivery") — keep tasteful, not overcrowded.

Footer at the bottom.

3.4 Category Pages (Glasses / Lenses, route per category e.g. /glasses, /lenses)

Category banner at the very top of the page (above filters, above the grid): full-width themed banner unique to this category — e.g. for Glasses, a bold graphic banner ("INTELLIGENT GLASSES — SCREEN + TRANSITION + DRIVE SAFE" with a "SHOP NOW" button); for Lenses, a different themed banner with its own image/text/CTA. Each category's banner is independently managed in admin and only appears on that category's own page.

If no banner is set for a category yet, skip cleanly to the filters/grid — no empty/broken box.

Below the banner: category title/heading + product count (e.g. "Glasses — 14 products"), and filter/sort controls (price, newest, color/variant) consistent with the navbar filter style — sort dropdown (Newest, Price: Low to High, Price: High to Low) plus the same filter panel.

Below that: responsive product grid of all products in this category (same card style as Home's featured grid).

Clean empty state if a category currently has zero products (e.g. "No products in this category yet — check back soon.").

Footer at the bottom.

3.5 Product Detail Page (route per product e.g. /product/:slug)

Two-column layout on desktop (image gallery left, details right), stacked on mobile (image first).

Image gallery: one required base image shown large, plus a thumbnail strip/slider of 0–3 optional sub-images the user can click to swap the main image; smooth crossfade when switching. If there are no sub-images, just show the base image cleanly with no empty thumbnail slots.

Product name (large heading), category tag/breadcrumb (e.g. Home / Glasses / [Product Name]), price (prominent, gold), and full description.

Variant selector (only shown if the product has variants): swatches or small labeled thumbnail buttons per variant (e.g. "Black", "Blue") — selecting one updates the main image to that variant's image and updates any variant-specific info (like its own stock status). Default to the first available variant.

Stock/availability indicator (e.g. "In stock", "Only 3 left", "Out of stock" — pulling from the Inventory data).

Primary CTA: "Order on WhatsApp" button (gold, prominent) — opens WhatsApp with a pre-filled message containing product name, selected variant, and a link back to the product. Secondary CTA: "Enquire via form" link that scrolls to/opens the contact form pre-filled with this product's name.

An expandable/tabbed detail area below the fold for richer info (e.g. tabs or accordion: "Details" — material, frame type, fit notes; "Lens info" — if relevant; "Care instructions") — content should come from flexible per-product fields set in admin, not be hardcoded per product.

"You may also like" row: 3–4 related products from the same category, excluding the current product.

Footer at the bottom.

3.6 Ordering Approach (no full payment gateway needed)

Two ways to order, both logged into the system for admin visibility:

"Order on WhatsApp" — prefills a WhatsApp message (product name + variant + product link) to the store's configured WhatsApp number (Settings), then before/while redirecting, records an "order intent" entry (product, variant, timestamp, and whatever the customer optionally leaves such as name) into the same in-memory order data admin sees.

Contact/Order form (Section 3.7) — submissions are stored directly into the same order/enquiry data.

Both types appear together in Admin → Orders, clearly tagged by source, so the admin has one unified inbox instead of two disconnected lists.

3.7 Contact Page

Clean, professional form: Name, Phone or Email, Message, optional "Product reference" field (auto-filled if arriving from a product page's "Enquire" link).

Clear validation (required fields, valid email/phone format) with friendly inline error messages, and a success confirmation state after submit (e.g. a check-mark + "Thanks — we'll get back to you shortly on WhatsApp or email.").

Prominent WhatsApp button/card near the form as an alternative contact method, plus a small floating WhatsApp button visible site-wide (bottom-right corner, all pages) for quick access.

Store details block: address, phone, email, business hours — pulled from Settings so it's editable in one place.

Optional: an embedded map or simple location graphic if relevant (not required).

Footer at the bottom.

3.8 Footer (all pages)

Jet black background, off-white text.

Columns: brand blurb + logo; quick links (Home, Glasses, Lenses, About, Contact); contact info (phone, email, address — from Settings); social icons (if applicable).

Small WhatsApp CTA repeated here too.

Bottom line: copyright + brand name (dynamic from Settings), small print.

4. Admin Panel (fully custom, protected by login)

A separate, authenticated section (e.g. /admin) with simple secure login (email/password, demo credentials clearly documented for the client to log in and test). Clean dashboard UI using the same brand palette but leaning more on Jet Black + Light Gray for a "control panel" feel, gold reserved for primary actions/highlights. Persistent sidebar (collapsible on mobile/tablet) with sections:

4.1 Dashboard (landing page after login)

Summary metric cards: Total Products, Total Categories, New/Unread Orders count, Low-Stock Alerts count.

"Recent Orders" list (last 5–10) with quick status glance and a "View all" link to the Orders section.

Optional simple chart/visual (e.g. orders per week) if it fits naturally — not required if it overcomplicates the mock-data setup.

4.2 Orders

Unified table: Date/Time, Customer Name, Contact Info, Product(s)/Variant referenced, Source (WhatsApp / Contact Form — visually tagged, e.g. colored pill), Status (New / Contacted / Completed / Cancelled — editable inline or via detail view), quick actions.

Filters: by status, by source, by date range; search by customer name or product.

Row click opens a detail panel/modal with the full message, all captured fields, and status-change controls including "Mark as Sold" (triggers stock decrement per Section 4.3) and "Cancel" (reverts stock if it had been decremented).

Clean empty state ("No orders yet — new WhatsApp and contact-form enquiries will appear here automatically.").

4.3 Products

Categories tab/sub-section: table of categories (name, product count, banner thumbnail preview) with Add/Edit/Delete; deleting a category with existing products should prompt a clear warning (require reassigning or confirming cascade behavior — keep it simple but not silently destructive).

Products tab/sub-section:

Table view: thumbnail, name, category, price, stock summary, quick edit/delete icons, search box, category filter dropdown.

"Add Product" form/modal: Name, Category (dropdown), Price, Description (multi-line/rich text), Base image upload (required, with preview + remove/replace), up to 3 additional sub-images (clearly labeled "optional", each with its own upload/preview/remove), and a detail-tab content area (material/fit/lens-info/care fields matching the Product Detail Page's tabs).

Variants sub-section within a product: "Add Variant" action lets admin add one or more entries, each with: Variant label (e.g. "Black"), its own image upload, and its own stock quantity — all listed under the parent product, editable/removable independently. Clear empty state if a product has no variants yet ("This product has no color/variant options — add one if needed, or leave as a single item.").

Edit and Delete available on every product and every variant at any time, with a confirmation step before delete.

4.4 Inventory / Stock

Table listing every product and, where applicable, each of its variants as its own row (e.g. "Classic Aviator — Black" and "Classic Aviator — Blue" as two rows), columns: Category, Product/Variant name, Current Stock, Status (In stock / Low stock / Out of stock — auto-computed), Last Updated.

Manual "+ / −" stock adjustment controls or an editable quantity field per row, saved instantly.

Linked to Orders: marking an order "Sold" in Orders decrements the relevant product/variant stock here automatically; cancelling/reverting an order increments it back — the two sections must always reflect the same underlying numbers, never drift apart.

Configurable low-stock threshold (e.g. default 5 units) in Settings, with rows below that threshold visually flagged (badge/highlight color, using the gold/warning tone).

Search/filter by category or stock status (e.g. "show only low stock").

4.5 Content — Banners, Announcement Bar & Video

Announcement Bar: on/off toggle, message text editor (supports multiple messages), background color picker, text color picker, live preview of the bar as changes are made.

Hero Carousel (Home page): manage exactly 3 slide slots — each with image upload/replace, eyebrow label, headline, subtext, CTA text, CTA link, an on/off toggle per slide, and drag-to-reorder (or up/down buttons) — live preview of the current slide styling.

Category Banners: one management block per category (Glasses, Lenses, and any future categories added in 4.3) — image upload/replace, overlay text, CTA text/link, independent of one another.

Warehouse Video:

A field to paste a YouTube video URL.

A separate, clearly-labeled "Locked Channel" setting (treated as a more sensitive, less-frequently-changed setting, e.g. in its own small sub-section with a confirmation step to change it) — this stores which single YouTube channel is authorized.

Validation rule: whenever admin submits a new video URL, the system checks the video's channel against the locked channel setting. If they match, the video updates live on Home/About. If they don't match (or the locked channel isn't set yet), show a clear inline error (e.g. "This video isn't from the approved channel and wasn't published.") and do NOT change the live video.

If no channel is locked yet, the video field can still be filled in but should clearly explain it won't go live until a channel is locked, keeping the public-facing video section as a neutral placeholder in the meantime.

4.6 Testimonials

Table/list of testimonials with Add/Edit/Delete, fields: Customer name, Quote text, Star rating (optional, 1–5), Photo (optional), and drag or up/down reordering to control display order on the Home page.

4.7 Settings

Store name, logo upload, WhatsApp number, contact email, contact phone, address, business hours — every one of these should actually drive the corresponding text across the public site (navbar/footer brand name, footer contact block, WhatsApp button links, Contact page details) rather than being a disconnected settings form.

Low-stock threshold number field (used by Inventory).

Admin login credential management (change password) if feasible within the mock-data setup.

5. Data & Structure Requirements

No real backend/database yet — see Section 1's note. Use clean, typed mock data (e.g. TypeScript interfaces/types for Product, Variant, Category, Order, HeroSlide, CategoryBanner, AnnouncementSettings, Testimonial, StoreSettings) so the shape of the data is explicit and easy to later map onto real database tables.

Relationships to preserve even in mock form:

Category → many Products.

Product → 0 or more Variants (each Variant has its own image + stock).

Product/Variant → Inventory record (stock count, computed status).

Order → references a Product (and Variant if applicable) + source + status.

Category → its own single CategoryBanner.

One global set of exactly 3 HeroSlides for Home.

One global AnnouncementSettings object.

One global StoreSettings object (WhatsApp number, contact info, thresholds, branding).

All admin edits should update this shared in-memory data source immediately and reflect on the public storefront in the same session without needing a manual refresh.

6. Overall Quality Bar

Consistent spacing, color usage, typography, button styles, and card styles across every single page — storefront and admin alike — so it feels like one cohesive, professionally designed product, not several mismatched screens.

No visible Lorem Ipsum — use realistic eyewear/lens-related sample copy throughout so the demo looks genuinely ready to show a client, while every piece of it remains editable from admin.

Thoughtful empty states everywhere data could be missing (no orders yet, no products in a category, no variants on a product, no video set) — written in a helpful, on-brand tone, never a raw blank screen or console error.

Handle basic error/edge cases gracefully: form validation errors, an invalid YouTube link/wrong channel, deleting a category that still has products, an out-of-stock product's CTA state (e.g. disable/relabel the WhatsApp button or clearly show "Currently unavailable").

Fast, smooth, and visually polished across desktop, tablet, and mobile — this should look and feel like a real, launch-ready premium eyewear brand's website, not a rough prototype.

Demo content to seed on first build:

Categories: "Glasses" and "Lenses".

4–6 demo products spread across both categories, realistic names/prices/descriptions, at least one product with color variants (e.g. a frame available in Black and Blue, each with its own image and stock count).

3–4 demo testimonials with realistic names and quotes.

Announcement bar: ON by default, jet-black background, off-white/gold text, 1–2 sample scrolling messages.

3 hero carousel slides for Home, each with placeholder premium eyewear imagery, headline, subtext, and CTA — clearly editable.

One category banner for "Glasses" and a different one for "Lenses," placeholder imagery/text, clearly editable.

Warehouse video section left as a neutral "coming soon" placeholder until a channel is locked and a video URL is added in admin.

A few sample orders already in the Orders table (mix of WhatsApp and Contact Form sources, mixed statuses) so the admin panel doesn't look empty on first login.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://optical-boutique-build.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c319ec25-fdf4-4769-bf1f-23fc29e588e3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
