# Loading Performance Audit - 2026-10-07

## Verified Fixes

The performance changes below were implemented and tested on a fresh production build. The original measurements remain below as the baseline.

- Initialize public storefront state from the existing sanitized server cache, so real content is present in SSR and matches the first browser render.
- Skip the redundant initial browser storefront request when a complete server snapshot is available. Client retries and realtime subscriptions remain active.
- Preload the authoritative first catalog page for Glasses, Lenses and category URLs. Product totals, sorting, filters and pagination still use the database RPC.
- Reserve category banner dimensions before its image loads.
- Serve the existing Inter and Poppins fonts locally as WOFF2, with Latin/extended-Latin subsets and their open-source licenses. Preload the main text font and remove the external render-blocking Google Fonts stylesheet.
- Load browser monitoring separately when a Sentry DSN is configured. The main JavaScript entry decreased from approximately 515 KiB to 326.8 KiB uncompressed (about 36.5%). This is an entry-file comparison, not a reduction in every page's complete JavaScript payload.

### Final Mobile-Size Measurements

Same 390 x 844 browser viewport and observation method as the baseline, without CPU/network throttling. The server was warmed by functional verification before this run; browser contexts were fresh, while upstream caches could be warm.

| Page | Baseline LCP | Final LCP | Final CLS |
| --- | --- | --- | --- |
| Home | 2.37-4.36 s | 1.43 s | 0.0002 |
| Glasses | 3.26-3.90 s | 1.30 s | 0 |
| Lenses | 2.23-3.90 s | 2.34 s | 0 |
| Product detail | 2.74 s | 1.26 s | 0 |
| Cart, empty | 0.93-1.08 s | 1.71 s | 0 |
| Checkout, empty | 1.05-1.11 s | 0.84 s | 0 |
| About | 1.52 s | 0.92 s | 0 |
| Contact | 0.99 s | 0.99 s | 0 |
| FAQs | 1.15-1.34 s | 1.50 s | 0 |
| Blog | 2.10 s | 1.43 s | 0 |
| Order confirmation | 1.19 s | 0.81 s | 0 |
| Missing page / 404 | 1.12 s | 0.47 s | 0 |

All twelve final samples met the 2.5-second LCP target and had zero duplicate browser storefront API requests, zero uncaught page errors, zero observed completed broken images and no document horizontal overflow. Not every page became faster: loading real data before SSR adds server response time, and previously fast empty/static pages can vary or be slightly slower. The largest demonstrated improvement is stable first rendering and faster Home/catalog/product content.

### Final Desktop Spot Checks

| Page | Final LCP | Final CLS |
| --- | --- | --- |
| Home | 1.36 s | 0.0130 |
| Glasses | 2.00 s | 0.0011 |
| FAQs | 1.25 s | 0.0011 |

Desktop checks also recorded no uncaught errors, observed completed broken images or horizontal document overflow. Mobile and desktop screenshots were captured and inspected.

### Functional Verification

- `npm run check`: passed TypeScript, ESLint and final production build.
- `npm test`: 129 tests passed, zero failures. These regression tests ran after the data-rendering changes; subsequent local-font changes passed the final build/browser checks.
- With JavaScript disabled, Glasses rendered actual products and the accurate 36-product total in the initial HTML.
- Browser sorting and next-page pagination requested authoritative results and showed items 13-24.
- A persisted populated cart restored the checkout form and selected product. No order was submitted.
- FAQ search remained interactive. New fonts returned HTTP 200 with `font/woff2`.

### Remaining Measurement Limits

These are local short-run results, not live PageSpeed scores, physical-device mobile tests, INP measurements or 75th-percentile real-user results. A preliminary fresh-server run before the local-font change recorded a slow first homepage response: TTFB 12.88 seconds, LCP 14.10 seconds. That startup outlier is preserved in `node_modules/.cache/performance-audit/intermediate-mobile-results.json`; the final warmed-server numbers do not prove deployment cold-start performance is resolved. Live hosting and cold-start measurements remain necessary after deployment. No deployment was performed.

Final raw results: `node_modules/.cache/performance-audit/after-mobile-results.json` and `after-desktop-results.json`. Screenshots and the functional verification script are in the same temporary directory.

The final background preview was restarted and checked separately: its first homepage HTTP response had TTFB 3.44 seconds and its second response 0.26 seconds, both HTTP 200. This confirms the remaining startup penalty on this machine; it is not a browser LCP measurement. The preview is available at http://localhost:3100.

