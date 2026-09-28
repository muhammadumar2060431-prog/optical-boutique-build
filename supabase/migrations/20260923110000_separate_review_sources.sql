ALTER TABLE IF EXISTS public.testimonials
-- Distinguish curated testimonials from customer reviews.
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
CHECK (source IN ('manual', 'customer'));

CREATE INDEX IF NOT EXISTS testimonials_source_product_idx
ON public.testimonials(source, product_id);
