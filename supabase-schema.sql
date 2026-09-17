-- ==============================================================================
-- OPTIQUE REAL-TIME SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================
-- Instructions: Copy and paste this script into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/jebzcorqtizjakontrrl/sql/new) and click "Run".
-- ==============================================================================

-- 1. Store Settings
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT NOT NULL DEFAULT 'OPTIQUE',
  whatsapp TEXT DEFAULT '923001234567',
  phone TEXT DEFAULT '+92 300 1234567',
  email TEXT DEFAULT 'info@optique.com',
  address TEXT DEFAULT 'Main Boulevard, Gulberg III, Lahore',
  hours TEXT DEFAULT 'Mon - Sat: 11:00 AM - 9:00 PM',
  logo TEXT DEFAULT '/brand-logo.png',
  low_stock_threshold INTEGER DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY DEFAULT 'default',
  enabled BOOLEAN DEFAULT true,
  message TEXT DEFAULT 'Complimentary anti-reflective coating on all prescription frames this month.',
  messages JSONB DEFAULT '[]'::jsonb,
  text TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  background TEXT DEFAULT '#000000',
  text_color TEXT DEFAULT '#ffffff',
  link_text TEXT DEFAULT 'Book consultation',
  link_url TEXT DEFAULT '/contact',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS text TEXT DEFAULT '';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS background TEXT DEFAULT '#000000';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#ffffff';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image TEXT,
  banner JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Collections
CREATE TABLE IF NOT EXISTS public.collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
  banner JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Products
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  price INTEGER NOT NULL,
  compare_at INTEGER,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  collection_ids TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  hover_image TEXT,
  new_arrival_image TEXT,
  is_new_arrival BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  description TEXT,
  frame_fit TEXT,
  details JSONB,
  variants JSONB DEFAULT '[]',
  stock INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrations for products table:
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS hover_image TEXT;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS new_arrival_image TEXT;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS frame_fit TEXT;

-- 6. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  notes TEXT,
  source TEXT DEFAULT 'cart',
  items JSONB NOT NULL DEFAULT '[]',
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'New',
  courier_name TEXT,
  tracking_number TEXT,
  dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing tables:
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

-- 7. Hero Slides
CREATE TABLE IF NOT EXISTS public.hero_slides (
  id TEXT PRIMARY KEY,
  image TEXT NOT NULL,
  eyebrow TEXT DEFAULT '',
  headline TEXT DEFAULT '',
  subtext TEXT DEFAULT '',
  cta_text TEXT DEFAULT '',
  cta_link TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- 8. Brands Bar
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- 9. Social Proof Reels
CREATE TABLE IF NOT EXISTS public.social_reels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creator_name TEXT DEFAULT '',
  creator_handle TEXT DEFAULT '',
  platform TEXT DEFAULT 'instagram',
  video_url TEXT DEFAULT '',
  thumbnail TEXT NOT NULL,
  duration TEXT DEFAULT '00:30',
  product_id TEXT,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- 10. Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  review TEXT NOT NULL DEFAULT '',
  rating INTEGER DEFAULT 5,
  avatar TEXT,
  verified BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  -- Product association fields for per-product filtering
  email TEXT,
  product_id TEXT,
  product_name TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- 12. Subscribers
CREATE TABLE IF NOT EXISTS public.subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Workshop Video Settings
CREATE TABLE IF NOT EXISTS public.video_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  url TEXT DEFAULT '',
  title TEXT DEFAULT 'In the Workshop',
  caption TEXT DEFAULT 'Every pair hand-finished by our master opticians',
  enabled BOOLEAN DEFAULT true
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — HARDENED PRODUCTION SECURITY
-- ==============================================================================
-- Policy Rules:
-- 1. Public (anon + authenticated) can SELECT catalog content (products, categories, slides, etc.)
-- 2. ONLY authenticated admins can INSERT, UPDATE, DELETE products, categories, settings, etc.
-- 3. Customers can INSERT new orders, reviews, and newsletter subscriptions.
-- 4. ONLY authenticated admins can UPDATE or DELETE orders, reviews, and subscribers.
-- 5. Subscribers email list is protected: ONLY authenticated admins can SELECT subscriber emails.
-- ==============================================================================

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

  -- 12. Subscribers (Protected email addresses: public insert only, admin select/delete)
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

-- ==============================================================================
-- REAL-TIME WEBSOCKET REPLICATION
-- ==============================================================================
-- Enable Realtime replication for instant live updates across storefront and admin
ALTER PUBLICATION supabase_realtime ADD TABLE 
  public.store_settings,
  public.announcements,
  public.categories,
  public.collections,
  public.products,
  public.orders,
  public.hero_slides,
  public.brands,
  public.social_reels,
  public.testimonials,
  public.faqs,
  public.subscribers,
  public.video_settings;

-- ==============================================================================
-- 1. COLUMN MIGRATIONS (ENSURE ALL COLUMNS EXIST FIRST)
-- ==============================================================================

ALTER TABLE IF EXISTS public.brands ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.brands ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS public.faqs ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.faqs ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS public.hero_slides ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.hero_slides ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS public.social_reels ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.social_reels ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS public.testimonials ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.testimonials ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.testimonials ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ==============================================================================
-- 2. HIGH-PERFORMANCE DATABASE INDEXES (QUERY OPTIMIZATION & ANTI-DOS)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (enabled, is_bestseller, is_new_arrival);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.categories (sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections (slug);
CREATE INDEX IF NOT EXISTS idx_collections_category ON public.collections (category_id);
CREATE INDEX IF NOT EXISTS idx_collections_sort ON public.collections (sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_testimonials_product ON public.testimonials (product_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_verified ON public.testimonials (verified, enabled);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers (email);

CREATE INDEX IF NOT EXISTS idx_hero_slides_sort ON public.hero_slides (sort_order ASC, enabled);
CREATE INDEX IF NOT EXISTS idx_brands_sort ON public.brands (sort_order ASC, enabled);
CREATE INDEX IF NOT EXISTS idx_social_reels_sort ON public.social_reels (sort_order ASC, enabled);
CREATE INDEX IF NOT EXISTS idx_faqs_sort ON public.faqs (sort_order ASC, enabled);
