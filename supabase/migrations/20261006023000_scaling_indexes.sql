BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
DO $$ DECLARE pair record; a pg_index%ROWTYPE; b pg_index%ROWTYPE;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('idx_categories_sort','categories_sort_order_idx'),('idx_products_slug','products_slug_idx'),
    ('idx_products_created_at','products_created_at_idx'),('idx_orders_created','orders_created_at_idx'),
    ('idx_orders_reference','orders_reference_idx')) names(redundant,keeper) LOOP
    SELECT * INTO a FROM pg_index WHERE indexrelid=to_regclass('public.'||pair.redundant);
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT * INTO b FROM pg_index WHERE indexrelid=to_regclass('public.'||pair.keeper);
    IF NOT FOUND OR a.indisprimary OR a.indisunique OR NOT a.indisvalid OR NOT b.indisvalid
      OR EXISTS(SELECT 1 FROM pg_constraint WHERE conindid=a.indexrelid)
      OR ROW(a.indrelid,a.indkey,a.indclass,a.indcollation,a.indoption,a.indexprs::text,a.indpred::text,a.indisunique)
        IS DISTINCT FROM ROW(b.indrelid,b.indkey,b.indclass,b.indcollation,b.indoption,b.indexprs::text,b.indpred::text,b.indisunique) THEN
      RAISE EXCEPTION 'Index definitions differ: %',pair.redundant;
    END IF;
    EXECUTE format('DROP INDEX public.%I',pair.redundant);
  END LOOP;
END $$;
CREATE INDEX orders_active_page_idx ON public.orders(created_at DESC,id DESC) WHERE deleted_at IS NULL AND source<>'form';
CREATE INDEX queries_active_page_idx ON public.queries(created_at DESC,id DESC) WHERE deleted_at IS NULL;
CREATE INDEX subscribers_page_idx ON public.subscribers(created_at DESC,id DESC);
CREATE INDEX products_catalog_page_idx ON public.products(category_id,created_at DESC,id DESC) WHERE enabled=true;
CREATE INDEX orders_active_search_idx ON public.orders USING gin (
  (COALESCE(customer_name,'')||' '||COALESCE(product_name,'')||' '||COALESCE(reference,'')) extensions.gin_trgm_ops
) WHERE deleted_at IS NULL AND source<>'form';
CREATE INDEX queries_active_search_idx ON public.queries USING gin (
  (COALESCE(name,'')||' '||COALESCE(contact,'')||' '||COALESCE(product_name,'')||' '||COALESCE(message,'')) extensions.gin_trgm_ops
) WHERE deleted_at IS NULL;
CREATE INDEX subscribers_email_search_idx ON public.subscribers USING gin(email extensions.gin_trgm_ops);
COMMIT;
