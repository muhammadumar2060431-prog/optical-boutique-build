-- Migration: Add optional mobile_image column to hero_slides
-- Allows separate art-directed mobile hero banners (e.g. 1200x900 4:3)

ALTER TABLE public.hero_slides ADD COLUMN IF NOT EXISTS mobile_image text;

-- Rollback SQL:
-- ALTER TABLE public.hero_slides DROP COLUMN IF EXISTS mobile_image;
