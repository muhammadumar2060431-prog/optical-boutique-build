BEGIN;

-- Existing production tables predate the canonical NUMERIC declarations, so
-- ADD COLUMN IF NOT EXISTS did not change their original integer types.
DROP POLICY IF EXISTS "Public creates valid orders" ON public.orders;

ALTER TABLE public.products
  ALTER COLUMN price TYPE NUMERIC(12, 2) USING price::NUMERIC(12, 2),
  ALTER COLUMN compare_at TYPE NUMERIC(12, 2) USING compare_at::NUMERIC(12, 2);

ALTER TABLE public.orders
  ALTER COLUMN total TYPE NUMERIC(12, 2) USING total::NUMERIC(12, 2);

CREATE POLICY "Public creates valid orders" ON public.orders FOR INSERT TO anon
  WITH CHECK (
    source IN ('cart', 'whatsapp')
    AND status = 'New'
    AND char_length(id) BETWEEN 1 AND 100
    AND char_length(reference) BETWEEN 9 AND 32
    AND char_length(customer_name) BETWEEN 1 AND 120
    AND char_length(phone) BETWEEN 3 AND 80
    AND char_length(address) BETWEEN 1 AND 1000
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) BETWEEN 1 AND 50
    AND total >= 0
  );
-- Repair legacy orphan references before replacing NOT VALID constraints with
-- fully validated foreign keys.
UPDATE public.collections AS child
SET category_id = NULL
WHERE category_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.categories AS parent WHERE parent.id = child.category_id);

UPDATE public.products AS child
SET category_id = NULL
WHERE category_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.categories AS parent WHERE parent.id = child.category_id);

UPDATE public.social_reels AS child
SET product_id = NULL
WHERE product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.products AS parent WHERE parent.id = child.product_id);

UPDATE public.testimonials AS child
SET product_id = NULL
WHERE product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.products AS parent WHERE parent.id = child.product_id);

UPDATE public.queries AS child
SET product_id = NULL
WHERE product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.products AS parent WHERE parent.id = child.product_id);

UPDATE public.orders AS child
SET product_id = NULL
WHERE product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.products AS parent WHERE parent.id = child.product_id);

ALTER TABLE public.collections
  DROP CONSTRAINT IF EXISTS collections_category_fk,
  DROP CONSTRAINT IF EXISTS collections_category_id_fkey,
  ADD CONSTRAINT collections_category_fk
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_fk,
  DROP CONSTRAINT IF EXISTS products_category_id_fkey,
  ADD CONSTRAINT products_category_fk
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.social_reels VALIDATE CONSTRAINT social_reels_product_fk;
ALTER TABLE public.testimonials VALIDATE CONSTRAINT testimonials_product_fk;
ALTER TABLE public.queries VALIDATE CONSTRAINT queries_product_fk;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_product_fk;

ALTER TABLE public.products VALIDATE CONSTRAINT products_price_nonnegative;
ALTER TABLE public.products VALIDATE CONSTRAINT products_compare_at_nonnegative;
ALTER TABLE public.products VALIDATE CONSTRAINT products_stock_nonnegative;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_source_allowed;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_status_allowed;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_total_nonnegative;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_items_array;
ALTER TABLE public.queries VALIDATE CONSTRAINT queries_status_allowed;
ALTER TABLE public.testimonials VALIDATE CONSTRAINT testimonials_rating_range;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.queries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_soft_delete_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    NEW.deleted_by := auth.uid();
  ELSIF NEW.deleted_at IS NULL THEN
    NEW.deleted_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_orders_soft_delete_audit ON public.orders;
CREATE TRIGGER set_orders_soft_delete_audit
BEFORE UPDATE OF deleted_at ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

DROP TRIGGER IF EXISTS set_queries_soft_delete_audit ON public.queries;
CREATE TRIGGER set_queries_soft_delete_audit
BEFORE UPDATE OF deleted_at ON public.queries
FOR EACH ROW EXECUTE FUNCTION public.set_soft_delete_audit();

CREATE INDEX IF NOT EXISTS orders_active_created_idx
  ON public.orders (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS orders_active_status_created_idx
  ON public.orders (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS orders_deleted_by_idx
  ON public.orders (deleted_by) WHERE deleted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS queries_active_created_idx
  ON public.queries (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS queries_active_status_created_idx
  ON public.queries (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS queries_deleted_by_idx
  ON public.queries (deleted_by) WHERE deleted_by IS NOT NULL;

-- Normalize the many-order idempotency response into indexed relationships.
CREATE TABLE IF NOT EXISTS public.checkout_idempotency_orders (
  idempotency_key TEXT NOT NULL
    REFERENCES public.checkout_idempotency(idempotency_key) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  PRIMARY KEY (idempotency_key, order_id)
);

CREATE INDEX IF NOT EXISTS checkout_idempotency_orders_order_id_idx
  ON public.checkout_idempotency_orders (order_id);

ALTER TABLE public.checkout_idempotency_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_idempotency_orders FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_checkout_idempotency_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.checkout_idempotency_orders
  WHERE idempotency_key = NEW.idempotency_key;

  IF jsonb_typeof(NEW.response->'orders') = 'array' THEN
    INSERT INTO public.checkout_idempotency_orders (idempotency_key, order_id)
    SELECT NEW.idempotency_key, source_order.id
    FROM jsonb_array_elements(NEW.response->'orders') AS item
    JOIN public.orders AS source_order ON source_order.id = item->>'id'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_checkout_idempotency_orders
  ON public.checkout_idempotency;
CREATE TRIGGER sync_checkout_idempotency_orders
AFTER INSERT OR UPDATE ON public.checkout_idempotency
FOR EACH ROW EXECUTE FUNCTION public.sync_checkout_idempotency_orders();

INSERT INTO public.checkout_idempotency_orders (idempotency_key, order_id)
SELECT idempotency.idempotency_key, source_order.id
FROM public.checkout_idempotency AS idempotency
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(idempotency.response->'orders') = 'array'
      THEN idempotency.response->'orders'
    ELSE '[]'::jsonb
  END
) AS item
JOIN public.orders AS source_order ON source_order.id = item->>'id'
WHERE jsonb_typeof(idempotency.response->'orders') = 'array'
ON CONFLICT DO NOTHING;

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
  WITH input AS (
    SELECT regexp_replace(upper(trim(p_reference)), '[^A-Z0-9]', '', 'g') AS normalized_reference
  )
  SELECT
    orders.id,
    COALESCE(orders.reference, orders.items->0->>'reference'),
    orders.created_at,
    split_part(orders.customer_name, ' ', 1),
    COALESCE(orders.product_name, orders.items->0->>'productName', 'Glasses'),
    COALESCE(orders.variant_label, orders.items->0->>'variantLabel'),
    orders.source,
    orders.status,
    COALESCE(orders.courier_name, orders.items->0->>'courierName'),
    COALESCE(orders.tracking_number, orders.items->0->>'trackingNumber'),
    orders.dispatched_at
  FROM public.orders
  CROSS JOIN input
  WHERE orders.deleted_at IS NULL
    AND orders.source <> 'form'
    AND char_length(input.normalized_reference) BETWEEN 9 AND 32
    AND regexp_replace(
      upper(COALESCE(orders.reference, orders.items->0->>'reference', '')),
      '[^A-Z0-9]',
      '',
      'g'
    ) = input.normalized_reference
  ORDER BY orders.created_at DESC
  LIMIT 20;
$$;

COMMIT;
