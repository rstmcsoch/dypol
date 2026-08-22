-- Share Content settings (Admin → Site → Share Content)
-- Stored on the existing single-row site_settings table, so the existing
-- RLS applies unchanged: public read, admin-only insert/update.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS share_title text NOT NULL DEFAULT 'Dypol',
  ADD COLUMN IF NOT EXISTS share_message text NOT NULL DEFAULT 'Check out Dypol — your single launcher for curated study materials, coaching portals, and calm guidance.',
  ADD COLUMN IF NOT EXISTS share_link text NOT NULL DEFAULT 'https://dypol.vercel.app',
  ADD COLUMN IF NOT EXISTS share_image_url text;
