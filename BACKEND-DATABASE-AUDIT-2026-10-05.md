# Backend, Database and Scalability Audit

Audit date: 2026-10-05 UTC. Reviewer: Codex. Scope: current working tree and configured live Supabase/Redis services.

## Executive Assessment

The project already has a substantial backend: Supabase PostgreSQL, authentication, row-level security, versioned server APIs, persistent checkout idempotency, Upstash Redis caching, rate limiting, Storage image delivery, email webhooks, migrations and automated verification.

The immediate need is to correct production privacy, checkout/inventory correctness and deployment gaps, then improve database-side data loading and background-job reliability. Replacing PostgreSQL or adding a large collection of services is not justified by the current workload evidence.

Verified live business data is small: 38 products, 12 orders, 4 inquiries and 2 subscribers. These counts do not establish concurrent-user capacity. No production load test was performed.

**Release assessment:** important privacy and correctness issues remain. Passing local tests does not establish that the same fixes are deployed.

## Method and Boundaries

- Inspected database schema, all 23 migration files, database audit utilities, backend API handlers/contracts, authentication/recovery, cache/invalidation, database synchronization, checkout/inventory callers, Storage/image handling, email functions, monitoring and CI configuration.
- Queried live PostgreSQL metadata through the Supabase Management API in read-only transactions: tables, policies, privileges, functions, constraints, indexes, triggers, extensions, migration history, statistics, connection settings, publication membership and a tracking query plan.
- Read the 21 application tables and Storage metadata using existing read-only auditing code. Reports retain counts and asset references, not customer records or secret values.
- Checked anonymous visibility separately: service-role access bypasses RLS and cannot prove public isolation.
- Checked live Auth configuration, MFA factor counts, backup availability and email function status.
- Used Redis PING and GET only; did not submit test jobs or change cache values.
- Checked referenced Storage assets with HTTP HEAD. Rechecked the one initial timeout successfully.
- Ran the existing test suite, typecheck, lint, production build and dependency audit. Scanned 110 generated browser text assets for six configured private secret values: zero matches. No `.env` file was tracked by Git in the checked filenames.
- No live business data, database policy, Auth setting, Storage object or deployed application was changed. Existing user edits were preserved. Local build/audit artifacts and this report were generated.

This is an evidence-based audit, not a claim of 100% security or capacity. Production app requests were blocked by Vercel, and authenticated production UI workflows and load/failover/restore exercises remain unverified.

## Verified Inventory

| Area | Evidence | Status |
| --- | --- | --- |
| Database | Supabase PostgreSQL; 21 public application tables | Live |
| Backend | TanStack Start, Nitro, TypeScript, `/api/v1/*` routes | Present locally; deployed version unverified |
| Database access | `@supabase/supabase-js`, PostgREST and RPC calls | Present; no Prisma/Drizzle/direct SQL driver required by current design |
| RLS | Enabled on all 21 public application tables | Live |
| Admin authorization | `is_admin()` checks both admin allowlist and security enrollment | Live definition verified |
| Indexes | 83 public indexes; 103 including Storage; no invalid/not-ready public indexes | Live |
| Constraints | 54 public constraints, including FK/check/PK/unique constraints | Live; four remain NOT VALID |
| Money types | Product prices and order totals are `NUMERIC(12,2)` | Live |
| Checkout idempotency | Durable request hash/response table and order relationship table | Live; browser retry handling has a gap |
| Checkout abuse limit | Database-backed per-key minute counter | Live |
| Redis | Upstash credentials present; PING returned PONG; revision and cached storefront found on second probe | Live reachable; deployed app use not proven |
| Storefront caching | 120-second Redis cache, revision invalidation, within-process cold-fill sharing | Present locally |
| Submission throttles | Redis limits for contact; shared Redis throttles for review/subscriber/tracking routes | Present locally; endpoint bypasses remain live |
| Browser caching | Public projections; private orders/inquiries/subscribers excluded from persisted public cache | Present locally and covered by tests |
| Storage | Public `optique-images`; admin write policies; 5 MB limit; JPEG/PNG/WebP/AVIF allowlist | Live |
| Image handling | Optimization helpers, responsive image renderer URLs, UUID asset paths, long upload cache lifetime | Present locally; live renderer behavior not exercised in this run |
| Realtime | 15 public tables in `supabase_realtime` publication | Live; broad client subscription exists |
| Email | `pg_net`, Vault extension, three INSERT notification triggers, active `resend-emails` Edge Function | Live plumbing; delivery and deployed function source unverified |
| Durable job queue | No `pgmq` extension/metadata; no BullMQ/RabbitMQ/SQS application integration found | Missing from inspected setup |
| Scheduled DB jobs | No `pg_cron` extension or `cron.job` table | Missing in live DB; external schedules unverified |
| Search | Product/customer searches largely filter loaded arrays in the browser | No implemented database FTS/trigram search found |
| Diagnostics | `pg_stat_statements`, structured server logging, request IDs, timing headers | Present |
| Sentry | Installed and server wiring exists; enabled only when DSN supplied | DSN absent from local `.env`; production setting unverified |
| CI | Typecheck, lint, tests, build; separate dependency audit workflow | Configured; remote execution not verified |
| Provider backups | Management endpoint returns empty backup list and PITR false | Recovery gap |
| Local backup | Encrypted application rows and Storage export with existing verification artifacts | Exists; not a full PostgreSQL/Auth recovery |

