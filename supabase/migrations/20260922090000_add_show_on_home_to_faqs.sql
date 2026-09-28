-- Add the home-page visibility flag to FAQs.
ALTER TABLE IF EXISTS public.faqs
ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT FALSE;

-- Update existing records to default FALSE
UPDATE public.faqs
SET show_on_home = FALSE
WHERE show_on_home IS NULL;
