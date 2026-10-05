BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inventory_revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS quantity INTEGER,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'PKR';
ALTER TABLE public.orders ADD CONSTRAINT orders_quantity_range CHECK (quantity BETWEEN 1 AND 999);
ALTER TABLE public.orders ADD CONSTRAINT orders_unit_price_nonnegative CHECK (unit_price >= 0);

-- Only recover explicit legacy checkout headers; never price history from today's catalog.
WITH parsed AS (
  SELECT id, regexp_match(address,
    '^Checkout order OPT-[A-Z0-9]+ [^[:alnum:]]+ quantity ([0-9]{1,3}) [(]Rs[.] ([0-9,]+([.][0-9]{1,2})?)[)]') AS fields
  FROM public.orders WHERE source = 'cart' AND quantity IS NULL
), amounts AS (
  SELECT id, fields[1]::integer AS qty, replace(fields[2], ',', '')::numeric AS amount
  FROM parsed WHERE fields IS NOT NULL
)
UPDATE public.orders o SET quantity = a.qty, total = a.amount,
  unit_price = CASE WHEN round(a.amount / a.qty, 2) * a.qty = a.amount
    THEN round(a.amount / a.qty, 2) ELSE NULL END
FROM amounts a WHERE o.id = a.id AND a.qty BETWEEN 1 AND 999
  AND a.amount BETWEEN 0 AND 9999999999.99 AND o.total = 0;

CREATE OR REPLACE FUNCTION public.guard_product_inventory_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.stock IS DISTINCT FROM OLD.stock OR NEW.variants IS DISTINCT FROM OLD.variants THEN
    IF COALESCE(current_setting('app.inventory_write', true), '') <> 'allowed' THEN
      RAISE EXCEPTION 'INVENTORY_RPC_REQUIRED' USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.inventory_revision := OLD.inventory_revision + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_product_inventory_v1 BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_product_inventory_v1();

