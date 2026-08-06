CREATE TABLE public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Untitled',
  subtitle text NOT NULL DEFAULT '',
  hero_image_url text,
  body text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_pages TO authenticated;
GRANT ALL ON public.site_pages TO service_role;

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site_pages" ON public.site_pages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert site_pages" ON public.site_pages
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update site_pages" ON public.site_pages
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete site_pages" ON public.site_pages
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER site_pages_updated_at BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_pages (slug, title, subtitle, body, sort_order) VALUES
('about', 'About Dypol', 'Live Unscripted Life', '## What is Dypol?
Dypol is a calm, curated launcher for students building their own path — study materials, coaching portals and essentials in one distraction-free place.

## Why we built it
Studying online means fighting noise. We gather only what helps and leave the rest out.

## What you get
- Curated study materials, organised by subject and tier
- Direct links to coaching portals
- Essentials worth owning
- A tentative exam countdown so you always know where you stand

## Contact
Reach us any time through the Support page.', 10),
('terms', 'Copyright & Terms', 'Please read these terms before using Dypol', '## Acceptance of terms
By using Dypol you agree to these terms. If you do not agree, please stop using the site.

## Content and links
Dypol is a directory of links. We do not host the files or products we link to. All trademarks, book covers and product images belong to their respective owners and are shown for identification only.

## Fair use
Materials are linked for personal, educational, non-commercial use. You are responsible for how you use anything you download from third-party sites.

## No warranty
The site is provided "as is". Links may break and information may change without notice.

## Changes
We may update these terms at any time. Continued use means you accept the updated version.', 20),
('dmca', 'DMCA Policy', 'Copyright takedown requests', '## Our position
Dypol does not host any copyrighted files. We only index links that are already publicly available elsewhere.

## Filing a notice
If you believe a link on Dypol infringes your copyright, email us with:
- Your name and contact details
- Identification of the copyrighted work
- The exact URL on Dypol pointing to the material
- A statement that you have a good-faith belief the use is unauthorised
- A statement, under penalty of perjury, that the information is accurate and you are authorised to act

## Our response
Valid notices are actioned promptly — usually within 72 hours — and the link is removed.

## Counter notices
If your link was removed in error, reply to the same email with an explanation and we will review it.', 30),
('privacy', 'Privacy Policy', 'How we handle your data', '## What we collect
If you create an account we store your email, display name and chosen exam target. Bookmarks you save are tied to your account.

## What we do not do
We do not sell your data, we do not run ad-tracking pixels, and we never see or store your raw password.

## Cookies and storage
We use local storage to remember your theme and your signed-in session. That is it.

## Third parties
Signing in with Google shares only your basic profile with us. External links you open are governed by that site''s own privacy policy.

## Your choices
You can edit your profile, remove bookmarks, or ask us to delete your account at any time via the Support page.', 40);