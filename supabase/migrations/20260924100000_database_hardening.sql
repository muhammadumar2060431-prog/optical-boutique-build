-- Bring existing projects onto the canonical application contract without deleting data.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS banner JSONB,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS banner JSONB,
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compare_at NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS collection_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hover_image TEXT,
  ADD COLUMN IF NOT EXISTS new_arrival_image TEXT,
  ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS frame_fit TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.social_reels
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Reel',
  ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'instagram',
  ADD COLUMN IF NOT EXISTS thumbnail TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS creator_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS creator_handle TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '00:30',
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS review TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS question TEXT,
  ADD COLUMN IF NOT EXISTS answer TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS variant_id TEXT,
  ADD COLUMN IF NOT EXISTS variant_label TEXT,
  ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'cart',
  ADD COLUMN IF NOT EXISTS courier_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.queries
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS contact TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT 'General enquiry',
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT 'OPTIQUE',
  ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS hours TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS admin_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_headline TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_body TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.video_settings
  ADD COLUMN IF NOT EXISTS locked_channel TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill only values that have a clear canonical source.
UPDATE public.orders
SET
  reference = COALESCE(reference, items->0->>'reference'),
  product_id = COALESCE(product_id, items->0->>'productId'),
  product_name = COALESCE(product_name, items->0->>'productName'),
  variant_id = COALESCE(variant_id, items->0->>'variantId'),
  variant_label = COALESCE(variant_label, items->0->>'variantLabel'),
  courier_name = COALESCE(courier_name, items->0->>'courierName'),
  tracking_number = COALESCE(tracking_number, items->0->>'trackingNumber')
WHERE jsonb_typeof(items) = 'array';

UPDATE public.collections SET show_in_nav = true WHERE show_in_nav IS NULL;
UPDATE public.subscribers SET status = 'active' WHERE status IS NULL;

-- Constraints are enforced for new rows while legacy rows can be repaired separately.
DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('products_price_nonnegative', 'products', 'CHECK (price >= 0)'),
    ('products_compare_at_nonnegative', 'products', 'CHECK (compare_at IS NULL OR compare_at >= 0)'),
    ('products_stock_nonnegative', 'products', 'CHECK (stock >= 0)'),
    ('testimonials_rating_range', 'testimonials', 'CHECK (rating BETWEEN 1 AND 5)'),
    ('testimonials_source_allowed', 'testimonials', 'CHECK (source IN (''manual'', ''customer''))'),
    ('orders_source_allowed', 'orders', 'CHECK (source IN (''cart'', ''whatsapp'', ''form''))'),
    ('orders_status_allowed', 'orders', 'CHECK (status IN (''New'', ''Contacted'', ''Dispatched'', ''Completed'', ''Cancelled'', ''Responded'', ''Archived''))'),
    ('orders_total_nonnegative', 'orders', 'CHECK (total >= 0)'),
    ('orders_items_array', 'orders', 'CHECK (jsonb_typeof(items) = ''array'')'),
    ('queries_status_allowed', 'queries', 'CHECK (status IN (''New'', ''Responded'', ''Archived''))'),
    ('subscribers_status_allowed', 'subscribers', 'CHECK (status IN (''active'', ''unsubscribed''))'),
    ('subscribers_email_shape', 'subscribers', 'CHECK (email ~* ''^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'')'),
    ('settings_stock_threshold_nonnegative', 'store_settings', 'CHECK (low_stock_threshold >= 0)')
  ) AS constraints_to_add(name, table_name, definition)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = constraints_to_add.name
  )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I %s NOT VALID',
      item.table_name,
      item.name,
      item.definition
    );
  END LOOP;
END
$$;

