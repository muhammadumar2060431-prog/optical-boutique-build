-- Protect customer data and align order persistence with the application.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS variant_id TEXT,
  ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN NOT NULL DEFAULT false;

UPDATE public.orders
SET
  product_id = COALESCE(product_id, items->0->>'productId'),
  variant_id = COALESCE(variant_id, items->0->>'variantId')
WHERE jsonb_typeof(items) = 'array';

ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('queries', 'subscribers')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END
$$;

CREATE POLICY "Public can submit queries"
  ON public.queries FOR INSERT TO anon
  WITH CHECK (
    status = 'New'
    AND char_length(id) BETWEEN 1 AND 100
    AND char_length(name) BETWEEN 1 AND 120
    AND char_length(contact) BETWEEN 3 AND 320
    AND char_length(message) BETWEEN 1 AND 2000
  );

CREATE POLICY "Authenticated users manage queries"
  ON public.queries FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can subscribe"
  ON public.subscribers FOR INSERT TO anon
  WITH CHECK (
    char_length(id) BETWEEN 1 AND 100
    AND char_length(email) BETWEEN 3 AND 320
    AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

CREATE POLICY "Authenticated users manage subscribers"
  ON public.subscribers FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