CREATE OR REPLACE FUNCTION public.order_inventory_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  product public.products%ROWTYPE;
  variant jsonb;
  available integer;
  delta integer := 0;
  previous_permission text;
  legacy_quantity text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.source = 'form' THEN RETURN NEW; END IF;
    legacy_quantity := (regexp_match(NEW.address,
      '^Checkout order OPT-[A-Z0-9]+ [^[:alnum:]]+ quantity ([0-9]{1,3}) [(]'))[1];
    IF NEW.quantity IS NULL THEN
      IF NEW.items->0 ? 'quantity' THEN
        IF NEW.items->0->>'quantity' !~ '^[0-9]{1,3}$' THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
        NEW.quantity := (NEW.items->0->>'quantity')::integer;
      ELSIF NEW.source = 'whatsapp' THEN NEW.quantity := 1;
      ELSIF legacy_quantity IS NOT NULL THEN NEW.quantity := legacy_quantity::integer;
      ELSE RAISE EXCEPTION 'QUANTITY_REQUIRED'; END IF;
    END IF;
    IF NEW.quantity NOT BETWEEN 1 AND 999 THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
    NEW.currency := 'PKR';
    NEW.stock_deducted := false;
    NEW.inventory_quantity := 0;
    IF NEW.product_id IS NULL AND NEW.source = 'whatsapp' THEN
      NEW.unit_price := NULL; NEW.total := 0; RETURN NEW;
    END IF;
  ELSE
    IF NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.unit_price IS DISTINCT FROM OLD.unit_price
      OR NEW.total IS DISTINCT FROM OLD.total OR NEW.currency IS DISTINCT FROM OLD.currency THEN
      RAISE EXCEPTION 'ORDER_SNAPSHOT_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
    NEW.stock_deducted := OLD.stock_deducted;
    NEW.inventory_quantity := OLD.inventory_quantity;
    IF NEW.status = 'Completed' AND NOT OLD.stock_deducted THEN
      IF OLD.quantity IS NULL THEN RAISE EXCEPTION 'LEGACY_QUANTITY_REQUIRED'; END IF;
      delta := -OLD.quantity;
    ELSIF NEW.status = 'Cancelled' AND OLD.stock_deducted THEN
      IF OLD.inventory_quantity <= 0 THEN RAISE EXCEPTION 'LEGACY_QUANTITY_REQUIRED'; END IF;
      delta := OLD.inventory_quantity;
    ELSE RETURN NEW; END IF;
    IF OLD.product_id IS NULL THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
    -- Stock must always move against the original order's product/variant.
    IF NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.variant_id IS DISTINCT FROM OLD.variant_id THEN
      RAISE EXCEPTION 'INVALID_ORDER';
    END IF;
  END IF;

  SELECT * INTO product FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF NOT FOUND OR (TG_OP = 'INSERT' AND NOT COALESCE(product.enabled, false)) THEN
    RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
  END IF;
  IF NEW.variant_id IS NOT NULL THEN
    SELECT value INTO variant FROM jsonb_array_elements(COALESCE(product.variants, '[]'::jsonb))
      WHERE value->>'id' = NEW.variant_id;
    IF variant IS NULL OR variant->>'stock' IS NULL OR variant->>'stock' !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'VARIANT_UNAVAILABLE';
    END IF;
    available := (variant->>'stock')::integer;
  ELSE
    IF jsonb_array_length(COALESCE(product.variants, '[]'::jsonb)) > 0 THEN
      RAISE EXCEPTION 'VARIANT_REQUIRED';
    END IF;
    available := COALESCE(product.stock, 0);
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF available < NEW.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
    NEW.unit_price := COALESCE((variant->>'price')::numeric, product.price);
    IF NEW.unit_price IS NULL OR NEW.unit_price < 0 THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
    NEW.total := NEW.unit_price * NEW.quantity;
    NEW.product_name := product.name;
    NEW.variant_label := variant->>'label';
    NEW.items := jsonb_build_array((NEW.items->0) || jsonb_build_object(
      'quantity', NEW.quantity, 'unitPrice', NEW.unit_price, 'total', NEW.total,
      'currency', NEW.currency, 'productName', NEW.product_name, 'variantLabel', NEW.variant_label));
    RETURN NEW;
  END IF;
  IF available + delta < 0 THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
  previous_permission := current_setting('app.inventory_write', true);
  PERFORM set_config('app.inventory_write', 'allowed', true);
  IF NEW.variant_id IS NULL THEN
    UPDATE public.products SET stock = available + delta WHERE id = product.id;
  ELSE
    UPDATE public.products SET variants = (
      SELECT jsonb_agg(CASE WHEN value->>'id' = NEW.variant_id
        THEN jsonb_set(value, '{stock}', to_jsonb(available + delta)) ELSE value END ORDER BY ordinal)
      FROM jsonb_array_elements(product.variants) WITH ORDINALITY AS entries(value, ordinal)
    ) WHERE id = product.id;
  END IF;
  PERFORM set_config('app.inventory_write', COALESCE(previous_permission, ''), true);
  NEW.stock_deducted := delta < 0;
  NEW.inventory_quantity := CASE WHEN delta < 0 THEN NEW.quantity ELSE 0 END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER order_inventory_v1 BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.order_inventory_v1();

