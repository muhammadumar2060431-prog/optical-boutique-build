ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS show_on_pages text[] NOT NULL DEFAULT '{}';

UPDATE public.faqs
SET show_on_pages = ARRAY['home']
WHERE show_on_home = true AND show_on_pages = '{}';

ALTER TABLE public.faqs
  ADD CONSTRAINT faqs_valid_page_placements
  CHECK (show_on_pages <@ ARRAY['home', 'about', 'contact', 'cart', 'checkout', 'tracking']::text[]);