-- New writes must preserve relations; NOT VALID avoids rejecting pre-existing orphan rows.
DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('collections_category_fk', 'collections', 'category_id', 'categories'),
    ('products_category_fk', 'products', 'category_id', 'categories'),
    ('social_reels_product_fk', 'social_reels', 'product_id', 'products'),
    ('testimonials_product_fk', 'testimonials', 'product_id', 'products'),
    ('queries_product_fk', 'queries', 'product_id', 'products'),
    ('orders_product_fk', 'orders', 'product_id', 'products')
  ) AS foreign_keys(name, table_name, column_name, target_table)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = foreign_keys.name
  )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE SET NULL NOT VALID',
      item.table_name,
      item.name,
      item.column_name,
      item.target_table
    );
  END LOOP;
END
$$;

-- Indexes mirror storefront ordering, admin filtering, joins, and normalized order lookup.
DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('categories_slug_unique_idx', 'categories'),
    ('collections_slug_unique_idx', 'collections'),
    ('products_slug_unique_idx', 'products')
  ) AS slug_indexes(index_name, table_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = item.index_name
    ) THEN
      BEGIN
        EXECUTE format(
          'CREATE UNIQUE INDEX %I ON public.%I (lower(slug)) WHERE slug IS NOT NULL',
          item.index_name,
          item.table_name
        );
      EXCEPTION WHEN unique_violation THEN
        RAISE WARNING 'Skipped % because legacy duplicate slugs exist', item.index_name;
      END;
    END IF;
  END LOOP;
