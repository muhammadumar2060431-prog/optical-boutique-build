BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preserve access for the existing owner account. Future Auth users are not
-- administrators until explicitly inserted into this allowlist.
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_users TO service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products', 'categories', 'collections', 'hero_slides', 'brands',
    'social_reels', 'testimonials', 'faqs', 'orders', 'queries',
    'subscribers', 'store_settings', 'announcements', 'video_settings',
    'blog_posts'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Authenticated users manage ' || replace(table_name, '_', ' '),
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()))',
      'Administrators manage ' || replace(table_name, '_', ' '),
      table_name
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS "Admin upload optique images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update optique images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete optique images" ON storage.objects;

CREATE POLICY "Administrators upload optique images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'optique-images' AND (SELECT public.is_admin()));

CREATE POLICY "Administrators update optique images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'optique-images' AND (SELECT public.is_admin()))
WITH CHECK (bucket_id = 'optique-images' AND (SELECT public.is_admin()));

CREATE POLICY "Administrators delete optique images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'optique-images' AND (SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  bucket_key TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_login_bucket_length CHECK (char_length(bucket_key) BETWEEN 1 AND 200)
);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_login_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_login_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.check_admin_login_v1(p_bucket_key TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  attempt public.admin_login_attempts%ROWTYPE;
BEGIN
  IF p_bucket_key IS NULL OR char_length(p_bucket_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'INVALID_BUCKET';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_bucket_key, 0));
  SELECT * INTO attempt
  FROM public.admin_login_attempts
  WHERE bucket_key = p_bucket_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF attempt.locked_until IS NOT NULL AND attempt.locked_until > now() THEN
    RETURN GREATEST(1, CEIL(EXTRACT(EPOCH FROM attempt.locked_until - now()))::INTEGER);
  END IF;

  IF attempt.window_started_at <= now() - INTERVAL '15 minutes'
     OR attempt.locked_until IS NOT NULL THEN
    DELETE FROM public.admin_login_attempts WHERE bucket_key = p_bucket_key;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_admin_login_v1(
  p_bucket_key TEXT,
  p_success BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  attempt public.admin_login_attempts%ROWTYPE;
  next_count INTEGER;
  next_window TIMESTAMPTZ;
  next_lock TIMESTAMPTZ;
BEGIN
  IF p_bucket_key IS NULL OR char_length(p_bucket_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'INVALID_BUCKET';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_bucket_key, 0));

  IF p_success THEN
    DELETE FROM public.admin_login_attempts WHERE bucket_key = p_bucket_key;
    RETURN 0;
  END IF;

  SELECT * INTO attempt
  FROM public.admin_login_attempts
  WHERE bucket_key = p_bucket_key
  FOR UPDATE;

  IF NOT FOUND OR attempt.window_started_at <= now() - INTERVAL '15 minutes' THEN
    next_count := 1;
    next_window := now();
  ELSE
    next_count := attempt.failed_count + 1;
    next_window := attempt.window_started_at;
  END IF;

  next_lock := CASE WHEN next_count >= 5 THEN now() + INTERVAL '15 minutes' END;

  INSERT INTO public.admin_login_attempts (
    bucket_key, failed_count, window_started_at, locked_until, updated_at
  ) VALUES (
    p_bucket_key, next_count, next_window, next_lock, now()
  )
  ON CONFLICT (bucket_key) DO UPDATE SET
    failed_count = EXCLUDED.failed_count,
    window_started_at = EXCLUDED.window_started_at,
    locked_until = EXCLUDED.locked_until,
    updated_at = EXCLUDED.updated_at;

  IF next_lock IS NOT NULL THEN
    RETURN GREATEST(1, CEIL(EXTRACT(EPOCH FROM next_lock - now()))::INTEGER);
  END IF;

  RETURN 0;
END;
$$;

REVOKE ALL ON FUNCTION public.check_admin_login_v1(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_admin_login_v1(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_login_v1(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_admin_login_v1(TEXT, BOOLEAN) TO service_role;

COMMIT;
