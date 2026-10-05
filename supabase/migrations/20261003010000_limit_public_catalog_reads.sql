-- Preserve all rows and verified admin access; non-admin users see only public content.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$
DECLARE target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['products','brands','hero_slides','social_reels','faqs','testimonials','blog_posts']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=target
      AND cmd='ALL' AND 'authenticated'=ANY(roles)
      AND qual LIKE '%is_admin%' AND with_check LIKE '%is_admin%') THEN
      RAISE EXCEPTION 'Secure administrator policy missing for %',target;
    END IF;
  END LOOP;
END $$;
ALTER POLICY "Public reads enabled products" ON public.products USING (enabled=true);
ALTER POLICY "Public reads enabled brands" ON public.brands USING (enabled=true);
ALTER POLICY "Public reads enabled hero slides" ON public.hero_slides USING (enabled=true);
ALTER POLICY "Public reads enabled social reels" ON public.social_reels USING (enabled=true);
ALTER POLICY "Public reads enabled faqs" ON public.faqs USING (enabled=true);
ALTER POLICY "Public reads enabled testimonials" ON public.testimonials USING (enabled=true);
ALTER POLICY "Public reads published blog posts" ON public.blog_posts USING (status='published');
COMMIT;
