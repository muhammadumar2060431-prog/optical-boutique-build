BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'video_settings'
    AND cmd = 'ALL' AND 'authenticated' = ANY(roles)
    AND qual LIKE '%is_admin%' AND with_check LIKE '%is_admin%'
  ) THEN
    RAISE EXCEPTION 'Secure administrator video policy is missing';
  END IF;
END $$;

ALTER POLICY "Public reads enabled video" ON public.video_settings USING (enabled = true);

COMMIT;
