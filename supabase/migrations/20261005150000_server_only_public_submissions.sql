-- Deploy service-backed order tracking and submission APIs before applying.
-- Retains administrator policies and all existing customer records.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['orders', 'queries', 'subscribers'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = target
      AND cmd = 'ALL' AND 'authenticated' = ANY(roles)
      AND qual LIKE '%is_admin%' AND with_check LIKE '%is_admin%'
    ) THEN
      RAISE EXCEPTION 'Secure administrator policy missing for %', target;
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public creates valid orders" ON public.orders;
DROP POLICY IF EXISTS "Public creates valid queries" ON public.queries;
REVOKE INSERT ON public.orders, public.queries, public.subscribers FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.subscribe_email(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_order_by_reference(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_email(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.lookup_order_by_reference(text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
