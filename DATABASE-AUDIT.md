# Database and Storage Audit

## Current Follow-up (2026-10-03 Asia/Karachi)

This section supersedes historical pending-status statements below. No live business record or original image was deleted.

- Live linked category/collection deletion guards and product collection-link validation are installed. Independent read-only verification found all three triggers enabled. Both catalog migrations verified unchanged fingerprints for all 21 public tables plus Storage objects before committing.
- Seven public content-read policies now restrict reads to enabled/published content, including signed-in non-admin users. Administrator policies remain intact. The isolated PostgreSQL tests cover administrator draft access and non-admin exclusion.
- Latest integrity checks: 38 products; zero missing category/collection/review links, duplicate product slugs, or negative price/stock values. Storage contains 1,264 objects after adding two optimized images. Private customer tables remain inaccessible to anonymous readers.
- Complete encrypted application-data/Storage export: 21 tables, 101 rows, 1,262 objects, 143 unique content blobs, 73,443,730 bytes. Snapshot stability and readability verified. Backup: `.tmp/backups/3b4ecfff-d781-42c0-b2c4-6ec7d6ba10b3`. A disposable local rehearsal verified all row payloads and restored file hashes. This is NOT a full PostgreSQL schema/Auth/PITR restore; full disaster-recovery verification still requires SQL connection access. The encryption key is bound to the current Windows profile via DPAPI.
- Two live hero images were losslessly optimized from 2,175,605 to 1,001,462 bytes and 2,160,227 to 994,620 bytes. Dimensions remain 1618 x 809; decoded pixel hashes match. Uploaded bytes and URL updates were verified; original PNGs are retained for rollback. Storefront Redis generation was refreshed.
- Local image fixes defer unvisited slides and hover images, stop off-screen carousel cycling, prioritize above-fold banners, preconnect Storage, fall back to original uploads on transform errors, and bypass unsupported AVIF transformations. Already-small uploads retain their original encoding when no resize is required. Banner layout heights are unchanged.
- Local browser-cache/auth fixes exclude private customer records, review/admin emails, drafts and disabled slides from public persistent cache; stale asynchronous session checks cannot restore a superseded session. These application changes are NOT yet production-deployed.
- Mobile/desktop Playwright checks passed: real assets render, no horizontal overflow, original-image fallback works, hidden slides are deferred, and touch does not request hover images. Local API Redis verification: MISS 3,226 ms, then HIT 406 ms and 265 ms. These are local development/network measurements, not production Core Web Vitals.
- Read-only slow-query aggregates and product EXPLAIN were inspected. The highest-cost sampled entries were metadata queries; the small product table's sequential scan is not evidence of a missing index. No speculative index removal/addition was performed.
- Current Storage scan found 1,142 database-unreferenced candidates, including the two retained rollback PNGs. No candidate is automatically classified as dead. External/static/previous-deployment use still needs proof and an approved exact deletion list.

### Remaining Release Gates

1. Deploy compatible frontend/API public projections, then apply `20261002020000_private_contact_columns.sql`. Direct anonymous review/admin email column access is still live-confirmed and pending; existing values must be preserved.
2. Configure SQL connection access locally for a full schema/Auth database dump and disposable full restore. No available platform backup/PITR was found; paid backup settings were not changed.
3. Verify production deployment and authenticated admin save/delete/linking/cache refresh end to end using approved test records. No production deployment credential or actual admin login session was available, and no customer records were used as write probes.
4. Review direct public order/contact/subscriber entry points for bypass of server-side abuse limits before tightening permissions; do not revoke permissions ahead of compatible deployment. Auth signup is disabled; native MFA was not enabled automatically.
5. Complete external-reference/retention review before any unused-file deletion. Duplicate bytes or absence of a current database reference alone is insufficient proof.

Verification: 66 tests, typecheck, lint and production build passed. The final scan found all 122 referenced assets, zero missing objects and zero failed public asset requests. Five configured private credential values were checked against 110 client files: zero exposures. Latest live read-only evidence is in `.tmp/database-audit/followup.json` and `.tmp/database-audit/audit.json`; browser checks are in `.tmp/image-verification/results.json`. Historical reports below describe earlier audit stages, not the current completion status.