## Findings, Ordered by Priority

### F01 - High: Customer Review Email and Admin Email Are Publicly Readable

**Live evidence:** anonymous `SELECT *` reads include `testimonials.email` and `store_settings.admin_email`; `has_column_privilege` returns true for both. Public store phone/address/contact email are expected storefront fields and are not classified as this issue.

The application strips private fields from its public payload, but a caller can access the database REST endpoint directly. Local migration `supabase/migrations/20261002020000_private_contact_columns.sql` contains the intended restriction; its private-read RPCs are absent from the retrieved live function list.

**Action:** deploy compatible public column projections and authenticated private-read paths, then apply the privacy migration preserving stored email values. Verify anonymous column denial and real admin read/write behavior. Application projection alone cannot close this database exposure.

Evidence: `.tmp/database-audit/management-audit.json` (`privateColumnPermissions`); `.tmp/database-audit/scalability-live.json` (`effectivePermissions`); `src/lib/public-storefront.ts`.

### F02 - High: Live Database Entry Points Bypass API Abuse Controls

**Live evidence:** anonymous inquiry INSERT privilege is true and its INSERT policy allows valid rows. Anonymous EXECUTE remains enabled on `subscribe_email(text,text)` and `lookup_order_by_reference(text)`. These paths avoid the application's HTTP/Redis controls. Subscription can also trigger email work.

Anonymous order INSERT privilege is already false. A legacy order INSERT policy remains, but that policy alone does not permit inserts. Anonymous review INSERT privilege exists, but the retrieved policies do not authorize an anonymous INSERT; do not mistake that grant alone for an exploitable review write path.

**Action:** deploy service-backed contact/subscription/tracking endpoints, then apply `20261005150000_server_only_public_submissions.sql`. Confirm both grants and RLS/RPC behavior, including admin/service access. Keep a consistent trusted-proxy IP extraction policy across handlers.

Evidence: live `effectivePermissions`, `policies`, `functions`; `src/lib/api/engagement.server.ts`; `src/lib/api/orders.server.ts:261`.

### F03 - High: Order Status and Stock Are Not Updated Atomically

`setOrderStatus` saves order status/`stockDeducted` first, then changes stock using browser state and separately upserts the full product. The stock upsert result is not awaited there. Two admin sessions can overwrite each other's stock or product edits; a failed stock write can leave an order marked deducted without an actual deduction.

The browser mutation queue serializes operations only within one client context. It does not coordinate different admins, devices or server instances. Clamping stock to zero can conceal insufficient inventory.

**Action:** implement one server-authorized PostgreSQL transaction/RPC for the business transition. Lock or conditionally update the relevant inventory rows, check available quantity, change stock and order state together, and return authoritative rows. Make repeated transitions idempotent and define cancellation/restoration behavior.

Evidence: `src/lib/store.tsx:1287`, `:1303`, `:1390`; `src/lib/api/orders.server.ts:225`; `src/lib/mutation-queue.ts`.

### F04 - High: Structured Quantity, Monetary Snapshots and Server Stock Checks Are Missing

