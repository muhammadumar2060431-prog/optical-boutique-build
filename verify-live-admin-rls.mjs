import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
if (!token || !url) throw new Error("Missing local Supabase configuration");
const ref = new URL(url).hostname.split(".")[0];
const id = `audit-${randomUUID()}`;
const query = `
BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
DO $$ DECLARE admin_id uuid; BEGIN
  SELECT a.user_id INTO admin_id FROM public.admin_users a
  JOIN public.admin_security_profiles s USING(user_id) LIMIT 1;
  IF admin_id IS NULL THEN RAISE EXCEPTION 'No fully enrolled administrator'; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',admin_id,'role','authenticated')::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin authorization failed'; END IF;
END $$;
INSERT INTO public.categories(id,name,slug) VALUES('${id}','Audit fixture','${id}');
INSERT INTO public.collections(id,name,slug,category_id) VALUES('${id}','Audit fixture','${id}','${id}');
INSERT INTO public.products(id,name,slug,price,stock,category_id,collection_ids,enabled)
  VALUES('${id}','Audit fixture','${id}',1,1,'${id}',ARRAY['${id}'],false);
INSERT INTO public.faqs(id,question,answer,enabled,show_on_pages)
  VALUES('${id}','Audit fixture','Audit fixture',false,ARRAY['home','about','contact','cart','checkout','tracking']);
INSERT INTO public.video_settings(id,enabled) VALUES('${id}',false);
DO $$ DECLARE n integer; BEGIN
  UPDATE public.faqs SET answer='Updated audit fixture' WHERE id='${id}';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FAQ update not confirmed'; END IF;
  BEGIN
    DELETE FROM public.categories WHERE id='${id}';
    RAISE EXCEPTION 'Linked category deletion was allowed';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    DELETE FROM public.collections WHERE id='${id}';
    RAISE EXCEPTION 'Linked collection deletion was allowed';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    UPDATE public.products SET collection_ids=ARRAY['${id}-missing'] WHERE id='${id}';
    RAISE EXCEPTION 'Broken collection link was allowed';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub','${randomUUID()}','role','authenticated')::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.is_admin() THEN RAISE EXCEPTION 'Non-admin was authorized'; END IF;
  IF EXISTS(SELECT 1 FROM public.faqs WHERE id='${id}')
    OR EXISTS(SELECT 1 FROM public.video_settings WHERE id='${id}') THEN
    RAISE EXCEPTION 'Non-admin could read draft content';
  END IF;
  BEGIN
    INSERT INTO public.faqs(id,question,answer) VALUES('${id}-denied','Audit fixture','Audit fixture');
    RAISE EXCEPTION 'Non-admin write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.faqs WHERE id='${id}') THEN RAISE EXCEPTION 'Anonymous draft read allowed'; END IF;
  BEGIN
    INSERT INTO public.faqs(id,question,answer) VALUES('${id}-denied','Audit fixture','Audit fixture');
    RAISE EXCEPTION 'Anonymous write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ DECLARE admin_id uuid; BEGIN
  SELECT a.user_id INTO admin_id FROM public.admin_users a JOIN public.admin_security_profiles s USING(user_id) LIMIT 1;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
END $$;
SET LOCAL ROLE authenticated;
DELETE FROM public.products WHERE id='${id}';
DELETE FROM public.collections WHERE id='${id}';
DELETE FROM public.categories WHERE id='${id}';
DELETE FROM public.faqs WHERE id='${id}';
DELETE FROM public.video_settings WHERE id='${id}';
RESET ROLE;
ROLLBACK;
SELECT true AS workflow_checks_passed,
  NOT EXISTS(SELECT 1 FROM public.categories WHERE id='${id}')
  AND NOT EXISTS(SELECT 1 FROM public.products WHERE id='${id}')
  AND NOT EXISTS(SELECT 1 FROM public.faqs WHERE id='${id}') AS fixtures_absent;
`;
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, read_only: false }),
  signal: AbortSignal.timeout(45_000),
});
if (!response.ok) {
  console.log(JSON.stringify({ verified: false, status: response.status }));
  throw new Error("Rollback-only production RLS verification failed");
}
const rows = await response.json();
assert.equal(rows[0]?.workflow_checks_passed, true);
assert.equal(rows[0]?.fixtures_absent, true);
const result = {
  checkedAt: new Date().toISOString(),
  verified: true,
  transactionRolledBack: true,
  fixturesAbsent: true,
  adminFaqSaveDelete: true,
  catalogSaveDelete: true,
  linkedDeletionGuards: true,
  invalidCollectionLinksDenied: true,
  nonAdminDraftsAndWritesDenied: true,
  anonymousDraftsAndWritesDenied: true,
  realBrowserPasswordLoginVerified: false,
};
await mkdir(".tmp/database-audit", { recursive: true });
await writeFile(".tmp/database-audit/admin-rls-workflow.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
