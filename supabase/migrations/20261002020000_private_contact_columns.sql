-- Deploy the compatible application projection before applying this migration.
-- No existing emails/reviews/settings are modified or deleted.
BEGIN;

DO $$
DECLARE
  target TEXT;
  policy RECORD;
BEGIN
  FOREACH target IN ARRAY ARRAY['testimonials', 'store_settings']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = target AND cmd = 'ALL' AND qual LIKE '%is_admin%'
      AND with_check LIKE '%is_admin%' AND 'authenticated' = ANY(roles)) THEN
      RAISE EXCEPTION 'Secure administrator policy missing for %', target;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = target AND cmd = 'ALL'
      AND ('authenticated' = ANY(roles) OR 'public' = ANY(roles))
      AND COALESCE(qual, '') NOT LIKE '%is_admin%') THEN
      RAISE EXCEPTION 'Unexpected broad policy on %; inspect it before changing grants', target;
    END IF;
    FOR policy IN SELECT policyname FROM pg_policies WHERE schemaname = 'public'
      AND tablename = target AND cmd = 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy.policyname, target);
    END LOOP;
  END LOOP;
END;
$$;

-- Signed-in non-admin users obtain public data through the anonymous storefront API.
CREATE POLICY "Public reads enabled testimonials" ON public.testimonials
FOR SELECT TO anon USING (enabled = true);
CREATE POLICY "Public reads store settings" ON public.store_settings
FOR SELECT TO anon USING (true);

CREATE OR REPLACE FUNCTION public.admin_testimonials_v1()
RETURNS SETOF public.testimonials
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Administrator permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.testimonials ORDER BY sort_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_store_settings_v1()
RETURNS SETOF public.store_settings
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Administrator permission required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.store_settings WHERE id = 'default';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_testimonials_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_store_settings_v1() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_testimonials_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_store_settings_v1() TO authenticated;

-- Revoke both table and previous column grants before granting the explicit projection.
REVOKE SELECT ON public.testimonials, public.store_settings FROM PUBLIC, anon, authenticated;
DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('testimonials', 'store_settings')
  LOOP
    EXECUTE format('REVOKE SELECT (%I) ON public.%I FROM PUBLIC, anon, authenticated', item.column_name, item.table_name);
  END LOOP;
END;
$$;

GRANT SELECT (id, source, name, product_id, product_name, title, review, rating, avatar,
  verified, enabled, sort_order, created_at) ON public.testimonials TO anon;
GRANT SELECT (id, store_name, whatsapp, phone, email, address, hours, logo,
  low_stock_threshold, about_headline, about_body, updated_at)
  ON public.store_settings TO anon;
-- Only administrators pass the authenticated row policies; full SELECT preserves upserts.
GRANT SELECT ON public.testimonials, public.store_settings TO authenticated;

COMMIT;