Checkout sends quantity and line cost inside a free-text message. Its order contract has no structured quantity/unit price. The live checkout function stores `total = 0`, accepts client product labels and does not lock/check current product availability, variant membership or stock. A product FK establishes existence, not that it is enabled or that a variant belongs to it.

All 12 current orders have zero database totals. Completion deducts one unit per order row, even when its checkout message describes multiple units. Financial reporting and accurate inventory are therefore limited by the order model.

**Action:** create structured order lines containing product/variant IDs, quantity and server-calculated price snapshots. Store order totals/currency and separate contact/delivery fields. Decide whether stock is reserved at checkout or deducted at confirmation; enforce that rule transactionally. Preserve historic messages rather than guessing amounts from text without review.

Evidence: `src/routes/checkout.tsx:172`, `:181`; `src/lib/api/contracts.ts`; `supabase/migrations/20260925120000_api_v1_orders.sql`; live `functionBehavior` and `integrityAndOrderValues`.

### F05 - High: Browser Retries Can Conflict with Persistent Idempotency

Checkout keeps one idempotency key in a ref. Each `addOrders` call regenerates order IDs, and the server hashes the entire input. If the first database commit succeeds but the response is lost, resubmission uses the same key with different IDs and can produce `IDEMPOTENCY_CONFLICT`. The browser helper also reduces the server result to a boolean instead of reconciling persisted/replayed order IDs.

**Action:** retain one stable validated payload per checkout attempt, reuse it for retries, and consume the authoritative replay response. Generate a new attempt key when the intended order changes. Add coverage for a committed request with a lost response and a subsequent retry.

Evidence: `src/routes/checkout.tsx:89`; `src/lib/store.tsx:1361`; `src/lib/supabaseSync.ts:935`; `src/lib/api/order-handlers.ts:56`.

### F06 - High: Full Disaster Recovery Is Not Established

The live backup API reports `pitrEnabled: false`, region `ap-northeast-1`, and no available backups. This proves no backups were exposed through that endpoint at audit time; it does not prove every provider-internal copy is absent.

Two local backup summaries exist. The latest completed at `2026-10-05T17:50:15.468Z`, covering 21 tables and 1,271 Storage objects. It reports readable encrypted files and `fullDatabaseRestoreVerified: false`. The script exports application rows and object bytes, not a complete schema/Auth/role/extension backup. Its decryption key depends on the Windows CurrentUser DPAPI profile.

**Action:** establish managed backup availability/PITR according to the acceptable recovery window, separate off-site Storage backups, portable encrypted key recovery and a scheduled restore exercise in a disposable database. Define RPO/RTO. Supabase database backups exclude actual Storage object bytes. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

Evidence: management audit `backups`; `backup-storefront.mjs`; `.tmp/backups/*/summary.json`.

### F07 - High Verification Gap: Production Requests Return Vercel 429

Read-only requests to `https://nigah.store/health` and `/api/v1/storefront` returned 429, `Server: Vercel`, HTML content and no Redis cache header. Existing project documentation identifies a Vercel Security Checkpoint; this run independently verifies the response status, not its internal rule configuration.

Local `VITE_SITE_URL` points to localhost and was unavailable during its separate probe; that connection failure is not evidence of a production database outage.

**Action:** inspect production firewall/checkpoint rules and deployment configuration, then verify real browser checkout/admin workflows and API timings. Do not disable protection globally merely to pass an audit. Production capacity cannot be concluded from blocked requests.

### F08 - Medium: Pagination and Filtering Mostly Happen After Loading Whole Datasets

`fetchInitialSupabaseData` performs roughly 11 public queries, or 14 including private datasets, with multiple `SELECT *` reads and no explicit page bounds. Category pagination slices loaded products. Admin order/inquiry/subscriber views similarly filter arrays. A paginated orders API exists, but the admin initializer directly loads orders instead of using that API.

Growth increases transferred data, browser memory and cold-cache DB work. PostgREST's configured maximum rows may also silently limit these unpaginated views; the live API row limit was not verified.

**Action:** move product/category/search and admin listing filters to database-backed APIs, return explicit projections and pages, and use stable cursors such as `(created_at, id)`. Calculate dashboard aggregates in SQL. Keep small settings/navigation/content payloads separate from a growing catalog.

