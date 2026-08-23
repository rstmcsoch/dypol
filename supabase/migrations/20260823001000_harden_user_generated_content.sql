-- ==========================================================================
-- Enforce user-generated content rules in PostgreSQL. Client-side validation
-- is only UX; a caller can always send requests directly to the Data API.
-- ==========================================================================

ALTER TABLE public.community_submissions
  ADD CONSTRAINT community_submissions_kind_check
    CHECK (kind IN ('material', 'portal')) NOT VALID,
  ADD CONSTRAINT community_submissions_status_check
    CHECK (status IN ('pending', 'approved', 'rejected')) NOT VALID,
  ADD CONSTRAINT community_submissions_name_length_check
    CHECK (char_length(btrim(material_name)) BETWEEN 3 AND 150) NOT VALID,
  ADD CONSTRAINT community_submissions_description_length_check
    CHECK (char_length(btrim(description)) BETWEEN 20 AND 2000) NOT VALID,
  ADD CONSTRAINT community_submissions_credit_length_check
    CHECK (char_length(btrim(credit_name)) BETWEEN 2 AND 40) NOT VALID,
  ADD CONSTRAINT community_submissions_link_http_check
    CHECK (
      link = ''
      OR (char_length(link) <= 4096 AND link ~* '^https?://[^[:space:]]+$')
    ) NOT VALID,
  ADD CONSTRAINT community_submissions_email_length_check
    CHECK (char_length(user_email) <= 320) NOT VALID,
  ADD CONSTRAINT community_submissions_admin_notes_length_check
    CHECK (char_length(admin_notes) <= 5000) NOT VALID;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_event_length_check
    CHECK (char_length(btrim(event)) BETWEEN 1 AND 80) NOT VALID,
  ADD CONSTRAINT notifications_title_length_check
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 200) NOT VALID,
  ADD CONSTRAINT notifications_body_length_check
    CHECK (char_length(body) <= 2000) NOT VALID;

-- The database binds identity and privileged state to the JWT, normalizes the
-- content, and applies a conservative per-account submission limit.
CREATE OR REPLACE FUNCTION private.prepare_submission_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN NEW; -- trusted service-role operation
  END IF;

  -- Serialize the counters for this account so parallel requests cannot race
  -- past the hourly/daily limits.
  PERFORM pg_advisory_xact_lock(hashtextextended('dypol:submission:' || _uid::text, 0));

  IF (
    SELECT count(*)
    FROM public.community_submissions s
    WHERE s.user_id = _uid
      AND s.created_at >= now() - interval '1 hour'
  ) >= 10 THEN
    RAISE EXCEPTION 'Submission rate limit reached; try again later';
  END IF;

  IF (
    SELECT count(*)
    FROM public.community_submissions s
    WHERE s.user_id = _uid
      AND s.created_at >= now() - interval '1 day'
  ) >= 30 THEN
    RAISE EXCEPTION 'Daily submission limit reached; try again tomorrow';
  END IF;

  NEW.user_id := _uid;
  NEW.user_email := COALESCE(
    (SELECT u.email::text FROM auth.users u WHERE u.id = _uid),
    ''
  );
  NEW.kind := lower(btrim(NEW.kind));
  NEW.material_name := btrim(NEW.material_name);
  NEW.description := btrim(NEW.description);
  NEW.link := btrim(NEW.link);
  NEW.credit_name := btrim(NEW.credit_name);
  NEW.status := 'pending';
  NEW.admin_notes := '';
  NEW.edited_by_admin := false;
  NEW.approved_at := NULL;
  NEW.deleted_at := NULL;
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_submission_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.prepare_submission_insert() FROM anon, authenticated;

DROP TRIGGER IF EXISTS community_submissions_prepare_insert ON public.community_submissions;
CREATE TRIGGER community_submissions_prepare_insert
  BEFORE INSERT ON public.community_submissions
  FOR EACH ROW EXECUTE FUNCTION private.prepare_submission_insert();