## Live Permission Fix Verified (2026-10-03 Asia/Karachi)

The user applied `20261002030000_remove_legacy_public_storage_writes.sql` in the correct project's SQL Editor and ran the legacy-policy verification query, which returned zero rows. A subsequent independent read-only Management API check (`verify-permission-fix.mjs`) returned `verified: true`:

- Anonymous/public Storage mutation policies: 0.
- Broad non-admin ALL policies on the five targeted content tables: 0.
- Administrator Storage policies retained: 3; targeted administrator content policies retained: 5.
- Image read policies retained: 2; application/Storage-object RLS remains enabled.

The earlier apply-command failures below are historical; this specific permission fix is now live and verified. The SQL changes policy definitions only, not stored rows/files. No live upload/delete probe was performed; actual admin workflows still need end-to-end verification. Email-privacy deployment, backup/restore readiness, and the other outstanding audit items are not completed by this fix. Verification artifact: `.tmp/database-audit/permission-fix-verification.json`.

## Management-token follow-up (2026-10-02 Asia/Karachi)

The locally configured Management token returned HTTP 200 and matched the configured project. Credentials were never printed. Metadata queries used the Management API with `read_only: true` and explicit read-only transactions. The earlier service-role-only limitations below describe the initial audit, not current token availability.

- **Critical, live-confirmed:** `storage.objects` still has `Allow public uploads`, `Allow public updates`, and `Allow public delete` for anonymous/authenticated roles. These permissive policies bypass the intended administrator-only write policies. Public image delivery must remain enabled; public mutation must not.
- **High, live-confirmed:** broad `Authenticated users manage <underscored_table>` ALL policies remain on `hero_slides`, `social_reels`, `store_settings`, `video_settings`, and `blog_posts`, alongside secure administrator policies.
- All 21 application tables and eight Storage tables have RLS enabled. RLS being enabled alone does not make the policies safe. Inventory captured 42 policies, 103 indexes across public/Storage, 53 public constraints, ten public functions, and eleven public triggers.
- Backup API returned HTTP 200 with `pitr_enabled: false` and an empty available-backups list. No physical backup or production restore was performed, and no paid settings were changed. Previously verified encrypted application-row exports are not a complete Storage/database disaster-recovery backup.
- Prepared `20261002030000_remove_legacy_public_storage_writes.sql`: remove only the three exact public Storage write policies and five exact legacy content-write policies, after verifying secure administrator policies exist. Public reads, rows, images and admin permissions are preserved. An isolated PostgreSQL test confirms anonymous/non-admin writes are denied while public reads/admin updates remain functional.
- `apply-permission-fix.mjs --apply` was attempted twice, but both commands failed to start because automatic permission review timed out. **The live permission fix is NOT applied.** The script captures original policy metadata and verifies unchanged application/Storage row fingerprints inside a transaction before commit. No live rows, policies, files or Auth accounts were changed during this follow-up.
- Local public storefront projections and cached/API responses remove review/admin emails without modifying their stored values. New review submissions are unverified. The private-column SQL migration must follow deployment of the compatible frontend; applying it first could break the older `select('*')` consumers. Deployment is still pending.
- Two hero images were losslessly optimized in dry-run only: 2,175,605 to 1,001,462 bytes and 2,160,227 to 994,620 bytes. Both retain 1618 x 809 dimensions and identical decoded pixel hashes. Original live URLs remain unchanged, pending a complete verified backup.
- No unreferenced Storage candidate has been proven dead or deleted. No unused index was dropped solely from usage statistics.

Verification: 58 tests passed; new scripts/test passed ESLint and Prettier. Fifteen authenticator query timing aggregates were retrieved without query text; the top cumulative-time entry averaged 242.59 ms across 590 calls. Page-level attribution remains unverified. Final grant and administrator-function-definition checks timed out and remain incomplete. No unused indexes or MVCC dead tuples were manually removed.

