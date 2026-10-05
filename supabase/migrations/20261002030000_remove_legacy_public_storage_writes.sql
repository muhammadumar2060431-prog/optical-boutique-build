-- Permission definitions only: no rows, files, or public image delivery are changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
  target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['hero_slides', 'social_reels', 'store_settings', 'video_settings', 'blog_posts']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = target AND policyname = 'Administrators manage ' || replace(target, '_', ' ')
      AND cmd = 'ALL' AND 'authenticated' = ANY(roles)
      AND qual LIKE '%is_admin%' AND with_check LIKE '%is_admin%') THEN
      RAISE EXCEPTION 'Secure administrator policy missing for %', target;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users manage ' || target, target);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage'
    AND tablename = 'objects' AND policyname = 'Administrators upload optique images'
    AND cmd = 'INSERT' AND 'authenticated' = ANY(roles) AND with_check LIKE '%is_admin%')
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage'
    AND tablename = 'objects' AND policyname = 'Administrators update optique images'
    AND cmd = 'UPDATE' AND 'authenticated' = ANY(roles)
    AND qual LIKE '%is_admin%' AND with_check LIKE '%is_admin%')
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage'
    AND tablename = 'objects' AND policyname = 'Administrators delete optique images'
    AND cmd = 'DELETE' AND 'authenticated' = ANY(roles) AND qual LIKE '%is_admin%') THEN
    RAISE EXCEPTION 'Secure Storage administrator policies missing';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;

COMMIT;
