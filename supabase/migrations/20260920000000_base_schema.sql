-- Canonical schema bootstrap for clean Supabase deployments.
-- Every statement is idempotent so this migration is also safe for an existing project.

CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  image TEXT,
  banner JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  category_id TEXT,
  banner JSONB,
  description TEXT NOT NULL DEFAULT '',
  show_in_nav BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  compare_at NUMERIC(12, 2),
  category_id TEXT,
  collection_ids TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  hover_image TEXT,
  new_arrival_image TEXT,
  is_new_arrival BOOLEAN NOT NULL DEFAULT false,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL DEFAULT '',
  frame_fit TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  stock INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id TEXT PRIMARY KEY,
  image TEXT NOT NULL DEFAULT '',
  eyebrow TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  subtext TEXT NOT NULL DEFAULT '',
  cta_text TEXT NOT NULL DEFAULT '',
  cta_link TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  button_text TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.social_reels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Reel',
  video_url TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'instagram',
  thumbnail TEXT NOT NULL DEFAULT '',
  creator_name TEXT NOT NULL DEFAULT '',
  creator_handle TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '00:30',
  product_id TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.testimonials (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'manual',
  name TEXT NOT NULL,
  review TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL DEFAULT 5,
  avatar TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT true,
  email TEXT,
  product_id TEXT,
  product_name TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  enabled BOOLEAN NOT NULL DEFAULT true,
  show_on_home BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  reference TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'N/A',
  product_id TEXT,
  product_name TEXT,
  variant_id TEXT,
  variant_label TEXT,
  stock_deducted BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'cart',
  courier_name TEXT,
  tracking_number TEXT,
  dispatched_at TIMESTAMPTZ,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.queries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT 'General enquiry',
  product_id TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT NOT NULL DEFAULT 'OPTIQUE',
  whatsapp TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  hours TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  low_stock_threshold INTEGER NOT NULL DEFAULT 3,
  admin_email TEXT NOT NULL DEFAULT '',
  about_headline TEXT NOT NULL DEFAULT '',
  about_body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY DEFAULT 'default',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  text TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  background TEXT NOT NULL DEFAULT '#000000',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  locked_channel TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  video_id TEXT,
  caption TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