Artifacts: `audit-management.mjs`, `.tmp/database-audit/management-audit.json`, the permission migration, `apply-permission-fix.mjs`, and `tests/storage-security-migration.test.ts`. Metadata reports contain no customer records or credential values. No guarantee of complete attack immunity is made.

References: [Management SQL query API](https://supabase.com/docs/reference/api/v1-run-a-query), [Supabase backups](https://supabase.com/docs/guides/platform/backups).

Date: 2026-10-02 (Asia/Karachi). Scope: 21 known application tables, Supabase Auth inventory, one Storage bucket, and local SQL/API code. This was a read-only audit: no database records, policies, Auth accounts or Storage objects were changed or deleted.

## Findings requiring approval

1. **High, live-confirmed: public review email.** Anonymous REST reads of `testimonials` expose a populated `email` column. Storefront mapping also includes email (`src/lib/supabaseSync.ts:390`). RLS restricts rows, not individual fields. Proposed fix: a public projection with no email; preserve emails in private admin access, update storefront consumers, and verify direct REST as well as cached responses.
2. **Medium, live-confirmed: public administrator email.** Anonymous `store_settings` reads expose populated `admin_email`. Public store contact information is intentional; the admin login identity is not required for customers. Proposed fix: separate public settings projection from private admin settings and remove the admin identity from public payloads/cache without deleting it.
3. **High, code-confirmed; live applicability unverified: policy-name mismatch.** `20260924100000_database_hardening.sql:444` creates broad `Authenticated users manage <table_name>` policies with underscores. `20260925140000_admin_security_hardening.sql:48` drops names after replacing underscores with spaces. For `hero_slides`, `social_reels`, `store_settings`, `video_settings`, and `blog_posts`, the broad policy can remain alongside the administrator policy if both migrations were applied as written. Permissive policies combine with OR. Proposed fix: inspect actual `pg_policies`, remove exact legacy names, and verify non-admin read/write permissions. No non-admin account was created and no write probe was performed.
4. **Medium, code-confirmed: unverified reviews marked verified.** `src/lib/api/engagement.server.ts:118` and `:142` mark public review submissions `verified: true` without purchase verification. Proposed fix: default to unverified/pending moderation; verified status only after an actual purchase check. Preserve existing reviews for explicit review rather than bulk rewriting them.
5. **Performance, live-confirmed: two active hero images exceed 2 MB each.** `hero/1790169073232-gg8von.png` is 2,175,605 bytes; `hero/1790169103811-zrze5h.png` is 2,160,227 bytes. Proposed fix: create optimized WebP/AVIF copies, verify dimensions/appearance, then update approved references while retaining originals for rollback. Do not change banner layout or dimensions.
6. **Cleanup candidates, not proven dead data:** 1,140 Storage files have no reference in the scanned database rows, totalling 64,935,693 bytes. External links, static code, previous deployments and backups were not exhaustively checked. Do not delete these automatically. Proposed process: export candidate inventory, verify external/code references, agree retention period, back up originals, then approve an exact deletion list.

## Verified healthy

- 38 products (36 visible anonymously), 2 categories, 5 collections, 3 hero slides, 7 brands, 1 testimonial and 2 FAQs.
- 12 orders, 3 queries and 2 subscribers were present for the service-role audit but returned zero rows to anonymous reads.
- Anonymous reads of admin users, security profiles, login attempts, checkout idempotency tables and API rate limits were denied (`42501`).
- No duplicate product/category/collection slugs, duplicate product SKUs or duplicate subscriber email groups in the scanned data.
- No broken category/product/collection references in the checked relationships; no negative product price/stock or out-of-range testimonial ratings.
- Zero embedded `data:image` values in the scanned rows.
- All 122 unique referenced Storage objects exist and returned successful unauthenticated HTTP HEAD responses.
- `optique-images`: 1,262 image objects, 73,443,730 bytes total, public delivery enabled, 5 MB upload limit, MIME allowlist JPEG/PNG/WebP/AVIF. No non-image MIME types found in object metadata. Public delivery is expected for storefront assets; upload/update/delete policy definitions still need SQL verification.
- Auth: 2 confirmed users; signup disabled. No verified native MFA factors found. One allowlisted account has no security profile; the latest local `is_admin()` requires both records, but its live definition was not retrieved. Do not delete or promote either account automatically.
- Observed service REST reads were approximately 264-930 ms per table. These include network overhead and are not SQL execution timings or production page-load measurements.

## Audit limits and next access

The service-role key bypasses RLS and does not provide arbitrary SQL/catalog access. Neither the checked Management token variable nor the checked SQL connection variables were configured. Actual RLS definitions, grants, function permissions, index usage/query plans, dead tuples, extension status, migration history, backup retention/PITR and restore readiness remain unverified. Existing local migrations are evidence of intended behavior, not proof of deployed state.

Use `supabase/audit-read-only.sql` in SQL Editor and provide redacted results, or configure appropriately scoped audit access locally, never in chat. That script runs in a read-only transaction and retrieves policy/grant/index/constraint/function/trigger/statistics metadata. Physical dead tuples are not unused customer records and should not be manually deleted.

A broader environment-variable inventory attempt was blocked by auto-review for credential-exposure risk. No credentials were printed; a safer boolean-only presence check succeeded. No blocked action was bypassed.

## Artifacts and approval

- `audit-database.mjs`: reproducible read-only audit (`node --env-file-if-exists=.env audit-database.mjs`).
- `.tmp/database-audit/audit.json`: local redacted counts, Storage candidate paths and asset check results; no customer records or credentials.
- `supabase/audit-read-only.sql`: pending live metadata verification.
- Audit script syntax check and ESLint passed. No application behavior was changed this audit.

Approval requested separately for privacy/security fixes, image optimization, and any specifically enumerated Storage deletion. Before database corrections, verify a restorable database backup plus a separate Storage-object backup. No promise of complete attack immunity or zero data-loss risk is made.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [public bucket behavior](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## Follow-up local fixes (2026-10-02)

User approved careful technical corrections while preserving live data. Local code changes, not yet deployed:

- Catalog/content deletions verify the signed-in user and `is_admin()`, inspect database errors and require one confirmed affected row. UI/cache removal and success notifications happen only after confirmation; already-absent records are idempotent after admin verification.
- Category deletion no longer cascades into product/collection deletion. Linked categories/collections are blocked until reassigned. Product deletion retains order/review history and relies on database FK unlinking; no image files are automatically deleted.
- Product writes/deletes are serialized per ID. Successful deletions cancel pending local retries and prevent late saves of the deleted product in the current client session.
- Loading/realtime/reconnect paths honor database image values instead of restoring removed galleries from local cache. Loading a storefront no longer writes cached product images back to the database. Empty canonical collection links/null category links no longer fall back to stale legacy IDs.
- Enquiry deletion soft-deletes only its actual source row; a legacy form enquiry cannot delete a customer order with the same ID. Realtime soft-deleted enquiries/orders are removed from visible state.
- Confirmed deletions request an authenticated, admin-only Redis cache revision increment. Concurrent old fills write only the old revision; refresh failures show a warning rather than pretending an already-committed deletion failed.
- Blog deletion keeps its local cache intact on database failure.
- Prepared `supabase/migrations/20261002010000_preserve_catalog_and_fix_policy_names.sql`: exact legacy policy-name cleanup plus catalog deletion/collection-reference guards. It changes definitions only, but is NOT applied or live-tested. Inspect live policy definitions and verify backups before deployment. Privacy-column fixes from the original findings remain pending.

Verification: 47 tests passed; final typecheck, ESLint and production build passed. Live read-only recheck found unchanged row counts for all 21 audited tables. No current product had conflicting empty gallery fields, multiple collection assignments or a missing category assignment. Local API smoke check: unauthenticated cache invalidation POST returned 401; public storefront GET returned 200 with 36 published products. Touched-file whitespace checks passed; a whole-worktree check reported existing EOF blank lines in unrelated files, left untouched. No live record, Auth user or Storage object was deleted/changed by these fixes. Exact historical deleted-record identities were unavailable, so no unreferenced Storage candidate was treated as proven deleted data.
