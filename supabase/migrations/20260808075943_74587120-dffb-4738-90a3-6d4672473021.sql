ALTER TABLE public.community_submissions
  ADD CONSTRAINT community_submissions_material_name_len CHECK (char_length(btrim(material_name)) BETWEEN 3 AND 120),
  ADD CONSTRAINT community_submissions_description_len CHECK (char_length(btrim(description)) BETWEEN 10 AND 1000),
  ADD CONSTRAINT community_submissions_credit_name_len CHECK (char_length(btrim(credit_name)) BETWEEN 2 AND 60),
  ADD CONSTRAINT community_submissions_link_valid CHECK (char_length(link) <= 2048 AND link ~* '^https?://[^\s]+\.[^\s]+'),
  ADD CONSTRAINT community_submissions_kind_valid CHECK (kind IN ('material','portal')),
  ADD CONSTRAINT community_submissions_status_valid CHECK (status IN ('pending','approved','rejected')),
  ADD CONSTRAINT community_submissions_admin_notes_len CHECK (char_length(admin_notes) <= 2000);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  ADD CONSTRAINT notifications_body_len CHECK (char_length(body) <= 2000);