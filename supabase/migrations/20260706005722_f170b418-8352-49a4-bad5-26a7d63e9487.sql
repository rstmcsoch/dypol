
-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  target TEXT,
  avatar_url TEXT,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 3. User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. has_role security-definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Signup trigger -> create profile + default 'user' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Materials
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'CORE',
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.materials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read materials" ON public.materials
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert materials" ON public.materials
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update materials" ON public.materials
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete materials" ON public.materials
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Portals
CREATE TABLE public.portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  link_count INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portals TO authenticated;
GRANT ALL ON public.portals TO service_role;
ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read portals" ON public.portals
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert portals" ON public.portals
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update portals" ON public.portals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete portals" ON public.portals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER portals_updated_at BEFORE UPDATE ON public.portals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Site settings (single-row keyed by 'main')
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  site_title TEXT NOT NULL DEFAULT 'Dypol',
  tagline TEXT NOT NULL DEFAULT 'Live Unscripted Life',
  hero_headline TEXT NOT NULL DEFAULT 'DYPOL',
  hero_subheadline TEXT NOT NULL DEFAULT 'Your single launcher for curated study materials, coaching portals, and calm guidance.',
  logo_url TEXT,
  hero_image_url TEXT,
  promo_code TEXT NOT NULL DEFAULT 'UNSCRIPTED10',
  promo_headline TEXT NOT NULL DEFAULT '10% OFF',
  promo_body TEXT NOT NULL DEFAULT 'On any coaching batch with code below.',
  support_email TEXT NOT NULL DEFAULT '',
  support_whatsapp TEXT NOT NULL DEFAULT '',
  support_body TEXT NOT NULL DEFAULT 'Reach out anytime — we usually reply within a day.',
  footer_tagline TEXT NOT NULL DEFAULT 'LIVE UNSCRIPTED LIFE',
  footer_about TEXT NOT NULL DEFAULT 'A curated, distraction-free launcher for people building their own path.',
  footer_copyright TEXT NOT NULL DEFAULT '© 2026 DYPOL. All rights reserved.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin update site_settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert site_settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Seed site_settings
INSERT INTO public.site_settings (key) VALUES ('main');

-- 11. Seed materials
INSERT INTO public.materials (slug, tier, subject, type, title, description, link, sort_order) VALUES
  ('air48', 'PREMIUM', 'PCM MIX', 'Notes', 'AIR 48 Notes', 'Comprehensive notes from AIR 48 student — all subjects', 'https://dypol.bolt.host/', 10),
  ('hcv', 'CORE', 'PHYSICS', 'Books', 'HC Verma (HCV — Both Volumes)', 'Legendary physics text', '', 20),
  ('irodov', 'CORE', 'PHYSICS', 'Books', 'Irodov + Solutions', 'Problems in general physics', '', 30),
  ('ncert-punch', 'CORE', 'PCM MIX', 'Notes', 'NCERT Punch', 'Concise NCERT companion', '', 40),
  ('ncert-exampler', 'CORE', 'PCM MIX', 'Books', 'NCERT Exemplar', 'Advanced NCERT problems', '', 50),
  ('know-ncert', 'CORE', 'PCM MIX', 'Notes', 'Know Your NCERT + NCERT Maps', 'Chapter mind maps', '', 60),
  ('cengage-phy', 'CORE', 'PHYSICS', 'Books', 'Cengage Physics', 'Full BM Sharma series', '', 70),
  ('cengage-chem', 'CORE', 'CHEMISTRY', 'Books', 'Cengage Chemistry', 'KS Verma / Ranjeet Shahi', '', 80),
  ('cengage-math', 'CORE', 'MATHS', 'Books', 'Cengage Mathematics', 'G Tewani full set', '', 90),
  ('ms-chauhan', 'PREMIUM', 'CHEMISTRY', 'Books', 'MS Chauhan Organic', 'Advanced problems', '', 100),
  ('n-avasthi', 'CORE', 'CHEMISTRY', 'Books', 'N Avasthi Physical', 'Numerical mastery', '', 110),
  ('resnick', 'CORE', 'PHYSICS', 'Books', 'Resnick Halliday', 'Fundamentals of physics', '', 120),
  ('arihant-pyq', 'PREMIUM', 'PCM MIX', 'PYQs', 'Arihant 43-Year PYQs', 'Chapterwise + Topicwise', '', 130),
  ('dpp-pw', 'CORE', 'PCM MIX', 'Notes', 'PW Lakshya DPPs', 'Daily practice problems', '', 140),
  ('allen-modules', 'PREMIUM', 'PCM MIX', 'Coaching Modules', 'ALLEN Modules', 'Kota classroom modules', '', 150),
  ('fiitjee-modules', 'PREMIUM', 'PCM MIX', 'Coaching Modules', 'FIITJEE Modules', 'Ranker''s study pack', '', 160),
  ('bansal-modules', 'PREMIUM', 'PCM MIX', 'Coaching Modules', 'Bansal Modules', 'Classic Kota material', '', 170),
  ('resonance-dlpd', 'CORE', 'PCM MIX', 'Coaching Modules', 'Resonance DLPD', 'Distance learning modules', '', 180),
  ('test-series-fiitjee', 'PREMIUM', 'PCM MIX', 'Test Series', 'FIITJEE AITS', 'All India Test Series', '', 190),
  ('test-series-allen', 'PREMIUM', 'PCM MIX', 'Test Series', 'ALLEN Test Series', 'Full JEE mocks', '', 200),
  ('test-series-vibrant', 'PREMIUM', 'PCM MIX', 'Test Series', 'Vibrant Test Series', 'Weekly practice tests', '', 210),
  ('crux-phy', 'CORE', 'PHYSICS', 'Crux / Summary', 'Physics Crux / Summary', 'Quick revision sheets', '', 220),
  ('crux-chem', 'CORE', 'CHEMISTRY', 'Crux / Summary', 'Chemistry Crux / Summary', 'Formula & reaction sheets', '', 230),
  ('crux-math', 'CORE', 'MATHS', 'Crux / Summary', 'Maths Crux / Summary', 'Concept sheets', '', 240);

-- 12. Seed portals
INSERT INTO public.portals (slug, name, description, link, link_count, sort_order) VALUES
  ('pw', 'PW (Physics Wallah)', 'Lectures, notes & mirrors', '', 6, 10),
  ('vibrant', 'Vibrant Academy', 'Believe in excellence', '', 3, 20),
  ('mission-jeet', 'Mission JEET', 'Targeted JEE coverage', '', 1, 30),
  ('unacademy', 'Unacademy', 'Mirrors & lecture access', '', 2, 40),
  ('careerwill', 'Careerwill (Jindal)', 'Jindal sir lectures', '', 1, 50),
  ('apni-kaksha', 'Apni Kaksha', 'Telegram channel', '', 1, 60),
  ('competishun', 'Competishun', 'ABJ Sir Physics lectures', '', 1, 70),
  ('allen', 'ALLEN', 'Lectures via Telegram bot', '', 1, 80),
  ('aakash', 'Aakash Digital', 'AIATS + iTutor', '', 0, 90),
  ('resonance', 'Resonance', 'R-Kaysh & DLPD', '', 0, 100);