CREATE OR REPLACE FUNCTION public.create_checkout_order_v2(
  p_idempotency_key text, p_request_hash text, p_orders jsonb, p_rate_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; canonical jsonb; line jsonb;
BEGIN
  IF jsonb_typeof(p_orders) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
  -- Deterministic product lock ordering prevents multi-product checkout deadlocks.
  PERFORM id FROM public.products
    WHERE id IN (SELECT value->>'productId' FROM jsonb_array_elements(p_orders)) ORDER BY id FOR UPDATE;
  result := public.create_checkout_order_v1(p_idempotency_key, p_request_hash, p_orders, p_rate_key);
  SELECT jsonb_agg((entry.value) || jsonb_build_object(
    'quantity', o.quantity, 'unitPrice', o.unit_price, 'total', o.total, 'currency', o.currency,
    'productName', o.product_name, 'variantLabel', o.variant_label,
    'stockDeducted', o.stock_deducted, 'createdAt', o.created_at, 'status', o.status
  ) ORDER BY entry.ordinal) INTO canonical
  FROM jsonb_array_elements(result->'orders') WITH ORDINALITY AS entry(value, ordinal)
  JOIN public.orders o ON o.id = entry.value->>'id';
  -- Multiple lines for the same inventory item must also fit the available stock.
  IF NOT COALESCE((result->>'replayed')::boolean, false) THEN
    FOR line IN SELECT jsonb_build_object('productId', product_id, 'variantId', variant_id, 'qty', sum(quantity))
      FROM public.orders WHERE id IN (SELECT value->>'id' FROM jsonb_array_elements(canonical))
      AND product_id IS NOT NULL GROUP BY product_id, variant_id LOOP
      IF (line->>'qty')::integer > (
        SELECT CASE WHEN line->>'variantId' IS NULL THEN COALESCE(p.stock,0) ELSE
          (SELECT (v->>'stock')::integer FROM jsonb_array_elements(p.variants) v WHERE v->>'id'=line->>'variantId') END
        FROM public.products p WHERE p.id=line->>'productId'
      ) THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
    END LOOP;
  END IF;
  result := result || jsonb_build_object('orders', canonical);
  UPDATE public.checkout_idempotency SET response = result - 'replayed' WHERE idempotency_key = p_idempotency_key;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_inventory_v1(p_order_id text, p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE updated public.orders%ROWTYPE;
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_patch) <> 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k NOT IN ('status','courierName','trackingNumber')
  ) THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
  IF p_patch ? 'status' AND COALESCE(p_patch->>'status','') NOT IN ('New','Contacted','Dispatched','Completed','Cancelled') THEN
    RAISE EXCEPTION 'INVALID_ORDER';
  END IF;
  UPDATE public.orders SET
    status = CASE WHEN p_patch ? 'status' THEN p_patch->>'status' ELSE status END,
    courier_name = CASE WHEN p_patch ? 'courierName' THEN p_patch->>'courierName' ELSE courier_name END,
    tracking_number = CASE WHEN p_patch ? 'trackingNumber' THEN p_patch->>'trackingNumber' ELSE tracking_number END,
    dispatched_at = CASE WHEN p_patch->>'status'='Dispatched' THEN COALESCE(dispatched_at,now()) ELSE dispatched_at END
  WHERE id=p_order_id AND deleted_at IS NULL RETURNING * INTO updated;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('order',to_jsonb(updated),'product',
    (SELECT to_jsonb(p) FROM public.products p WHERE p.id=updated.product_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.save_product_inventory_v1(p_payload jsonb, p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE existing public.products%ROWTYPE; columns_sql text; updates_sql text; result jsonb; previous_permission text;
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_payload)<>'object' OR COALESCE(p_payload->>'id','')='' OR p_expected_revision IS NULL THEN
    RAISE EXCEPTION 'INVALID_PRODUCT';
  END IF;
  IF p_payload ? 'stock' AND COALESCE(p_payload->>'stock','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'INVALID_PRODUCT'; END IF;
  IF p_payload ? 'variants' THEN
    IF jsonb_typeof(p_payload->'variants') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_PRODUCT'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'variants') v
      WHERE COALESCE(v->>'id','')='' OR COALESCE(v->>'stock','') !~ '^[0-9]+$'
      OR (v ? 'price' AND (jsonb_typeof(v->'price')<>'number' OR (v->>'price')::numeric < 0)))
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'variants') v GROUP BY v->>'id' HAVING count(*)>1) THEN
      RAISE EXCEPTION 'INVALID_PRODUCT';
    END IF;
    IF EXISTS(SELECT 1 FROM public.orders o WHERE o.product_id=p_payload->>'id'
      AND o.stock_deducted AND o.deleted_at IS NULL AND o.variant_id IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'variants') v WHERE v->>'id'=o.variant_id)) THEN
      RAISE EXCEPTION 'VARIANT_IN_USE';
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_payload->>'id', 41));
  SELECT * INTO existing FROM public.products WHERE id=p_payload->>'id' FOR UPDATE;
  IF FOUND AND existing.inventory_revision<>p_expected_revision THEN RAISE EXCEPTION 'INVENTORY_CONFLICT'; END IF;
  p_payload := p_payload - 'inventory_revision';
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_payload) k WHERE k NOT IN (
    'id','name','slug','sku','price','compare_at','category_id','collection_ids','images','hover_image',
    'new_arrival_image','is_new_arrival','is_bestseller','featured','description','frame_fit','details','variants',
    'stock','enabled','created_at','updated_at')) THEN RAISE EXCEPTION 'INVALID_PRODUCT'; END IF;
  SELECT string_agg(format('%I', key), ',' ORDER BY key),
    string_agg(format('%I=EXCLUDED.%I',key,key), ',' ORDER BY key) FILTER(WHERE key<>'id')
    INTO columns_sql,updates_sql FROM jsonb_object_keys(p_payload) AS fields(key);
  previous_permission := current_setting('app.inventory_write',true);
  PERFORM set_config('app.inventory_write','allowed',true);
  EXECUTE format('INSERT INTO public.products (%s) SELECT %s FROM jsonb_populate_record(NULL::public.products,$1)
    ON CONFLICT(id) DO UPDATE SET %s RETURNING to_jsonb(products.*)', columns_sql,columns_sql,updates_sql)
    INTO result USING p_payload;
  PERFORM set_config('app.inventory_write',COALESCE(previous_permission,''),true);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_inventory_quantity_v1(
  p_product_id text, p_variant_id text, p_quantity integer, p_expected_revision bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE product public.products%ROWTYPE; previous_permission text;
BEGIN
  IF NOT COALESCE(public.is_admin(),false) THEN RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501'; END IF;
  IF p_quantity IS NULL OR p_quantity<0 OR p_expected_revision IS NULL THEN RAISE EXCEPTION 'INVALID_PRODUCT'; END IF;
  SELECT * INTO product FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
  IF product.inventory_revision<>p_expected_revision THEN RAISE EXCEPTION 'INVENTORY_CONFLICT'; END IF;
  IF p_variant_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM jsonb_array_elements(product.variants) v WHERE v->>'id'=p_variant_id
  ) THEN RAISE EXCEPTION 'VARIANT_UNAVAILABLE'; END IF;
  previous_permission := current_setting('app.inventory_write',true);
  PERFORM set_config('app.inventory_write','allowed',true);
  IF p_variant_id IS NULL THEN
    IF jsonb_array_length(COALESCE(product.variants,'[]'::jsonb))>0 THEN RAISE EXCEPTION 'VARIANT_REQUIRED'; END IF;
    UPDATE public.products SET stock=p_quantity WHERE id=p_product_id RETURNING * INTO product;
  ELSE
    UPDATE public.products SET variants=(SELECT jsonb_agg(CASE WHEN value->>'id'=p_variant_id
      THEN jsonb_set(value,'{stock}',to_jsonb(p_quantity)) ELSE value END ORDER BY ordinal)
      FROM jsonb_array_elements(product.variants) WITH ORDINALITY AS entries(value,ordinal))
      WHERE id=p_product_id RETURNING * INTO product;
  END IF;
  PERFORM set_config('app.inventory_write',COALESCE(previous_permission,''),true);
  RETURN to_jsonb(product);
END;
$$;

REVOKE ALL ON FUNCTION public.order_inventory_v1(), public.guard_product_inventory_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_checkout_order_v2(text,text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order_v2(text,text,jsonb,text) TO service_role;
REVOKE ALL ON FUNCTION public.update_order_inventory_v1(text,jsonb),
  public.save_product_inventory_v1(jsonb,bigint), public.set_inventory_quantity_v1(text,text,integer,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_order_inventory_v1(text,jsonb),
  public.save_product_inventory_v1(jsonb,bigint), public.set_inventory_quantity_v1(text,text,integer,bigint) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
