-- Index the fields used by storefront routing, admin filtering, and order lookup.

CREATE INDEX IF NOT EXISTS products_slug_idx
  ON public.products (slug);
CREATE INDEX IF NOT EXISTS products_category_enabled_idx
  ON public.products (category_id, enabled);
CREATE INDEX IF NOT EXISTS products_created_at_idx
  ON public.products (created_at DESC);

CREATE INDEX IF NOT EXISTS collections_category_sort_idx
  ON public.collections (category_id, sort_order);
CREATE INDEX IF NOT EXISTS categories_sort_order_idx
  ON public.categories (sort_order);
CREATE INDEX IF NOT EXISTS hero_slides_enabled_sort_idx
  ON public.hero_slides (enabled, sort_order);

CREATE INDEX IF NOT EXISTS orders_reference_idx
  ON public.orders (reference);
CREATE INDEX IF NOT EXISTS orders_created_at_idx
  ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS queries_status_created_at_idx
  ON public.queries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS subscribers_email_lower_idx
  ON public.subscribers (lower(email));