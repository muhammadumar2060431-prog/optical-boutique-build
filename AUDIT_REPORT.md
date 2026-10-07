# Nigah Store Technical Audit

Latest image pipeline audit (2026-10-07): all admin media entry points were
reviewed and corrected, including slot-specific cropping, byte budgets, Storage
paths, upload/save coordination and proportional storefront rendering. All 126
unique remote image URLs decoded successfully. One existing hero image remains
above the new compression budget; deployment and authenticated live-write
verification are still required. See
[Admin image upload audit](IMAGE_UPLOAD_AUDIT_2026-10-07.md).

Latest performance update (2026-10-07): storefront SSR initialization, first-page
catalog preloading, stable banner dimensions, local fonts and conditional browser
monitoring were implemented. Final local mobile-size samples recorded Home LCP
1.43 s, Glasses 1.30 s and product detail 1.26 s, with nearly zero layout shifts.
Full checks and 129 regression tests passed. Live and deployment cold-start
performance are not certified by these local results. See
[Performance audit and verification](PERFORMANCE_AUDIT_2026-10-07.md).

Date: 2026-09-29

## Result

The application passes TypeScript, ESLint, automated tests, production build,
dependency security audit, dead-code analysis, route crawling, API smoke tests,
and desktop/mobile layout checks. The production build is running locally at
`http://localhost:3000`.

No audit can guarantee that a third-party service or future change will never
fail. The checks below cover the current code, current Supabase data, and the
current local production artifact.

## Security And Admin

- Admin pages now wait for a verified Supabase session and `is_admin()` result.
- Login, one-time signup, security-question recovery, and credential changes
  use server-only endpoints. The service-role key and answer pepper never enter
  the browser bundle.
- Security answers are salted and hashed. The database table has RLS enabled
  and grants access only to `service_role`.
- `is_admin()` requires membership in both `admin_users` and
  `admin_security_profiles`, so the older unprofiled admin record cannot enter.
- Failed bootstrap setup rolls back a partially inserted security profile.
- Unsupported GET requests to signup, recovery, and credential endpoints now
  return structured JSON `405 Method Not Allowed` responses.
- Protected order reads return `401` without a valid admin token.
- CSP, clickjacking protection, MIME protection, referrer policy, permissions
  policy, and HTTPS HSTS behavior are covered by automated tests.

## Database And Content

- Remote counts checked: 38 products, 2 categories, 5 collections, 2 hero
  slides, 6 brands, 8 orders, 3 queries, and 2 subscribers.
- Admin security state checked: 2 legacy `admin_users` rows and 1 enrolled
  security profile. Only the profile-linked user passes the new admin function.
- Product integrity checked: no duplicate slugs, missing primary images,
  negative prices, or negative stock values.
- All 100 unique remote product image URLs responded successfully.
- Public catalogue tables are readable; private order, query, subscriber, and
  admin tables did not expose rows through the anonymous Supabase client.

## Routes And SEO

- All 51 sitemap URLs returned `200` locally.
- Unknown website, API, and admin paths return real `404` responses.
- Legacy `/faq`, `/refund-policy`, and `/terms-of-service` URLs return `307`
  redirects to their canonical routes.
- Sitemap, robots.txt, canonical URL helpers, and default site URL use
  `https://www.nigah.store`.
- Courier destination websites were checked. Trax timed out in the external
  checker, so its third-party availability cannot be guaranteed by this app.

## Cleanup And Optimization

- Removed 37 unused source files, including unused UI components and an obsolete
  image-check script.
- Removed 29 unused direct packages and 73 resulting transitive packages.
- Reduced unused exports and deleted unused helpers/imports.
- Enabled strict unused local/parameter checks in TypeScript and ESLint.
- Added Knip configuration for Supabase Edge Function and CLI deployment files.
- Production dependency audit reports 0 known vulnerabilities.
- The main client chunk remains about 591 KB minified (188 KB gzip). This is a
  performance warning, not a correctness failure, and is the main remaining
  code optimization opportunity.

## Verification Evidence

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test`: 15 tests passed, 0 failed
- `npm run build`: pass for client, SSR, and Nitro server
- `npm audit --omit=dev`: 0 vulnerabilities
- `npx knip --reporter compact`: pass
- `git diff --check`: pass
- Production smoke test: homepage `200`, missing page `404`, protected orders
  `401`, unsupported admin API GET requests `405`
- Exact 390px browser emulation: no horizontal document overflow; mobile cart
  and menu controls remain inside the viewport.

## Required External Actions

1. Rotate the Supabase service-role key before public deployment because it was
   visible in screenshots/chat. Prefer the current Supabase secret key format.
2. Do not casually change `ADMIN_SECURITY_PEPPER`: existing recovery answers
   depend on it. Rotate it only together with a controlled answer re-enrollment.
3. Replace the exposed setup secret. Bootstrap is already closed by the existing
   profile, but the old value should still be retired.
4. Add all production variables to Vercel, including Supabase public keys,
   server-only service key, admin secrets, site URLs, and allowed origins; then
   redeploy. Never give server-only values a `VITE_` prefix.
5. Add a Sentry DSN in Vercel if production error monitoring is required.
6. Run `npx supabase login`, then repeat remote migration history and database
   lint checks. The current CLI session returned `401 Unauthorized`; application
   REST/RLS probes succeeded independently.
7. After identifying the two admin records in Supabase, remove the obsolete
   unprofiled row for data hygiene. It is not currently authorized.
