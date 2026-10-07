# Admin Image Upload Audit

Date: 2026-10-07

## Result And Scope

Audited every `ImageUpload` integration in Products, Categories/Collections,
Content, Settings, Blog and Testimonials, plus the shared customer-review
uploader. Reviewed selection, decoding, cropping, compression, Storage uploads,
database saves, cache refresh and storefront presentation.

The corrected local pipelines passed browser checks. This is not a certification
of an authenticated upload on the deployed website. No live database records or
Storage objects were changed by this audit.

## Image Contracts

Dimensions below are maximum export dimensions. Small originals are not enlarged.
Compression may reduce dimensions further to meet the encoded-byte budget.
Input files must be JPEG, PNG, WebP or AVIF and at most 10 MiB; Storage accepts
processed files up to 5 MiB. SVG and other formats are rejected explicitly.

| Slot | Crop Ratio | Maximum Pixels | Output Budget | Storage Folder |
| --- | --- | --- | --- | --- |
| Product primary, hover, new arrival | 1:1 | 800 x 800 | 200 KiB | products |
| Product gallery | 1:1 | 500 x 500 | 200 KiB | products |
| Product variant | 1:1 | 600 x 600 | 120 KiB | products |
| Category icon, both admin entry points | 1:1 | 400 x 400 | 100 KiB | categories |
| Category banner | 2:1 | 1200 x 600 | 250 KiB | categories |
| Collection banner | 2.4:1 | 1200 x 500 | 250 KiB | collections |
| Hero slide | 2:1 | 1920 x 960 | 300 KiB | hero |
| Brand logo | Original | 420 x 140 | 50 KiB | brands |
| Store logo | Original | 400 x 120 | 80 KiB | settings |
| Reel thumbnail | 9:16 | 480 x 854 | 150 KiB | reels |
| Blog cover | 16:9 | 1600 x 900 | 350 KiB | blog |
| Blog inline image | 16:9 | 1400 x 788 | 300 KiB | blog |
| Admin review screenshot/photo | Original | 1200 x 1600 | 300 KiB | testimonials |
| Customer review attachment | Original, no crop dialog | 600 x 600 | 200 KiB | testimonials, server upload |

All admin uploads use the `optique-images` bucket. Filenames use secure random
IDs, the extension matches the actual encoded MIME type, and existing objects
are not overwritten. Folder segments are sanitized. Removing an image clears
its record reference; it does not delete a potentially shared Storage object.

## Fixes

- Remote images are converted to readable local bytes before canvas cropping.
  CORS-readable images use browser fetch; configured public Storage images have
  a same-origin proxy fallback. Unsafe hosts, private buckets and redirects are
  rejected by the proxy.
- Crop aspect ratios now match each slot instead of using one square adjustment
  for every media type. Logos and screenshots preserve their natural ratio.
- New uploads open the crop dialog before processing; adjustment is available
  across admin media slots. Saving at 1x still exports the selected crop.
- Crop exports are bounded by the slot dimensions before PNG encoding, reducing
  intermediate canvas memory. Zoom/reset/cancel and visible decode/crop errors
  are supported. Closing during crop export is blocked.
- Transparent canvas pixels remain transparent. The optimizer enforces encoded
  size budgets by adjusting quality and, if necessary, dimensions.
- Collection banners and category icons previously used generic `uploads`
  paths/default sizing. Their folders, ratios and resolutions are now explicit.
- Product primary/hover/new-arrival dimensions, reel dimensions and store-logo
  bounds now match their intended slots.
- Shared upload callbacks use the current form state. Duplicate drops and remove
  actions during an upload are blocked. Multiple upload slots share a busy
  counter so one completion cannot prematurely unlock Save.
- Manual record saves wait for uploads and database confirmation. Brand,
  category, collection, reel and testimonial failures return an unsuccessful
  result instead of silently reporting success. Failed manual saves retain
  their draft; category banner autosaves retain a local draft while waiting.
- Category and individual hero mutations are queued per record. Storage failure
  no longer falls back to embedding base64 in hero/brand/reel/settings records.
- Successful content saves request storefront cache invalidation.
- Image-only category banners and hero slides were subsequently restored to the
  user's full-frame reference layout to remove black letterboxing. Category
  uploads retain the 2:1 crop, 1200 x 600 maximum dimensions and 250 KiB budget;
  their desktop display remains full-width with a 440px height cap.
  Collection banners were subsequently
  restored to the user's reference layout: full section width, rounded corners,
  and the original desktop height bounds, with the complete artwork filling the
  frame. Review proof thumbnails contain the full screenshot.
- Uploaded store logos now also appear in the footer and admin navigation, with
  a fallback for a failed logo URL.
- Customer review attachments are optimized locally and submitted to the review
  API for server upload; they no longer require an admin Storage session.

## Remote Asset Evidence

Read-only image-field queries covered 40 products (including unpublished
records), 2 categories, 5 collections, 1 hero slide, 5 brands, 3 reels,
1 settings record, 1 testimonial and 0 blog posts.

All 126 unique remote image URLs returned successful responses and decoded.
None exceeded Storage's 5 MiB limit. The checked product images are square.

The existing hero image is 1618 x 809 pixels and 994,620 bytes (about 971 KiB).
It exceeds the new 300 KiB hero budget. It was not rewritten remotely. Saving
it through the corrected hero uploader will create a compressed replacement.
The new compression settings do not retroactively change existing files.

Raw evidence is in `.tmp/admin-image-audit/remote-assets.json`; it contains image
URLs and image-field locations, not credentials or customer contact data.

## Verification

Final local results: TypeScript, ESLint, production build and `git diff --check`
passed. All 130 Node tests passed with zero failures. The 26 profile checks,
20 isolated Storage requests and six storefront layout checks passed.

- TypeScript and ESLint checks.
- Production client, SSR and Nitro build.
- 130 passing Node regression tests, including a new compression-budget test.
- 26 browser profile checks: 13 media profiles at 1440 x 900 and 390 x 844.
- Browser assertions for output ratios, pixel/byte bounds, transparent pixels,
  cancel behavior, modal framing, 2.5x zoom, invalid/corrupt files, latest form
  state, expired sessions and CORS-fallback adjustment.
- 20 isolated Storage requests across both viewports: nine folders plus one
  rejected upload per viewport. Paths, encoded MIME types, failure feedback and
  retention of the previous image were checked. These requests were mocked and
  did not write to live Storage.
- Real proxy read of a configured public Storage image, and rejection of an
  unconfigured local-network host.
- Six read-only storefront browser checks: Home, Glasses and Lenses at both
  viewports, with loaded image checks, no stretched main images, no horizontal
  document overflow and screenshots.

Browser evidence and screenshots are in `.tmp/admin-image-audit/`.

Reproduction uses the local Vite server and the existing audit Playwright
installation in `.tmp/browser-tools`. If that disposable installation is
missing, run `npm install --prefix .tmp/browser-tools playwright` first.

```powershell
npm run dev -- --port 8082
node --env-file=.env verify-admin-image-assets.mjs
node verify-admin-images.mjs
node verify-admin-image-display.mjs
npm run typecheck
npm run lint
npm test
npm run build
```

## Deployment Follow-Up

Deploy the code, then verify an authenticated admin upload, record save and
reload on the deployed site. Re-save the oversized existing hero through the
new uploader. Live permissions, deployed environment configuration and a real
authenticated write were not certified by the local/mock checks above.
