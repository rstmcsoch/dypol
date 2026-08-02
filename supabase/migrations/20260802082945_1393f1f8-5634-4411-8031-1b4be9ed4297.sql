CREATE TABLE public.home_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text,
  caption text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.home_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_slides TO authenticated;
GRANT ALL ON public.home_slides TO service_role;
ALTER TABLE public.home_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_slides public read" ON public.home_slides FOR SELECT USING (true);
CREATE POLICY "home_slides admin write" ON public.home_slides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER home_slides_updated_at BEFORE UPDATE ON public.home_slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.home_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.home_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_stats TO authenticated;
GRANT ALL ON public.home_stats TO service_role;
ALTER TABLE public.home_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_stats public read" ON public.home_stats FOR SELECT USING (true);
CREATE POLICY "home_stats admin write" ON public.home_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER home_stats_updated_at BEFORE UPDATE ON public.home_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.home_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  role_title text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text,
  link text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.home_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_posts TO authenticated;
GRANT ALL ON public.home_posts TO service_role;
ALTER TABLE public.home_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_posts public read" ON public.home_posts FOR SELECT USING (true);
CREATE POLICY "home_posts admin write" ON public.home_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER home_posts_updated_at BEFORE UPDATE ON public.home_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.home_slides (caption, link, sort_order) VALUES
  ('Add your first slide image in Admin → Home', '', 10),
  ('Slides auto-play and pause on hover', '', 20),
  ('Drop banners, toppers, or announcements here', '', 30);

INSERT INTO public.home_stats (label, value, unit, caption, sort_order) VALUES
  ('Materials', 120, '+', 'Curated resources', 10),
  ('Portals', 24, '', 'Coaching launchers', 20),
  ('Essentials', 40, '+', 'Study products', 30),
  ('Students', 850, '+', 'Learning with Dypol', 40);

INSERT INTO public.home_posts (name, role_title, bio, link, sort_order) VALUES
  ('Your Name', 'Founder & Developer', 'Add team members, developers, or featured people from Admin → Home.', '', 10),
  ('Team Member', 'Content Curator', 'Each card supports a photo, role, short bio and an optional link.', '', 20),
  ('Guest Author', 'Mentor', 'Cards auto-slide and pause when hovered or tapped.', '', 30);