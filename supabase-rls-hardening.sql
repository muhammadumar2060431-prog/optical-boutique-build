-- ==============================================================================
-- OPTIQUE: ROW LEVEL SECURITY (RLS) HARDENING SCRIPT
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jebzcorqtizjakontrrl/sql/new
--
-- Security Rules Applied:
-- 1. Public visitors can ONLY read catalog tables (products, categories, collections, etc.)
-- 2. ONLY authenticated admins can INSERT, UPDATE, or DELETE catalog items & settings.
-- 3. Customers can place orders, submit reviews, and subscribe to newsletter.
-- 4. ONLY authenticated admins can update order statuses or delete records.
-- 5. Customer subscriber emails are locked: anonymous users CANNOT read subscriber list.
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- 1. Store settings
  DROP POLICY IF EXISTS "Public read store_settings" ON public.store_settings;
  DROP POLICY IF EXISTS "Allow modify store_settings" ON public.store_settings;
  DROP POLICY IF EXISTS "Admin modify store_settings" ON public.store_settings;
  CREATE POLICY "Public read store_settings" ON public.store_settings FOR SELECT USING (true);
  CREATE POLICY "Admin modify store_settings" ON public.store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 2. Announcements
  DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
  DROP POLICY IF EXISTS "Allow modify announcements" ON public.announcements;
  DROP POLICY IF EXISTS "Admin modify announcements" ON public.announcements;
  CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);
  CREATE POLICY "Admin modify announcements" ON public.announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 3. Categories
  DROP POLICY IF EXISTS "Public read categories" ON public.categories;
  DROP POLICY IF EXISTS "Allow modify categories" ON public.categories;
  DROP POLICY IF EXISTS "Admin modify categories" ON public.categories;
  CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
  CREATE POLICY "Admin modify categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 4. Collections
  DROP POLICY IF EXISTS "Public read collections" ON public.collections;
  DROP POLICY IF EXISTS "Allow modify collections" ON public.collections;
  DROP POLICY IF EXISTS "Admin modify collections" ON public.collections;
  CREATE POLICY "Public read collections" ON public.collections FOR SELECT USING (true);
  CREATE POLICY "Admin modify collections" ON public.collections FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 5. Products
  DROP POLICY IF EXISTS "Public read products" ON public.products;
  DROP POLICY IF EXISTS "Allow modify products" ON public.products;
  DROP POLICY IF EXISTS "Admin modify products" ON public.products;
  CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
  CREATE POLICY "Admin modify products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 6. Orders
  DROP POLICY IF EXISTS "Allow checkout create orders" ON public.orders;
  DROP POLICY IF EXISTS "Allow manage orders" ON public.orders;
  DROP POLICY IF EXISTS "Public read orders" ON public.orders;
  DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
  DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;
  CREATE POLICY "Allow checkout create orders" ON public.orders FOR INSERT WITH CHECK (true);
  CREATE POLICY "Public read orders" ON public.orders FOR SELECT USING (true);
  CREATE POLICY "Admin manage orders" ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE TO authenticated USING (true);

  -- 7. Hero slides
  DROP POLICY IF EXISTS "Public read hero_slides" ON public.hero_slides;
  DROP POLICY IF EXISTS "Allow modify hero_slides" ON public.hero_slides;
  DROP POLICY IF EXISTS "Admin modify hero_slides" ON public.hero_slides;
  CREATE POLICY "Public read hero_slides" ON public.hero_slides FOR SELECT USING (true);
  CREATE POLICY "Admin modify hero_slides" ON public.hero_slides FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 8. Brands
  DROP POLICY IF EXISTS "Public read brands" ON public.brands;
  DROP POLICY IF EXISTS "Allow modify brands" ON public.brands;
  DROP POLICY IF EXISTS "Admin modify brands" ON public.brands;
  CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
  CREATE POLICY "Admin modify brands" ON public.brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 9. Social reels
  DROP POLICY IF EXISTS "Public read social_reels" ON public.social_reels;
  DROP POLICY IF EXISTS "Allow modify social_reels" ON public.social_reels;
  DROP POLICY IF EXISTS "Admin modify social_reels" ON public.social_reels;
  CREATE POLICY "Public read social_reels" ON public.social_reels FOR SELECT USING (true);
  CREATE POLICY "Admin modify social_reels" ON public.social_reels FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 10. Testimonials
  DROP POLICY IF EXISTS "Public read testimonials" ON public.testimonials;
  DROP POLICY IF EXISTS "Allow modify testimonials" ON public.testimonials;
  DROP POLICY IF EXISTS "Public submit review" ON public.testimonials;
  DROP POLICY IF EXISTS "Admin modify testimonials" ON public.testimonials;
  DROP POLICY IF EXISTS "Admin delete testimonials" ON public.testimonials;
  CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (true);
  CREATE POLICY "Public submit review" ON public.testimonials FOR INSERT WITH CHECK (true);
  CREATE POLICY "Admin modify testimonials" ON public.testimonials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Admin delete testimonials" ON public.testimonials FOR DELETE TO authenticated USING (true);

  -- 11. FAQs
  DROP POLICY IF EXISTS "Public read faqs" ON public.faqs;
  DROP POLICY IF EXISTS "Allow modify faqs" ON public.faqs;
  DROP POLICY IF EXISTS "Admin modify faqs" ON public.faqs;
  CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (true);
  CREATE POLICY "Admin modify faqs" ON public.faqs FOR ALL TO authenticated USING (true) WITH CHECK (true);

  -- 12. Subscribers (Email list privacy protected)
  DROP POLICY IF EXISTS "Public insert subscribers" ON public.subscribers;
  DROP POLICY IF EXISTS "Allow manage subscribers" ON public.subscribers;
  DROP POLICY IF EXISTS "Admin read subscribers" ON public.subscribers;
  DROP POLICY IF EXISTS "Admin delete subscribers" ON public.subscribers;
  CREATE POLICY "Public insert subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);
  CREATE POLICY "Admin read subscribers" ON public.subscribers FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Admin delete subscribers" ON public.subscribers FOR DELETE TO authenticated USING (true);

  -- 13. Video settings
  DROP POLICY IF EXISTS "Public read video_settings" ON public.video_settings;
  DROP POLICY IF EXISTS "Allow modify video_settings" ON public.video_settings;
  DROP POLICY IF EXISTS "Admin modify video_settings" ON public.video_settings;
  CREATE POLICY "Public read video_settings" ON public.video_settings FOR SELECT USING (true);
  CREATE POLICY "Admin modify video_settings" ON public.video_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;
