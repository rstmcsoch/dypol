
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS legal_terms_url text,
  ADD COLUMN IF NOT EXISTS legal_dmca_url text,
  ADD COLUMN IF NOT EXISTS legal_privacy_url text;

CREATE TABLE IF NOT EXISTS public.nav_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  href text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  sort_order int NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  external boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nav_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.nav_items TO authenticated;
GRANT ALL ON public.nav_items TO service_role;

ALTER TABLE public.nav_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nav_items" ON public.nav_items
  FOR SELECT TO anon, authenticated USING (enabled OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert nav_items" ON public.nav_items
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update nav_items" ON public.nav_items
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete nav_items" ON public.nav_items
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER nav_items_updated_at BEFORE UPDATE ON public.nav_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.nav_items (label, href, icon, sort_order, enabled, external) VALUES
  ('Home', '/', 'Home', 10, true, false),
  ('Materials', '/materials', 'BookOpen', 20, true, false),
  ('Portals', '/portals', 'LayoutGrid', 30, true, false),
  ('Support', '/support', 'LifeBuoy', 40, true, false),
  ('Profile', '/profile', 'User', 50, true, false)
ON CONFLICT DO NOTHING;