-- Receipt notifications are created by the trusted trigger instead of giving
-- every user a general-purpose notification INSERT endpoint.
CREATE OR REPLACE FUNCTION private.notify_submission_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, event, title, body)
  VALUES (
    NEW.user_id,
    'submission_received',
    'Submission received',
    format('“%s” has been sent to the Dypol Admin Team for review.', NEW.material_name)
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_submission_received() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.notify_submission_received() FROM anon, authenticated;

DROP TRIGGER IF EXISTS community_submissions_notify_received ON public.community_submissions;
CREATE TRIGGER community_submissions_notify_received
  AFTER INSERT ON public.community_submissions
  FOR EACH ROW EXECUTE FUNCTION private.notify_submission_received();

DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

-- The UI already supports essential bookmarks; align the database constraint
-- and bound fields that an authenticated caller can otherwise make enormous.
ALTER TABLE public.bookmarks DROP CONSTRAINT IF EXISTS bookmarks_kind_check;
ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_kind_check
    CHECK (kind IN ('material', 'portal', 'link', 'essential')),
  ADD CONSTRAINT bookmarks_title_length_check
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 300) NOT VALID,
  ADD CONSTRAINT bookmarks_subtitle_length_check
    CHECK (subtitle IS NULL OR char_length(subtitle) <= 500) NOT VALID,
  ADD CONSTRAINT bookmarks_url_http_check
    CHECK (
      url = ''
      OR (char_length(url) <= 4096 AND url ~* '^https?://[^[:space:]]+$')
    ) NOT VALID,
  ADD CONSTRAINT bookmarks_image_url_http_check
    CHECK (
      image_url IS NULL
      OR image_url = ''
      OR (char_length(image_url) <= 4096 AND image_url ~* '^https?://[^[:space:]]+$')
    ) NOT VALID;

CREATE OR REPLACE FUNCTION private.prepare_bookmark_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('dypol:bookmark:' || _uid::text, 0));
  IF (SELECT count(*) FROM public.bookmarks b WHERE b.user_id = _uid) >= 500 THEN
    RAISE EXCEPTION 'Bookmark limit reached';
  END IF;
  NEW.user_id := _uid;
  NEW.title := btrim(NEW.title);
  NEW.subtitle := NULLIF(btrim(COALESCE(NEW.subtitle, '')), '');
  NEW.url := btrim(NEW.url);
  NEW.image_url := NULLIF(btrim(COALESCE(NEW.image_url, '')), '');
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_bookmark_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.prepare_bookmark_insert() FROM anon, authenticated;

DROP TRIGGER IF EXISTS bookmarks_prepare_insert ON public.bookmarks;
CREATE TRIGGER bookmarks_prepare_insert
  BEFORE INSERT ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION private.prepare_bookmark_insert();

-- Bound profile strings shown in the admin directory and public UI.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length_check
    CHECK (display_name IS NULL OR char_length(display_name) <= 100) NOT VALID,
  ADD CONSTRAINT profiles_username_length_check
    CHECK (username IS NULL OR char_length(username) BETWEEN 1 AND 64) NOT VALID,
  ADD CONSTRAINT profiles_target_length_check
    CHECK (target IS NULL OR char_length(target) <= 150) NOT VALID,
  ADD CONSTRAINT profiles_avatar_url_http_check
    CHECK (
      avatar_url IS NULL
      OR avatar_url = ''
      OR (char_length(avatar_url) <= 4096 AND avatar_url ~* '^https?://[^[:space:]]+$')
    ) NOT VALID;

CREATE OR REPLACE FUNCTION private.protect_profile_onboarding_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF private.has_role(auth.uid(), 'admin'::public.app_role) THEN RETURN NEW; END IF;
  IF NULLIF(current_setting('app.system_bypass', true), '') IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.selected_exam IS DISTINCT FROM OLD.selected_exam
     OR NEW.preparation_year IS DISTINCT FROM OLD.preparation_year
     OR NEW.target IS DISTINCT FROM OLD.target THEN
    RAISE EXCEPTION 'Use the validated onboarding flow to change exam settings';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_profile_onboarding_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.protect_profile_onboarding_fields() FROM anon, authenticated;

DROP TRIGGER IF EXISTS profiles_protect_onboarding_fields ON public.profiles;
CREATE TRIGGER profiles_protect_onboarding_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.protect_profile_onboarding_fields();

COMMENT ON FUNCTION private.prepare_submission_insert() IS
  'SECURITY DEFINER trigger: binds submission identity, resets privileged fields, and rate-limits user inserts.';
COMMENT ON FUNCTION private.notify_submission_received() IS
  'SECURITY DEFINER trigger: creates the trusted receipt notification for a new submission.';
COMMENT ON FUNCTION private.prepare_bookmark_insert() IS
  'SECURITY DEFINER trigger: binds bookmark identity, normalizes fields, and limits per-user rows.';
COMMENT ON FUNCTION private.protect_profile_onboarding_fields() IS
  'SECURITY DEFINER trigger: requires exam/year changes to use the validated onboarding RPC.';
