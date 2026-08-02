DROP POLICY IF EXISTS "Public read nav_items" ON public.nav_items;
CREATE POLICY "Anon read enabled nav_items" ON public.nav_items FOR SELECT TO anon USING (enabled);
CREATE POLICY "Auth read nav_items" ON public.nav_items FOR SELECT TO authenticated
  USING (enabled OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "home_slides admin write" ON public.home_slides;
CREATE POLICY "home_slides admin write" ON public.home_slides FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "home_stats admin write" ON public.home_stats;
CREATE POLICY "home_stats admin write" ON public.home_stats FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "home_posts admin write" ON public.home_posts;
CREATE POLICY "home_posts admin write" ON public.home_posts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));