Evidence: `src/lib/supabaseSync.ts:546`, `:582`; `src/lib/store.tsx:1175`, `:1202`, `:649`; `src/lib/api/orders.server.ts:201`; admin list routes.

### F09 - Medium: Redis Exists, but Cache and Outage Behavior Need Work at Scale

The local cache has 120-second TTL, revision invalidation and shared fills inside one server instance. It sanitizes old cache hits. Redis PING succeeded; the second read probe found a storefront payload of 73,433 bytes. The first probe found no current payload, which can be normal expiration/cold-cache behavior.

These are direct read probes, not deployed cache HIT/MISS tests. Their latency included several sequential network operations. Redis is reachable, but deployed hit ratio and regional latency remain unknown.

Multiple cold server instances can each fill the same cache. On Redis failure the application falls back to DB work; distributed abuse controls fall back to per-instance limits. Contact's dedicated Redis client does not have the explicit short transport timeout configured in the newer generic cache/rate-limit clients.

**Action:** measure cache HIT ratio/p95 timings; align service regions; add a distributed short-lived fill lock or stale refresh strategy if cold-fill bursts are observed; add explicit deadlines and bounded outage behavior consistently. Tie invalidation to confirmed database changes, and monitor invalidation failures.

Evidence: `src/lib/api/storefront-cache.server.ts:30`; `redis-json-cache.server.ts`; `contact-rate-limit.server.ts`; `distributed-rate-limit.server.ts`; live `redis`.

### F10 - Medium: Public API Responses Are Not CDN Cacheable

The API wrapper unconditionally sets `Cache-Control: no-store`, including public storefront GET responses. Redis reduces database reads but each request still reaches an application function. `vercel.json` selects TanStack Start, and production responses come from Vercel, but this does not establish public API edge-cache effectiveness.

**Action:** make cache policy route-specific. Consider short CDN caching with safe invalidation/stale behavior for strictly anonymous public catalog/content responses. First ensure public responses cannot vary with user credentials. Keep customer/admin/order/submission responses private/no-store. Vercel's CDN supports public response caching; `no-store` prevents it. [Vercel cache headers](https://vercel.com/docs/caching/cache-control-headers).

Evidence: `src/lib/api/http.server.ts:68`; `src/routes/api.v1.storefront.ts`; `vercel.json`.

### F11 - Medium: Async Email Plumbing Lacks a Durable Application Job Lifecycle

`pg_net` already dispatches asynchronous webhook requests. This is background HTTP plumbing, not evidence of an application queue with durable retry scheduling, delivery deduplication, failed-job handling and alerts. No `pgmq` or `pg_cron` installation was found. The Edge Function sends emails sequentially; its local Resend request has no explicit timeout or idempotency header. A send failure returns 502, but no application retry worker was found.

Meta conversion delivery is awaited in the checkout handler with an 8-second request timeout, increasing response latency after the order commits. Failures are logged without a durable replay path.

