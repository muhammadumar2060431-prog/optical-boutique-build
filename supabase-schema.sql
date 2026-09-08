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
  link_text TEXT DEFAULT 'Book consultation',
  link_url TEXT DEFAULT '/contact'
);

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
  description TEXT,
  frame_fit TEXT,
  variants JSONB DEFAULT '[]',
  stock INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  author TEXT NOT NULL,
  role TEXT DEFAULT '',
  text TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  avatar TEXT,
  verified BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
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
-- ROW LEVEL SECURITY (RLS) POLICIES
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

-- Helper to drop policy if exists then recreate
DO $$
BEGIN
  -- Store settings policies
  DROP POLICY IF EXISTS "Public read store_settings" ON public.store_settings;
  CREATE POLICY "Public read store_settings" ON public.store_settings FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify store_settings" ON public.store_settings;
  CREATE POLICY "Allow modify store_settings" ON public.store_settings FOR ALL USING (true);

  -- Announcements policies
  DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
  CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify announcements" ON public.announcements;
  CREATE POLICY "Allow modify announcements" ON public.announcements FOR ALL USING (true);

  -- Categories policies
  DROP POLICY IF EXISTS "Public read categories" ON public.categories;
  CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify categories" ON public.categories;
  CREATE POLICY "Allow modify categories" ON public.categories FOR ALL USING (true);

  -- Collections policies
  DROP POLICY IF EXISTS "Public read collections" ON public.collections;
  CREATE POLICY "Public read collections" ON public.collections FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify collections" ON public.collections;
  CREATE POLICY "Allow modify collections" ON public.collections FOR ALL USING (true);

  -- Products policies
  DROP POLICY IF EXISTS "Public read products" ON public.products;
  CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify products" ON public.products;
  CREATE POLICY "Allow modify products" ON public.products FOR ALL USING (true);

  -- Orders policies
  DROP POLICY IF EXISTS "Allow checkout create orders" ON public.orders;
  CREATE POLICY "Allow checkout create orders" ON public.orders FOR INSERT WITH CHECK (true);
  DROP POLICY IF EXISTS "Allow manage orders" ON public.orders;
  CREATE POLICY "Allow manage orders" ON public.orders FOR ALL USING (true);

  -- Hero slides policies
  DROP POLICY IF EXISTS "Public read hero_slides" ON public.hero_slides;
  CREATE POLICY "Public read hero_slides" ON public.hero_slides FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify hero_slides" ON public.hero_slides;
  CREATE POLICY "Allow modify hero_slides" ON public.hero_slides FOR ALL USING (true);

  -- Brands policies
  DROP POLICY IF EXISTS "Public read brands" ON public.brands;
  CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify brands" ON public.brands;
  CREATE POLICY "Allow modify brands" ON public.brands FOR ALL USING (true);

  -- Social reels policies
  DROP POLICY IF EXISTS "Public read social_reels" ON public.social_reels;
  CREATE POLICY "Public read social_reels" ON public.social_reels FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify social_reels" ON public.social_reels;
  CREATE POLICY "Allow modify social_reels" ON public.social_reels FOR ALL USING (true);

  -- Testimonials policies
  DROP POLICY IF EXISTS "Public read testimonials" ON public.testimonials;
  CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify testimonials" ON public.testimonials;
  CREATE POLICY "Allow modify testimonials" ON public.testimonials FOR ALL USING (true);

  -- FAQs policies
  DROP POLICY IF EXISTS "Public read faqs" ON public.faqs;
  CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify faqs" ON public.faqs;
  CREATE POLICY "Allow modify faqs" ON public.faqs FOR ALL USING (true);

  -- Subscribers policies
  DROP POLICY IF EXISTS "Public insert subscribers" ON public.subscribers;
  CREATE POLICY "Public insert subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);
  DROP POLICY IF EXISTS "Allow manage subscribers" ON public.subscribers;
  CREATE POLICY "Allow manage subscribers" ON public.subscribers FOR ALL USING (true);

  -- Video settings policies
  DROP POLICY IF EXISTS "Public read video_settings" ON public.video_settings;
  CREATE POLICY "Public read video_settings" ON public.video_settings FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Allow modify video_settings" ON public.video_settings;
  CREATE POLICY "Allow modify video_settings" ON public.video_settings FOR ALL USING (true);
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

-- Default single-record rows
INSERT INTO public.store_settings (id, store_name, whatsapp, phone, email, address, hours, logo, low_stock_threshold)
VALUES ('default', 'OPTIQUE', '923001234567', '+92 300 1234567', 'info@optique.com', 'Main Boulevard, Gulberg III, Lahore', 'Mon - Sat: 11:00 AM - 9:00 PM', '/brand-logo.png', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.announcements (id, enabled, message, link_text, link_url)
VALUES ('default', true, 'Complimentary anti-reflective coating on all prescription frames this month.', 'Book consultation', '/contact')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.video_settings (id, url, title, caption, enabled)
VALUES ('default', '', 'In the Workshop', 'Every pair hand-finished by our master opticians', true)
ON CONFLICT (id) DO NOTHING;