END
$$;
CREATE INDEX IF NOT EXISTS products_storefront_idx ON public.products (category_id, created_at DESC) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS products_featured_idx ON public.products (featured, created_at DESC) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS products_collection_ids_gin_idx ON public.products USING gin (collection_ids);
CREATE INDEX IF NOT EXISTS products_details_gin_idx ON public.products USING gin (details jsonb_path_ops);
CREATE INDEX IF NOT EXISTS social_reels_product_sort_idx ON public.social_reels (product_id, sort_order) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS testimonials_product_sort_idx ON public.testimonials (product_id, sort_order) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS faqs_home_sort_idx ON public.faqs (show_on_home, sort_order) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS orders_reference_normalized_idx ON public.orders (
  (regexp_replace(upper(COALESCE(reference, items->0->>'reference', '')), '[^A-Z0-9]', '', 'g'))
) WHERE source <> 'form';
CREATE INDEX IF NOT EXISTS orders_product_created_idx ON public.orders (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS queries_product_created_idx ON public.queries (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscribers_created_at_idx ON public.subscribers (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['products', 'store_settings', 'announcements', 'video_settings', 'blog_posts']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name
    );
  END LOOP;
END
$$;

-- Subscriber insertion is atomic and does not create repeated addresses.
CREATE OR REPLACE FUNCTION public.subscribe_email(p_id TEXT, p_email TEXT)
RETURNS TABLE (id TEXT, email TEXT, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_email TEXT := lower(trim(p_email));
BEGIN
  IF char_length(p_id) NOT BETWEEN 1 AND 100
    OR char_length(normalized_email) NOT BETWEEN 3 AND 320
    OR normalized_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  THEN
    RAISE EXCEPTION 'Invalid subscriber data' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(normalized_email));

  RETURN QUERY
  SELECT s.id, s.email, s.status, s.created_at
  FROM public.subscribers AS s
  WHERE lower(s.email) = normalized_email
  ORDER BY s.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    INSERT INTO public.subscribers (id, email, status)
    VALUES (p_id, normalized_email, 'active')
    RETURNING subscribers.id, subscribers.email, subscribers.status, subscribers.created_at;
  END IF;
END;
$$;

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
    o.id,
    COALESCE(o.reference, o.items->0->>'reference'),
    o.created_at,
    split_part(o.customer_name, ' ', 1),
    COALESCE(o.product_name, o.items->0->>'productName', 'Glasses'),
    COALESCE(o.variant_label, o.items->0->>'variantLabel'),
    o.source,
    o.status,
    COALESCE(o.courier_name, o.items->0->>'courierName'),
    COALESCE(o.tracking_number, o.items->0->>'trackingNumber'),
    o.dispatched_at
  FROM public.orders AS o
  CROSS JOIN input
  WHERE o.source <> 'form'
    AND char_length(input.normalized_reference) BETWEEN 9 AND 32
    AND regexp_replace(
      upper(COALESCE(o.reference, o.items->0->>'reference', '')),
      '[^A-Z0-9]',
      '',
      'g'
    ) = input.normalized_reference
  ORDER BY o.created_at DESC
  LIMIT 20;
$$;

-- Replace broad or legacy policies with one explicit access model.
DO $$
DECLARE
  table_name TEXT;
  policy_record RECORD;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products', 'categories', 'collections', 'hero_slides', 'brands', 'social_reels',
    'testimonials', 'faqs', 'orders', 'queries', 'subscribers', 'store_settings',
    'announcements', 'video_settings', 'blog_posts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    FOR policy_record IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
    END LOOP;
  END LOOP;
END
$$;

CREATE POLICY "Public reads enabled products" ON public.products FOR SELECT
  USING (enabled = true OR auth.role() = 'authenticated');
CREATE POLICY "Public reads categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public reads collections" ON public.collections FOR SELECT USING (true);
CREATE POLICY "Public reads enabled hero slides" ON public.hero_slides FOR SELECT
  USING (enabled = true OR auth.role() = 'authenticated');
CREATE POLICY "Public reads enabled brands" ON public.brands FOR SELECT
  USING (enabled = true OR auth.role() = 'authenticated');
CREATE POLICY "Public reads enabled social reels" ON public.social_reels FOR SELECT
  USING (enabled = true OR auth.role() = 'authenticated');
CREATE POLICY "Public reads enabled testimonials" ON public.testimonials FOR SELECT
  USING (enabled = true OR auth.role() = 'authenticated');
CREATE POLICY "Public reads enabled faqs" ON public.faqs FOR SELECT
  USING (enabled = true OR auth.role() = 'authenticated');
CREATE POLICY "Public reads store settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Public reads announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public reads enabled video" ON public.video_settings FOR SELECT
  USING (enabled = true OR auth.role() = 'authenticated');
CREATE POLICY "Public reads published blog posts" ON public.blog_posts FOR SELECT
  USING (status = 'published' OR auth.role() = 'authenticated');

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
CREATE POLICY "Public creates valid queries" ON public.queries FOR INSERT TO anon
  WITH CHECK (
    status = 'New'
    AND char_length(id) BETWEEN 1 AND 100
    AND char_length(name) BETWEEN 1 AND 120
    AND char_length(contact) BETWEEN 3 AND 320
    AND char_length(message) BETWEEN 1 AND 2000
  );

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products', 'categories', 'collections', 'hero_slides', 'brands', 'social_reels',
    'testimonials', 'faqs', 'orders', 'queries', 'subscribers', 'store_settings',
    'announcements', 'video_settings', 'blog_posts'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "Authenticated users manage %s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      table_name,
      table_name
    );
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public.lookup_order_by_reference(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order_by_reference(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.subscribe_email(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_email(TEXT, TEXT) TO anon, authenticated;

-- Anonymous subscribers use subscribe_email(), not direct table writes.
REVOKE INSERT ON public.subscribers FROM anon;

GRANT SELECT ON public.products, public.categories, public.collections, public.hero_slides,
  public.brands, public.social_reels, public.testimonials, public.faqs,
  public.store_settings, public.announcements, public.video_settings, public.blog_posts
  TO anon, authenticated;
GRANT INSERT ON public.orders, public.queries TO anon;
GRANT ALL ON public.products, public.categories, public.collections, public.hero_slides,
  public.brands, public.social_reels, public.testimonials, public.faqs, public.orders,
  public.queries, public.subscribers, public.store_settings, public.announcements,
  public.video_settings, public.blog_posts TO authenticated;

-- Publish every table consumed by the app's single realtime channel.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products', 'categories', 'collections', 'hero_slides', 'brands', 'social_reels',
    'testimonials', 'faqs', 'orders', 'queries', 'subscribers', 'store_settings',
    'announcements', 'video_settings', 'blog_posts'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END
$$;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'optique-images',
  'optique-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
