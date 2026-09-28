-- Keep order details private and expose only a narrow tracking projection.
-- Anonymous reads use lookup_order_by_reference instead of table SELECT.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS variant_label TEXT,
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

UPDATE public.orders
SET
  reference = COALESCE(reference, items->0->>'reference'),
  product_name = COALESCE(product_name, items->0->>'productName'),
  variant_label = COALESCE(variant_label, items->0->>'variantLabel'),
  courier_name = COALESCE(courier_name, items->0->>'courierName'),
  tracking_number = COALESCE(tracking_number, items->0->>'trackingNumber')
WHERE jsonb_typeof(items) = 'array';

CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders (reference);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow checkout create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow manage orders" ON public.orders;
DROP POLICY IF EXISTS "Public read orders" ON public.orders;
DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can read all orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Anonymous can only lookup by exact reference" ON public.orders;

CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (
    source IN ('cart', 'whatsapp', 'form')
    AND status = 'New'
    AND char_length(id) BETWEEN 1 AND 100
  );

CREATE POLICY "Authenticated users manage orders"
  ON public.orders FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.lookup_order_by_reference(p_reference TEXT)
RETURNS TABLE (
  id TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ,
  customer_name TEXT,
  product_name TEXT,
  variant_label TEXT,
  source TEXT,
  status TEXT,
  courier_name TEXT,
  tracking_number TEXT,
  dispatched_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    o.id,
    COALESCE(o.reference, o.items->0->>'reference') AS reference,
    o.created_at,
    split_part(o.customer_name, ' ', 1) AS customer_name,
    COALESCE(o.product_name, o.items->0->>'productName', 'Glasses') AS product_name,
    COALESCE(o.variant_label, o.items->0->>'variantLabel') AS variant_label,
    o.source,
    o.status,
    COALESCE(o.courier_name, o.items->0->>'courierName') AS courier_name,
    COALESCE(o.tracking_number, o.items->0->>'trackingNumber') AS tracking_number,
    o.dispatched_at
  FROM public.orders AS o
  WHERE o.source <> 'form'
    AND length(regexp_replace(upper(trim(p_reference)), '[^A-Z0-9]', '', 'g')) BETWEEN 9 AND 32
    AND regexp_replace(
      upper(COALESCE(o.reference, o.items->0->>'reference', '')),
      '[^A-Z0-9]',
      '',
      'g'
    ) = regexp_replace(upper(trim(p_reference)), '[^A-Z0-9]', '', 'g')
  ORDER BY o.created_at DESC
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.lookup_order_by_reference(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order_by_reference(TEXT) TO anon, authenticated;
