
CREATE TABLE public.essentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  image_url TEXT,
  price TEXT,
  source TEXT,
  sort_order INT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.essentials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.essentials TO authenticated;
GRANT ALL ON public.essentials TO service_role;

ALTER TABLE public.essentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Essentials are public" ON public.essentials FOR SELECT USING (true);
CREATE POLICY "Admins insert essentials" ON public.essentials FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update essentials" ON public.essentials FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete essentials" ON public.essentials FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER essentials_set_updated_at BEFORE UPDATE ON public.essentials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.nav_items (label, href, icon, sort_order, enabled, external)
VALUES ('Essentials', '/essentials', 'Gift', 45, true, false);
