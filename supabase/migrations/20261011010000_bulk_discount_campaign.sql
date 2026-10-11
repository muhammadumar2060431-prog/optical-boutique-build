BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE public.discount_campaigns (
  id text PRIMARY KEY CHECK (id = 'default'),
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'flat' CHECK (mode IN ('flat','upto')),
  percentage numeric(5,2) NOT NULL DEFAULT 20 CHECK (percentage BETWEEN 0 AND 100),
  category_rates jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(category_rates) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.discount_campaigns(id) VALUES ('default');
ALTER TABLE public.discount_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY discount_campaigns_public_read ON public.discount_campaigns FOR SELECT TO anon,authenticated USING (true);
GRANT SELECT ON public.discount_campaigns TO anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.discount_campaigns FROM anon,authenticated;

CREATE FUNCTION public.discounted_price_v1(p_price numeric,p_percentage numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT round(round(p_price,2) * (100 - p_percentage) / 100,2)
$$;

ALTER TABLE public.products
  ADD COLUMN bulk_discount_percent numeric(5,2) CHECK (bulk_discount_percent BETWEEN 0 AND 100),
  ADD COLUMN effective_price numeric(12,2) GENERATED ALWAYS AS (
    CASE WHEN bulk_discount_percent IS NOT NULL
      THEN public.discounted_price_v1(price,bulk_discount_percent)
      ELSE COALESCE(compare_at,price) END
  ) STORED;

CREATE FUNCTION public.apply_product_discount_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE campaign public.discount_campaigns%ROWTYPE; rate numeric;
BEGIN
  SELECT * INTO campaign FROM public.discount_campaigns WHERE id='default';
  IF campaign.enabled THEN
    rate := COALESCE((campaign.category_rates->>NEW.category_id)::numeric,campaign.percentage);
    NEW.bulk_discount_percent := NULLIF(rate,0);
  ELSE NEW.bulk_discount_percent := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apply_product_discount_v1 BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.apply_product_discount_v1();

CREATE FUNCTION public.save_discount_campaign_v1(p_enabled boolean,p_mode text,p_percentage numeric,p_category_rates jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE entry record; rate numeric; result jsonb;
BEGIN
  IF NOT COALESCE(public.is_admin(),false) THEN
    RAISE EXCEPTION 'Administrator permission required' USING ERRCODE='42501';
  END IF;
  IF p_enabled IS NULL OR p_mode IS NULL OR p_mode NOT IN ('flat','upto')
    OR p_percentage IS NULL OR p_percentage NOT BETWEEN 0 AND 100 OR p_percentage<>round(p_percentage,2)
    OR p_category_rates IS NULL OR jsonb_typeof(p_category_rates)<>'object' THEN
    RAISE EXCEPTION 'INVALID_DISCOUNT';
  END IF;
  FOR entry IN SELECT * FROM jsonb_each(p_category_rates) LOOP
    IF jsonb_typeof(entry.value)<>'number' OR NOT EXISTS(SELECT 1 FROM public.categories WHERE id=entry.key) THEN
      RAISE EXCEPTION 'INVALID_CATEGORY_DISCOUNT';
    END IF;
    rate := entry.value::text::numeric;
    IF rate NOT BETWEEN 0 AND 100 OR rate<>round(rate,2) OR (p_mode='upto' AND rate>p_percentage) THEN
      RAISE EXCEPTION 'INVALID_CATEGORY_DISCOUNT';
    END IF;
  END LOOP;
  -- Block concurrent catalog writes while changing every product's rate atomically.
  LOCK TABLE public.products IN SHARE ROW EXCLUSIVE MODE;
  UPDATE public.discount_campaigns SET enabled=p_enabled,mode=p_mode,percentage=p_percentage,
    category_rates=p_category_rates,updated_at=now() WHERE id='default' RETURNING to_jsonb(discount_campaigns.*) INTO result;
  UPDATE public.products SET bulk_discount_percent = CASE WHEN p_enabled
    THEN NULLIF(COALESCE((p_category_rates->>category_id)::numeric,p_percentage),0) ELSE NULL END
    WHERE bulk_discount_percent IS DISTINCT FROM CASE WHEN p_enabled
      THEN NULLIF(COALESCE((p_category_rates->>category_id)::numeric,p_percentage),0) ELSE NULL END;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_discount_campaign_v1(boolean,text,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_discount_campaign_v1(boolean,text,numeric,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.apply_product_discount_v1() FROM PUBLIC,anon,authenticated;

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
    NEW.currency := 'PKR'; NEW.stock_deducted := false; NEW.inventory_quantity := 0;
    IF NEW.product_id IS NULL AND NEW.source = 'whatsapp' THEN
      NEW.unit_price := NULL; NEW.total := 0; RETURN NEW;
    END IF;
  ELSE
    IF NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.unit_price IS DISTINCT FROM OLD.unit_price
      OR NEW.total IS DISTINCT FROM OLD.total OR NEW.currency IS DISTINCT FROM OLD.currency THEN
      RAISE EXCEPTION 'ORDER_SNAPSHOT_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
    NEW.stock_deducted := OLD.stock_deducted; NEW.inventory_quantity := OLD.inventory_quantity;
    IF NEW.status = 'Completed' AND NOT OLD.stock_deducted THEN
      IF OLD.quantity IS NULL THEN RAISE EXCEPTION 'LEGACY_QUANTITY_REQUIRED'; END IF;
      delta := -OLD.quantity;
    ELSIF NEW.status = 'Cancelled' AND OLD.stock_deducted THEN
      IF OLD.inventory_quantity <= 0 THEN RAISE EXCEPTION 'LEGACY_QUANTITY_REQUIRED'; END IF;
      delta := OLD.inventory_quantity;
    ELSE RETURN NEW; END IF;
    IF OLD.product_id IS NULL THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
    IF NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.variant_id IS DISTINCT FROM OLD.variant_id THEN
      RAISE EXCEPTION 'INVALID_ORDER';
    END IF;
  END IF;
  SELECT * INTO product FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF NOT FOUND OR (TG_OP = 'INSERT' AND NOT COALESCE(product.enabled,false)) THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;
  IF NEW.variant_id IS NOT NULL THEN
    SELECT value INTO variant FROM jsonb_array_elements(COALESCE(product.variants,'[]'::jsonb)) WHERE value->>'id'=NEW.variant_id;
    IF variant IS NULL OR variant->>'stock' IS NULL OR variant->>'stock' !~ '^[0-9]+$' THEN RAISE EXCEPTION 'VARIANT_UNAVAILABLE'; END IF;
    available := (variant->>'stock')::integer;
  ELSE
    IF jsonb_array_length(COALESCE(product.variants,'[]'::jsonb))>0 THEN RAISE EXCEPTION 'VARIANT_REQUIRED'; END IF;
    available := COALESCE(product.stock,0);
  END IF;
  IF TG_OP='INSERT' THEN
    IF available<NEW.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
    NEW.unit_price := CASE WHEN variant->>'price' IS NOT NULL
      THEN CASE WHEN product.bulk_discount_percent IS NOT NULL
        THEN public.discounted_price_v1((variant->>'price')::numeric,product.bulk_discount_percent)
        ELSE (variant->>'price')::numeric END
      ELSE product.effective_price END;
    IF NEW.unit_price IS NULL OR NEW.unit_price<0 THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
    NEW.total := NEW.unit_price*NEW.quantity; NEW.product_name := product.name; NEW.variant_label := variant->>'label';
    NEW.items := jsonb_build_array((NEW.items->0)||jsonb_build_object('quantity',NEW.quantity,
      'unitPrice',NEW.unit_price,'total',NEW.total,'currency',NEW.currency,'productName',NEW.product_name,'variantLabel',NEW.variant_label));
    RETURN NEW;
  END IF;
  IF available+delta<0 THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
  previous_permission := current_setting('app.inventory_write',true);
  PERFORM set_config('app.inventory_write','allowed',true);
  IF NEW.variant_id IS NULL THEN UPDATE public.products SET stock=available+delta WHERE id=product.id;
  ELSE UPDATE public.products SET variants=(SELECT jsonb_agg(CASE WHEN value->>'id'=NEW.variant_id
    THEN jsonb_set(value,'{stock}',to_jsonb(available+delta)) ELSE value END ORDER BY ordinal)
    FROM jsonb_array_elements(product.variants) WITH ORDINALITY AS entries(value,ordinal)) WHERE id=product.id;
  END IF;
  PERFORM set_config('app.inventory_write',COALESCE(previous_permission,''),true);
  NEW.stock_deducted := delta<0; NEW.inventory_quantity := CASE WHEN delta<0 THEN NEW.quantity ELSE 0 END;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.catalog_product_page_v1(p_category text DEFAULT NULL,p_collection text DEFAULT NULL,
  p_min numeric DEFAULT NULL,p_max numeric DEFAULT NULL,p_sort text DEFAULT 'newest',p_limit integer DEFAULT 12,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000000
    OR p_sort NOT IN ('newest','price-asc','price-desc') OR p_min<0 OR p_max<0 THEN RAISE EXCEPTION 'INVALID_PAGE'; END IF;
  WITH matched AS (SELECT * FROM public.products WHERE enabled=true
    AND (p_category IS NULL OR category_id=p_category) AND (p_collection IS NULL OR p_collection=ANY(collection_ids))
    AND (p_min IS NULL OR effective_price>=p_min) AND (p_max IS NULL OR effective_price<=p_max)),
  page AS (SELECT * FROM matched ORDER BY CASE WHEN p_sort='price-asc' THEN effective_price END ASC,
    CASE WHEN p_sort='price-desc' THEN effective_price END DESC,created_at DESC NULLS LAST,id DESC LIMIT p_limit OFFSET p_offset)
  SELECT jsonb_build_object('rows',COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::jsonb),'total',(SELECT count(*) FROM matched)) INTO result;
  RETURN result;
END $$;
CREATE INDEX products_effective_price_idx ON public.products(effective_price,id) WHERE enabled=true;
NOTIFY pgrst,'reload schema';
COMMIT;
