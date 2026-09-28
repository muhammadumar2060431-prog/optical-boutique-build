-- Align legacy content tables with the current admin application.
-- Additive and safe to run more than once.

ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS link TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS eyebrow TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS headline TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS subtext TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_link TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

UPDATE public.hero_slides
SET
  headline = COALESCE(NULLIF(headline, ''), title, ''),
  subtext = COALESCE(NULLIF(subtext, ''), subtitle, ''),
  cta_text = COALESCE(NULLIF(cta_text, ''), button_text, ''),
  cta_link = COALESCE(NULLIF(cta_link, ''), link, '');

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS background TEXT DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.announcements
SET
  enabled = COALESCE(enabled, active, true),
  messages = CASE
    WHEN jsonb_typeof(messages) = 'array' AND jsonb_array_length(messages) > 0 THEN messages
    WHEN NULLIF(text, '') IS NOT NULL THEN jsonb_build_array(text)
    WHEN NULLIF(message, '') IS NOT NULL THEN jsonb_build_array(message)
    ELSE '[]'::jsonb
  END,
  background = COALESCE(NULLIF(background, ''), '#000000'),
  text_color = COALESCE(NULLIF(text_color, ''), '#ffffff'),
  updated_at = COALESCE(updated_at, NOW());

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin modify announcements" ON public.announcements;

CREATE POLICY "Public read announcements"
  ON public.announcements FOR SELECT
  USING (true);

CREATE POLICY "Admin modify announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'optique-images',
  'optique-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read optique images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload optique images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update optique images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete optique images" ON storage.objects;

CREATE POLICY "Public read optique images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'optique-images');

CREATE POLICY "Admin upload optique images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'optique-images');

CREATE POLICY "Admin update optique images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'optique-images')
  WITH CHECK (bucket_id = 'optique-images');

CREATE POLICY "Admin delete optique images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'optique-images');