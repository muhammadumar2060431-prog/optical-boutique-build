-- Pending SQL deployment: definition changes only; no rows or Storage objects are deleted.
BEGIN;

DO $$
DECLARE
  target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['products', 'categories', 'collections', 'hero_slides',
    'brands', 'social_reels', 'testimonials', 'faqs', 'orders', 'queries', 'subscribers',
    'store_settings', 'announcements', 'video_settings', 'blog_posts']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target
        AND policyname = 'Administrators manage ' || replace(target, '_', ' ')
        AND cmd = 'ALL' AND 'authenticated' = ANY(roles)
        AND qual LIKE '%is_admin%' AND with_check LIKE '%is_admin%'
    ) THEN
      RAISE EXCEPTION 'Secure administrator policy is missing for %; aborting without changes', target;
    END IF;
    -- Older migrations used both underscore and space variants of this name.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users manage ' || target, target);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated users manage ' || replace(target, '_', ' '), target);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_linked_catalog_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'categories' THEN
    IF EXISTS (SELECT 1 FROM public.products WHERE category_id = OLD.id)
      OR EXISTS (SELECT 1 FROM public.collections WHERE category_id = OLD.id) THEN
      RAISE EXCEPTION 'Move linked products and collections before deleting the category'
        USING ERRCODE = '23503';
    END IF;
  ELSIF TG_TABLE_NAME = 'collections' THEN
    IF EXISTS (SELECT 1 FROM public.products WHERE collection_ids @> ARRAY[OLD.id]::TEXT[]) THEN
      RAISE EXCEPTION 'Move linked products before deleting the collection'
        USING ERRCODE = '23503';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_linked_catalog_delete() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_linked_category_delete ON public.categories;
CREATE TRIGGER prevent_linked_category_delete BEFORE DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_catalog_delete();
DROP TRIGGER IF EXISTS prevent_linked_collection_delete ON public.collections;
CREATE TRIGGER prevent_linked_collection_delete BEFORE DELETE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.prevent_linked_catalog_delete();

CREATE OR REPLACE FUNCTION public.validate_product_collection_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  collection_id TEXT;
BEGIN
  FOREACH collection_id IN ARRAY COALESCE(NEW.collection_ids, ARRAY[]::TEXT[])
  LOOP
    -- Protect referenced rows against concurrent deletion until this write commits.
    PERFORM 1 FROM public.collections WHERE id = collection_id FOR KEY SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product references a missing collection' USING ERRCODE = '23503';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_product_collection_links() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS validate_product_collection_links ON public.products;
CREATE TRIGGER validate_product_collection_links BEFORE INSERT OR UPDATE OF collection_ids
ON public.products FOR EACH ROW EXECUTE FUNCTION public.validate_product_collection_links();

COMMIT;