**Action:** use a transactional outbox plus **Supabase Queues (`pgmq`)** and an Edge Function/scheduled worker for email and Meta deliveries. Include event IDs, retries with backoff, visibility timeout, dead-letter handling, metrics and idempotent external delivery. Keep stock/checkout validation synchronous inside its transaction. PostgreSQL queues still add DB workload; size workers accordingly. [Supabase Queues](https://supabase.com/docs/guides/queues).

BullMQ is an alternative when a persistent worker and suitable Redis connection infrastructure are desired. The existing Upstash REST cache client is not a drop-in BullMQ worker connection; BullMQ connection/blocking requirements need separate configuration. [BullMQ connections](https://docs.bullmq.io/guide/connections).

Evidence: `supabase/functions/resend-emails/index.ts:49`; webhook migrations; `src/lib/api/order-handlers.ts:69`; `src/lib/meta-capi.server.ts`; live extensions/retentionJobs.

### F12 - Medium: Indexing Is Broad; Five Exact Duplicate Definitions Need Review

Live indexes include SKU uniqueness, normalized slug uniqueness, category/enabled/time composites, collection-array/details GIN indexes, normalized order-reference expression indexing and active-order/inquiry partial indexes. Indexing is already a strength.

Five pairs have equivalent nonunique definitions:

- `categories_sort_order_idx` / `idx_categories_sort`
- `idx_orders_created` / `orders_created_at_idx`
- `idx_orders_reference` / `orders_reference_idx`
- `idx_products_created_at` / `products_created_at_idx`
- `idx_products_slug` / `products_slug_idx`

There are also nonunique category-slug/subscriber-email indexes overlapping existing unique indexes. Constraint-owned and unique indexes must be preserved unless their ownership/behavior is explicitly addressed.

**Action:** inspect usage, dependency and write cost before retiring redundant nonunique indexes through reviewed migrations. Add new indexes only for real database predicates after implementing server filtering. Do not index every column.

The tracking EXPLAIN chose a sequential scan over only 12 rows. Its expression index exists and matches the lookup expression. This small-table plan is not evidence that the index is broken or should be forced. Historic sequence-scan counters are similarly not proof of poor performance. [Supabase index guidance](https://supabase.com/docs/guides/database/postgres/indexes).

### F13 - Medium: Database Search Is Not Implemented

Product name and subscriber/inquiry searches use browser `includes`/array filters. Existing slug/SKU/reference indexes help exact lookups, but cannot accelerate searches performed after loading all rows into the browser. No customer table or normalized customer search model was found.

**Action:** first add database query endpoints. Use exact indexed SKU/reference/ID lookups, normalized phone/email matching, PostgreSQL FTS for product text and `pg_trgm` GIN where substring/typo matching is actually needed. Trigram extension is not installed. Keep customer searches authenticated. Introduce Typesense/Meilisearch only if advanced relevance/facets justify another service. [PostgreSQL trigram indexing](https://www.postgresql.org/docs/current/pgtrgm.html), [Supabase full-text search](https://supabase.com/docs/guides/database/full-text-search).

### F14 - Medium: Every Storefront Client Opens a Broad Realtime Subscription

The store subscribes to all events in the public schema, and 15 application tables are published. Private row visibility is governed by RLS, but connection/message/authorization work still needs consideration as visitors grow.

**Action:** subscribe admin screens only to relevant private tables and enable public realtime only where live updates are required. Prefer public cache refresh/revalidation for routine catalog browsing. Measure concurrent sockets, reconnect bursts and message costs before expanding publication/subscriptions.

Evidence: `src/lib/store.tsx:824`; live `publications`; `src/lib/supabase.ts`.

### F15 - Medium: Admin MFA and Operational Monitoring Are Incomplete

Live Auth disables signup and anonymous accounts, requires a ten-character password and password-change reauthentication. Admin login has database-backed throttling. Security answers are locally salted/peppered PBKDF2 hashes, and recovery tokens are signed with expiry/nonce checks.

However, the live MFA table contains **zero verified factors**; security questions are not a second possession factor. Leaked-password checking is disabled in the returned Auth config. `/health` returns application status only, without checking Supabase/Redis. Local Sentry DSN is absent; hosted Sentry configuration and alert routing are unknown. Email function logs include recipient email addresses in local source.

**Action:** enroll admin TOTP MFA and enforce the required assurance level in privileged APIs/RLS; review recovery so it cannot bypass the intended MFA protection. Configure error/latency/DB/cache/queue alerts, privacy-safe logging and a separate dependency-readiness probe. Confirm hosted secrets/DSN via provider configuration rather than assuming local `.env` proves deployment settings.

Evidence: live `authConfig`/`authMfa`; `src/lib/api/admin-security.server.ts`; `admin-auth.server.ts`; `health-handler.ts`; `src/server.ts:16`; email function.

### F16 - Medium: Migration History Does Not Fully Represent Live Schema

There are 23 local migrations but only 15 logged live versions. Eight later migration filenames are unrecorded. Several of their effects, including admin enrollment checks, catalog deletion guards, FAQ placements and public draft restrictions, are demonstrably live. Therefore unrecorded does not mean unapplied. The privacy and server-entry-point restrictions remain absent based on independent live checks.

**Action:** reconcile definitions and migration history before using automated migration push. Record only verified-applied migrations and deploy missing migrations in compatible order. Compare the actual schema to canonical files; do not rerun historical migration effects blindly. CI currently validates the app but does not show a live migration drift gate.

Evidence: live `migrationVersions`; `.github/workflows/ci.yml`; existing `DATABASE-AUDIT.md`.

### F17 - Lower Priority: Data Modeling, Retention and Constraints Need Tightening

- Product variants are JSONB without per-variant foreign keys/check constraints. Order variant IDs cannot be protected by a normal FK to that JSON array. Collection links are arrays with custom validation triggers. Normalize variants and order lines first as stock/search requirements grow.
- Four constraints are NOT VALID: settings stock threshold, subscriber email shape, subscriber status and testimonial source. Existing rows were not fully validated by those specific constraints. NOT VALID still enforces future inserts/updates; it does not mean checks are disabled. The source constraint also overlaps a validated source check.
- `products.stock` is nullable. Define whether NULL is meaningful; otherwise backfill/review and enforce NOT NULL with variant-level quantity checks.
- Product mapping rounds price/compare-at to whole units despite decimal-capable database columns. Preserve two-decimal values when fractional PKR prices are part of the business requirements (`src/lib/supabaseSync.ts:179`).
- Idempotency responses, rate-limit buckets and login-attempt rows have no verified scheduled cleanup. Define retention windows that preserve retry/security requirements and minimize repeated PII in JSON responses.
- Reviews become publicly enabled immediately, though unverified; consider moderation and validate product publication before accepting attachments.
- Review images are uploaded before the review insert. An insert failure can leave an unreferenced object; use cleanup/registration and validate actual image bytes rather than only the declared MIME type.
- Full-product offline retries can overwrite newer data. Introduce version checks or targeted patches for conflicting admin edits.
- The local CSP permits inline scripts/styles. Review framework-compatible nonces/hashes when tightening XSS defenses; no exploitable injection was established by this audit.

## Live Data, Storage and Performance Observations

| Observation | Result | Interpretation |
| --- | --- | --- |
| Products | 38 total; 36 visible anonymously | Two drafts correctly excluded |
| Catalog/content | 2 categories, 5 collections, 3 slides, 5 brands, 3 reels, 1 testimonial, 23 FAQs | Small datasets |
| Customer datasets | 12 orders, 4 inquiries, 2 subscribers; anonymous reads return zero rows | Current private row reads are isolated |
| Admin allowlist/enrollment | 2 allowlisted accounts; 1 security profile | Live admin predicate requires both; no account was modified |
| Checked duplicates/orphans | Zero duplicate slug/SKU/email groups and missing checked parent links | Current data integrity checks pass |
| Product/variant stock and ratings | No negative checked product/variant stock, negative prices or invalid ratings | Does not prove concurrent update safety |
| Database size | 17,542,291 bytes total; 2,334,720 bytes across public table relations including their storage/indexes | No evidence of data-size pressure |
| Database connection limit | `max_connections = 60` | DB connections are not simultaneous users; leave provider capacity tuning evidence-based |
| Connection snapshot | 1 active, 18 idle, 1 other/background | Momentary sample only |
| Database settings | Autovacuum on; idle transaction timeout 0; audit statement timeout 15 seconds | Statement timeout was overridden locally by the audit transaction, so the inherited production default was not verified |
| Historic query statistics | Largest observed authenticator mean about 243 ms; many top entries categorized as introspection | No verified identification of the 243 ms entry as a customer query |
| Storage | 1,271 objects; 75,491,074 bytes; 4 over 1 MB; zero non-image MIME metadata | Delivery size/storage hygiene opportunities |
| Embedded images | Zero `data:image` strings in scanned DB rows | Images already externalized |
| Referenced assets | 124 unique references; zero missing objects; initial one HTTP timeout rechecked with 200 | No confirmed broken referenced asset |
| Unreferenced candidates | 1,147 relative to scanned current database rows | External/code/history references not fully audited this run; not a deletion list |
| Local tests | 83 passed; zero failures | Existing behavior checks pass |
| Typecheck/lint/build | All passed | Current local artifact builds |
| Dependency audit | Zero known vulnerabilities reported by `npm audit --json` | Does not replace application/security review |

Dead tuple estimates on these small tables are not customer records to delete. Autovacuum and real growth/query timing should guide maintenance; no manual purge/VACUUM FULL was performed.

## Recommended Technology and Implementation Order

| Order | Work | Technology/approach | Acceptance evidence |
| --- | --- | --- | --- |
| 1 | Close public email and API bypass gaps; unblock production verification | Compatible deployment + existing Supabase privacy/server-only migrations | Anonymous denied; real admin/service workflows succeed |
| 2 | Make checkout and stock reliable | PostgreSQL transactional RPC, structured order lines/quantity/price, stable idempotency | Multi-unit checkout; two simultaneous transitions; lost-response replay; cancellation consistency |
| 3 | Establish recoverability | Managed DB backups/PITR as needed; separate encrypted off-site Storage copies | Disposable full restore succeeds; documented RPO/RTO |
| 4 | Reduce data transfer and query load | Database pagination/projections/filtering, SQL dashboard aggregates | Large seeded catalog/admin views remain complete and bounded |
| 5 | Improve public caching | Existing Upstash Redis plus route-specific Vercel CDN caching | Verified MISS/HIT/invalidation and private-data exclusion |
| 6 | Add reliable background jobs | Supabase Queues (`pgmq`), transactional outbox, worker/scheduler | Retry, dedupe, failure alerts and drain/recovery tests |
| 7 | Add fast search and tune indexes | PostgreSQL FTS / `pg_trgm`; measured index consolidation | Query plans and timings on representative data |
| 8 | Harden operations | Admin MFA enforcement, Sentry/metrics/alerts, retention, restricted realtime | Auth assurance checks; actionable DB/cache/queue alerts |
| 9 | Determine scaling capacity | Staging load tests and deployed provider telemetry | Request-rate/concurrency report and cost estimate |

Keep Supabase/PostgreSQL and the current Redis cache. Vercel hosting and Supabase Storage already provide a basis for CDN delivery; adding Cloudflare is optional if its WAF/DNS/caching capabilities meet an identified requirement. No Cloudflare configuration was established by this audit.

The current application uses the HTTP Data API, not one direct PostgreSQL connection per visitor. Adding PgBouncer or switching to an ORM is not an automatic concurrency fix. Review the managed Data API pool and DB compute first. If persistent workers later use direct PostgreSQL connections, use a suitably sized pool and Supabase's appropriate connection mode. [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).

Read replicas, partitioning, sharding, Kafka and Redis Cluster should follow measured workload needs. Their installation would not correct the identified stock, privacy, retry or pagination issues.

## Required Capacity Verification

Use a staging clone with synthetic data and realistic product/order volumes. Exercise warm/cold catalog reads, searches, checkout replay, simultaneous stock transitions, admin lists and worker processing. Separate browsing concurrency from checkout throughput. Measure p50/p95/p99 latency, request rate, errors/429s, cache ratio, DB CPU/memory/IO/connections/lock waits and queue age/depth.

Test Redis unavailability, cold server bursts and external-provider delays. Define target latency/error budgets with the business before declaring a capacity number. Production stress testing was deliberately not performed during this read-only audit.

## Outstanding Verification

- Deployed application version, production environment variables, firewall settings and cache behavior after the current 429 responses are resolved.
- Real authenticated production login/MFA/save/delete/checkout workflows.
- Hosted compute plan, autoscaling/function concurrency quotas, read-replica configuration and billing limits.
- Redis region, retention/eviction/quota limits and sustained latency from the deployed application region.
- Actual Resend delivery, deployed function body/secrets and end-to-end retries/deduplication.
- Full PostgreSQL schema/Auth/roles/extensions and Storage restoration outside the current Windows profile.
- External backup schedules, monitoring dashboards and alert delivery.
- Full current-source/historical/external reference review before any Storage cleanup.
- Representative load/failure testing; no numeric simultaneous-user promise is supported by this run.

## Evidence Files

- `.tmp/database-audit/audit.json`: current counts, integrity results and Storage inventory; initial HTTP timeout retained, with successful recheck recorded in this report.
- `.tmp/database-audit/management-audit.json`: live catalog metadata, permissions, statistics and backup API result.
- `.tmp/database-audit/scalability-live.json`: effective permissions, function behavior, migration versions, types, settings, MFA, Redis and other read-only checks. Its `site` entries target the locally configured localhost URL; production `nigah.store` was checked separately.
- `.tmp/backend-audit-readonly.mjs`: additional reproducible read-only audit helper.
- Existing `DATABASE-AUDIT.md`: historical project findings and fixes, considered as context rather than substituted for new verification.

No findings in this report were automatically remediated or deployed. The report distinguishes verified live state, inspected local code, recommended improvements and checks that still require production access/testing.