## Measurement Scope

Measured the existing local production build at http://localhost:3100 using headless Microsoft Edge. Public Supabase data, images, fonts, and analytics were loaded over the network. Mobile-size viewport: 390 x 844. Desktop viewport: 1440 x 900. Each page used a fresh browser context; no CPU or slow-4G throttling was applied. The server and upstream caches were not reset between runs. Observations ended five seconds after the load event.

These are short browser measurements, not Lighthouse scores or real-user Core Web Vitals results. The existing build was used without rebuilding. INP was not measured because no user interactions were performed. Mobile-size testing does not emulate a physical mobile device or its CPU.

Live testing of the configured default URL, https://www.nigah.store, encountered a Vercel Security Checkpoint. Google's public PageSpeed API returned HTTP 429 (quota exceeded). Lighthouse failed twice with NO_NAVSTART. No live performance score can be claimed from these attempts.

## Mobile-Size Results

LCP indicates when the largest visible content painted, not when every asset finished downloading. Ranges show the two observed runs, not a statistical estimate.

| Page | Observed LCP | Interpretation against 2.5-second target |
| --- | --- | --- |
| Home | 2.37-4.36 s | Variable; one run exceeded 4 seconds |
| Glasses | 3.26-3.90 s | Above target in both runs |
| Lenses | 2.23-3.90 s | Variable; currently an empty product listing |
| Product detail | 2.74 s | Slightly above target; one product tested |
| Cart | 0.93-1.08 s | Fast empty-cart state |
| Checkout | 1.05-1.11 s | Fast empty-bag state; checkout form not tested |
| About | 1.52 s | Within target in this run |
| Contact | 0.99 s | Within target in this run |
| FAQs | 1.15-1.34 s | Within target; substantial layout movement |
| Blog | 2.10 s | Within target in this run |
| Order confirmation | 1.19 s | Direct page visit without a completed order |
| Missing page / 404 | 1.12 s | Within target; correct HTTP 404 |

First contentful paint ranged from 0.63 to 1.84 seconds in the initial twelve-page run. No uncaught page errors or completed broken image loads were observed. This does not establish that every request succeeded or every image loaded.

## Layout Stability

Repeat measurements used standard CLS session windows (one-second gaps, maximum five-second window). The initial run used a cumulative sum and its layout values are excluded from this table.

| Page | Mobile-size CLS |
| --- | --- |
| Home | 0.932 |
| Glasses | 0.755 |
| Lenses | 0.389 |
| FAQs | 0.933 |
| Cart | 0.188 |
| Checkout | 0.177 |

All six exceed the recommended 0.1 target. Home, Glasses, Lenses, and FAQs exceed the poor threshold of 0.25. Layout stability is a priority even on pages that paint quickly. These short observations are not full-session field metrics.

## Desktop Spot Checks

| Page | LCP | CLS |
| --- | --- | --- |
| Home | 3.18 s | 0.933 |
| Glasses | 1.74 s | 0.358 |

The homepage product section still showed "Loading products..." at the observation endpoint in the desktop run. LCP alone does not establish that all sections are ready.

## Evidence And Priorities

1. Stabilize layout while remote settings, catalog data, and FAQ content replace initial content. High layout shifts were reproduced. The exact shifting DOM elements still need attribution before choosing a fix.
2. Reduce the homepage data-to-content delay. In src/routes/index.tsx the Hero and other homepage sections wait for storefrontReady. In src/lib/store.tsx that becomes ready after fetchInitialSupabaseData finishes. The storefront API took approximately 0.48-1.89 seconds in sampled repeat runs.
3. Review initial JavaScript weight. The largest built JavaScript files are approximately 515 KiB and 268 KiB before compression. Bundle analysis is needed to select code-splitting changes.
4. Inspect remote image delivery. Sampled hero image requests took approximately 0.99-1.30 seconds on mobile-size tests. Google Tag Manager requests took approximately 0.75-1.08 seconds. These durations overlap and must not be added together as page load time.
5. Validate live mobile performance and a populated cart/checkout flow before calling the site performance-ready. No order was submitted and no admin workflow was exercised.

Raw browser observations and the temporary measurement script are in node_modules/.cache/performance-audit. Transfer-size totals exclude opaque cross-origin resources without timing permission, so they are not complete page-weight totals. Source code was not changed during the baseline audit; subsequent fixes are documented above.

Reference thresholds: https://web.dev/articles/vitals and https://web.dev/articles/lcp.
