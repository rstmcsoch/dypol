-- ============================================================================
-- DYPOL: User management, mandatory onboarding, blocking, activity tracking,
-- admin-controlled exam + material taxonomy.
-- ============================================================================

-- ============================ Exams ==========================================

CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exams TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read enabled exams" ON public.exams
  FOR SELECT TO anon USING (enabled);
CREATE POLICY "Auth read exams" ON public.exams
  FOR SELECT TO authenticated
  USING (enabled OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin insert exams" ON public.exams
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update exams" ON public.exams
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete exams" ON public.exams
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER exams_updated_at BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================ Exam years =====================================

CREATE TABLE public.exam_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, year)
);

GRANT SELECT ON public.exam_years TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exam_years TO authenticated;
GRANT ALL ON public.exam_years TO service_role;

ALTER TABLE public.exam_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read enabled exam years" ON public.exam_years
  FOR SELECT TO anon
  USING (enabled AND EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.enabled));
CREATE POLICY "Auth read exam years" ON public.exam_years
  FOR SELECT TO authenticated
  USING (
    (enabled AND EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.enabled))
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Admin insert exam years" ON public.exam_years
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update exam years" ON public.exam_years
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete exam years" ON public.exam_years
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER exam_years_updated_at BEFORE UPDATE ON public.exam_years
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed exams
INSERT INTO public.exams (slug, name, sort_order) VALUES
  ('jee', 'JEE', 10),
  ('neet', 'NEET', 20),
  ('mht-cet', 'MHT CET', 30),
  ('wbjee', 'WBJEE', 40),
  ('upsc', 'UPSC', 50);

-- Seed prep years per exam
INSERT INTO public.exam_years (exam_id, year, sort_order)
SELECT e.id, y.year, y.year
FROM public.exams e
CROSS JOIN (VALUES (2026), (2027), (2028), (2029), (2030), (2031)) AS y(year)
WHERE e.slug IN ('jee', 'neet')
UNION ALL
SELECT e.id, y.year, y.year
FROM public.exams e
CROSS JOIN (VALUES (2026), (2027), (2028)) AS y(year)
WHERE e.slug IN ('mht-cet', 'wbjee', 'upsc');

-- ============================ Material taxonomy ==============================

CREATE TABLE public.material_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('subject', 'type')),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, name)
);

GRANT SELECT ON public.material_filters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.material_filters TO authenticated;
GRANT ALL ON public.material_filters TO service_role;

ALTER TABLE public.material_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read enabled material filters" ON public.material_filters
  FOR SELECT TO anon USING (enabled);
CREATE POLICY "Auth read material filters" ON public.material_filters
  FOR SELECT TO authenticated
  USING (enabled OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin insert material filters" ON public.material_filters
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin update material filters" ON public.material_filters
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin delete material filters" ON public.material_filters
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER material_filters_updated_at BEFORE UPDATE ON public.material_filters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.material_filters (kind, name, sort_order) VALUES
  ('subject', 'Physics', 10),
  ('subject', 'Chemistry', 20),
  ('subject', 'Mathematics', 30),
  ('subject', 'PCM Mix', 40),
  ('type', 'Books', 10),
  ('type', 'Notes', 20),
  ('type', 'Crux / Summary', 30),
  ('type', 'PYQs', 40),
  ('type', 'Test Series', 50),
  ('type', 'Coaching Modules', 60);

-- Normalize legacy subject values to the canonical taxonomy
UPDATE public.materials SET subject = 'Physics' WHERE upper(subject) = 'PHYSICS';
UPDATE public.materials SET subject = 'Chemistry' WHERE upper(subject) = 'CHEMISTRY';
UPDATE public.materials SET subject = 'Mathematics' WHERE upper(subject) IN ('MATHS', 'MATHEMATICS');
UPDATE public.materials SET subject = 'PCM Mix' WHERE upper(subject) IN ('PCM MIX', 'PCM');

-- Attach materials to an exam dimension
ALTER TABLE public.materials ADD COLUMN exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL;
CREATE INDEX materials_exam_idx ON public.materials (exam_id);
CREATE INDEX materials_subject_idx ON public.materials (subject);
CREATE INDEX materials_type_idx ON public.materials (type);

UPDATE public.materials m SET exam_id = (SELECT id FROM public.exams WHERE slug = 'jee') WHERE m.exam_id IS NULL;

-- ============================ Profiles =======================================

ALTER TABLE public.profiles
  ADD COLUMN username text,
  ADD COLUMN selected_exam text,
  ADD COLUMN preparation_year integer,
  ADD COLUMN onboarding_completed_at timestamptz,
  ADD COLUMN account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'blocked')),
  ADD COLUMN blocked_at timestamptz,
  ADD COLUMN blocked_until timestamptz,
  ADD COLUMN block_reason text NOT NULL DEFAULT '',
  ADD COLUMN blocked_by uuid,
  ADD COLUMN last_active_at timestamptz,
  ADD COLUMN total_active_seconds bigint NOT NULL DEFAULT 0 CHECK (total_active_seconds >= 0),
  ADD COLUMN total_sessions integer NOT NULL DEFAULT 0 CHECK (total_sessions >= 0);

CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username)) WHERE username IS NOT NULL;
CREATE INDEX profiles_selected_exam_idx ON public.profiles (selected_exam);
CREATE INDEX profiles_account_status_idx ON public.profiles (account_status);
CREATE INDEX profiles_last_active_idx ON public.profiles (last_active_at DESC NULLS LAST);
CREATE INDEX profiles_created_at_idx ON public.profiles (created_at);

-- Backfill usernames from emails for existing users
WITH numbered AS (
  SELECT u.id, lower(split_part(u.email, '@', 1)) AS base,
         row_number() OVER (PARTITION BY lower(split_part(u.email, '@', 1)) ORDER BY u.created_at) AS rn
  FROM auth.users u
)
UPDATE public.profiles p
SET username = CASE WHEN n.rn = 1 THEN n.base ELSE n.base || n.rn::text END
FROM numbered n
WHERE p.id = n.id AND p.username IS NULL AND n.base <> '';

-- Migrate legacy "JEE 2027"-style target into structured fields
UPDATE public.profiles
SET selected_exam = (regexp_match(target, '^(JEE|NEET|MHT CET|WBJEE|UPSC)\s+\d{4}$'))[1],
    preparation_year = (regexp_match(target, '\d{4}$'))[1]::integer
WHERE target ~* '^(JEE|NEET|MHT CET|WBJEE|UPSC)\s+\d{4}$'
  AND selected_exam IS NULL;

-- Keep selected_exam values aligned to exam slugs
UPDATE public.profiles p
SET selected_exam = e.slug
FROM public.exams e
WHERE p.selected_exam IS NOT NULL
  AND (upper(p.selected_exam) = upper(e.name) OR upper(p.selected_exam) = upper(e.slug));

-- ============================ Activity sessions ==============================

CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  active_seconds integer NOT NULL DEFAULT 0 CHECK (active_seconds >= 0 AND active_seconds <= 43200),
  events integer NOT NULL DEFAULT 0
);

GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
-- No INSERT/UPDATE/DELETE grants to authenticated: all writes go through the
-- security-definer activity RPCs below, which verify ownership + clamps deltas.

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX user_sessions_user_started_idx ON public.user_sessions (user_id, started_at DESC);
CREATE INDEX user_sessions_user_heartbeat_idx ON public.user_sessions (user_id, last_heartbeat_at DESC);

-- ============================ Blocking helpers ===============================

-- True while a user is permanently blocked or inside a temporary block window.
-- The window check is evaluated at query time, so temporary blocks expire
-- automatically without any job.
CREATE OR REPLACE FUNCTION public.user_is_blocked(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid
      AND (account_status = 'blocked'
           OR (blocked_until IS NOT NULL AND blocked_until > now()))
  )
$$;
REVOKE ALL ON FUNCTION public.user_is_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_blocked(uuid) TO authenticated, service_role;

-- Prevent self-service tampering with protected profile columns.
-- RPCs that legitimately update them set the transactional GUC
-- app.system_bypass, admins pass via has_role, and service-role
-- (auth.uid() IS NULL) writes are trusted.
CREATE OR REPLACE FUNCTION private.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF private.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF NULLIF(current_setting('app.system_bypass', true), '') IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.blocked_at IS DISTINCT FROM OLD.blocked_at
     OR NEW.blocked_until IS DISTINCT FROM OLD.blocked_until
     OR NEW.block_reason IS DISTINCT FROM OLD.block_reason
     OR NEW.blocked_by IS DISTINCT FROM OLD.blocked_by
     OR NEW.last_active_at IS DISTINCT FROM OLD.last_active_at
     OR NEW.total_active_seconds IS DISTINCT FROM OLD.total_active_seconds
     OR NEW.total_sessions IS DISTINCT FROM OLD.total_sessions
     OR NEW.onboarding_completed_at IS DISTINCT FROM OLD.onboarding_completed_at THEN
    RAISE EXCEPTION 'You are not allowed to modify protected account fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.protect_profile_columns();

-- ============================ Onboarding helper ==============================

-- True only when onboarding was completed through the database.
CREATE OR REPLACE FUNCTION public.user_is_onboarded(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid
      AND onboarding_completed_at IS NOT NULL
      AND selected_exam IS NOT NULL
      AND preparation_year IS NOT NULL
  )
$$;
REVOKE ALL ON FUNCTION public.user_is_onboarded(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_onboarded(uuid) TO authenticated, service_role;

-- ============================ RLS: blocked users =============================

-- Blocked users cannot create/update their own data through the API.
-- Users who have not completed mandatory onboarding cannot write either —
-- the onboarding gate is enforced at the data layer, not just in the UI.
DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users read own bookmarks" ON public.bookmarks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bookmarks" ON public.bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.user_is_blocked(auth.uid())
    AND public.user_is_onboarded(auth.uid())
  );
CREATE POLICY "Users update own bookmarks" ON public.bookmarks
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.user_is_blocked(auth.uid())
    AND public.user_is_onboarded(auth.uid())
  );
CREATE POLICY "Users delete own bookmarks" ON public.bookmarks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own submissions" ON public.community_submissions;
CREATE POLICY "Users insert own submissions" ON public.community_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND NOT public.user_is_blocked(auth.uid())
    AND public.user_is_onboarded(auth.uid())
  );

DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.user_is_blocked(auth.uid())
    AND public.user_is_onboarded(auth.uid())
  );

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- ============================ Onboarding RPCs ================================

CREATE OR REPLACE FUNCTION public.get_onboarding_options()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'exams', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'slug', e.slug,
          'name', e.name,
          'years', COALESCE((
            SELECT jsonb_agg(y.year ORDER BY y.sort_order, y.year)
            FROM public.exam_years y
            WHERE y.exam_id = e.id AND y.enabled
          ), '[]'::jsonb)
        )
        ORDER BY e.sort_order, e.name
      )
      FROM public.exams e WHERE e.enabled
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_onboarding_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_onboarding_options() TO authenticated, service_role;

-- Completes (or updates) mandatory onboarding. The DB is the authority:
-- the UI cannot mark onboarding complete without this function succeeding.
CREATE OR REPLACE FUNCTION public.complete_onboarding(_exam_slug text, _year integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _uid uuid := auth.uid(); _exam public.exams;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
  IF public.user_is_blocked(_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_BLOCKED'); END IF;

  SELECT * INTO _exam FROM public.exams WHERE slug = _exam_slug AND enabled;
  IF _exam.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'BAD_EXAM'); END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.exam_years WHERE exam_id = _exam.id AND year = _year AND enabled
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BAD_YEAR');
  END IF;

  -- Ensure a profile row exists (defensive: covers any user whose signup
  -- trigger did not fire) so onboarding can never loop forever.
  INSERT INTO public.profiles (id)
  VALUES (_uid)
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('app.system_bypass', '1', true);
  UPDATE public.profiles
  SET selected_exam = _exam_slug,
      preparation_year = _year,
      target = _exam.name || ' ' || _year,
      onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
      updated_at = now()
  WHERE id = _uid;

  RETURN jsonb_build_object('ok', true, 'exam', _exam_slug, 'year', _year);
END;
$$;
REVOKE ALL ON FUNCTION public.complete_onboarding(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, integer) TO authenticated, service_role;

-- ============================ Activity RPCs ==================================

-- Start a session (called once per browser session). Returns the session id.
CREATE OR REPLACE FUNCTION public.activity_begin(_client_id text DEFAULT '')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _uid uuid := auth.uid(); _sid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF public.user_is_blocked(_uid) THEN RETURN NULL; END IF;

  INSERT INTO public.user_sessions (user_id, client_id)
  VALUES (_uid, left(COALESCE(_client_id, ''), 120))
  RETURNING id INTO _sid;

  PERFORM set_config('app.system_bypass', '1', true);
  UPDATE public.profiles
  SET total_sessions = total_sessions + 1, last_active_at = now()
  WHERE id = _uid;

  RETURN _sid;
END;
$$;
REVOKE ALL ON FUNCTION public.activity_begin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activity_begin(text) TO authenticated, service_role;

-- Batched heartbeat. Deltas are clamped; a session cannot exceed 12 hours.
-- last_active_at is only rewritten when it is stale (> 60s) to keep write
-- amplification low.
CREATE OR REPLACE FUNCTION public.activity_heartbeat(_session_id uuid, _delta integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _uid uuid := auth.uid(); _s public.user_sessions; _d integer;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
  IF public.user_is_blocked(_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_BLOCKED'); END IF;
  IF _session_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'BAD_SESSION'); END IF;

  SELECT * INTO _s FROM public.user_sessions WHERE id = _session_id;
  IF _s.id IS NULL OR _s.user_id <> _uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BAD_SESSION');
  END IF;

  _d := GREATEST(0, LEAST(COALESCE(_delta, 0), 600));

  IF _s.ended_at IS NOT NULL THEN
    IF now() - _s.last_heartbeat_at > interval '30 minutes' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'SESSION_EXPIRED');
    END IF;
    UPDATE public.user_sessions
    SET ended_at = NULL, active_seconds = LEAST(active_seconds + _d, 43200),
        last_heartbeat_at = now(), events = events + 1
    WHERE id = _session_id;
  ELSE
    UPDATE public.user_sessions
    SET active_seconds = LEAST(active_seconds + _d, 43200),
        last_heartbeat_at = now(), events = events + 1
    WHERE id = _session_id;
  END IF;

  PERFORM set_config('app.system_bypass', '1', true);
  UPDATE public.profiles
  SET total_active_seconds = total_active_seconds + _d,
      last_active_at = CASE
        WHEN last_active_at IS NULL OR now() - last_active_at > interval '60 seconds' THEN now()
        ELSE last_active_at
      END
  WHERE id = _uid;

  RETURN jsonb_build_object('ok', true, 'seconds', _d);
END;
$$;
REVOKE ALL ON FUNCTION public.activity_heartbeat(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activity_heartbeat(uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.activity_end(_session_id uuid, _delta integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _uid uuid := auth.uid(); _s public.user_sessions; _d integer;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
  IF _session_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'BAD_SESSION'); END IF;
  SELECT * INTO _s FROM public.user_sessions WHERE id = _session_id;
  IF _s.id IS NULL OR _s.user_id <> _uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BAD_SESSION');
  END IF;
  _d := GREATEST(0, LEAST(COALESCE(_delta, 0), 600));

  UPDATE public.user_sessions
  SET ended_at = COALESCE(ended_at, now()),
      active_seconds = LEAST(active_seconds + _d, 43200),
      last_heartbeat_at = now()
  WHERE id = _session_id;

  PERFORM set_config('app.system_bypass', '1', true);
  UPDATE public.profiles
  SET total_active_seconds = total_active_seconds + _d
  WHERE id = _uid;

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.activity_end(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activity_end(uuid, integer) TO authenticated, service_role;

-- ============================ Admin user RPCs ================================

CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT '',
  _exam text DEFAULT '',
  _status text DEFAULT '',
  _sort text DEFAULT 'newest',
  _min_approved integer DEFAULT NULL,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _admin uuid := auth.uid();
        _offset integer; _page_n integer; _size_n integer;
        _where text; _order text; _rows jsonb; _total bigint;
BEGIN
  IF _admin IS NULL OR NOT private.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  _page_n := GREATEST(1, COALESCE(_page, 1));
  _size_n := GREATEST(1, LEAST(COALESCE(_page_size, 20), 100));
  _offset := (_page_n - 1) * _size_n;

  _where := 'TRUE';
  IF NULLIF(trim(_search), '') IS NOT NULL THEN
    _where := _where || format(
      ' AND (p.display_name ILIKE %L OR p.username ILIKE %L OR u.email ILIKE %L)',
      '%' || trim(_search) || '%', '%' || trim(_search) || '%', '%' || trim(_search) || '%');
  END IF;
  IF NULLIF(trim(_exam), '') IS NOT NULL THEN
    _where := _where || format(' AND p.selected_exam = %L', trim(_exam));
  END IF;
  IF _status = 'active' THEN
    _where := _where || ' AND p.account_status = ''active'' AND (p.blocked_until IS NULL OR p.blocked_until <= now())';
  ELSIF _status = 'blocked' THEN
    _where := _where || ' AND p.account_status = ''blocked''';
  ELSIF _status = 'temp_blocked' THEN
    _where := _where || ' AND p.account_status <> ''blocked'' AND p.blocked_until IS NOT NULL AND p.blocked_until > now()';
  ELSIF _status = 'onboarding' THEN
    _where := _where || ' AND p.onboarding_completed_at IS NULL';
  END IF;
  IF _min_approved IS NOT NULL AND _min_approved > 0 THEN
    _where := _where || format(
      ' AND (SELECT count(*) FROM public.community_submissions cs WHERE cs.user_id = p.id AND cs.status = ''approved'') >= %s',
      _min_approved);
  END IF;

  _order := CASE lower(COALESCE(_sort, 'newest'))
    WHEN 'oldest'          THEN 'p.created_at ASC NULLS LAST'
    WHEN 'approved_desc'   THEN 's.approved_submissions DESC NULLS LAST, p.created_at DESC'
    WHEN 'approved_asc'    THEN 's.approved_submissions ASC NULLS LAST, p.created_at DESC'
    WHEN 'total_desc'      THEN 's.total_submissions DESC NULLS LAST, p.created_at DESC'
    WHEN 'total_asc'       THEN 's.total_submissions ASC NULLS LAST, p.created_at DESC'
    WHEN 'active_desc'     THEN 'p.total_active_seconds DESC NULLS LAST, p.created_at DESC'
    WHEN 'active_asc'      THEN 'p.total_active_seconds ASC NULLS LAST, p.created_at DESC'
    WHEN 'sessions_desc'   THEN 'p.total_sessions DESC NULLS LAST, p.created_at DESC'
    WHEN 'sessions_asc'    THEN 'p.total_sessions ASC NULLS LAST, p.created_at DESC'
    WHEN 'recent'          THEN 'p.last_active_at DESC NULLS LAST, p.created_at DESC'
    WHEN 'stale'           THEN 'p.last_active_at ASC NULLS FIRST, p.created_at DESC'
    ELSE 'p.created_at DESC NULLS LAST'
  END;

  EXECUTE format(
    'SELECT count(*) FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE %s',
    _where) INTO _total;

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(x), ''[]''::jsonb) FROM (
       SELECT p.id, u.email,
              p.display_name, p.username, p.avatar_url,
              p.selected_exam, p.preparation_year, p.account_status,
              p.blocked_at, p.blocked_until, p.block_reason,
              p.created_at, p.last_active_at,
              p.total_active_seconds, p.total_sessions,
              CASE WHEN p.total_sessions > 0
                   THEN round(p.total_active_seconds::numeric / p.total_sessions)::bigint
                   ELSE 0 END AS avg_session_seconds,
              COALESCE(w.balance, 0) AS dio_balance,
              COALESCE(s.total_submissions, 0) AS total_submissions,
              COALESCE(s.approved_submissions, 0) AS approved_submissions,
              COALESCE(s.rejected_submissions, 0) AS rejected_submissions,
              COALESCE(s.pending_submissions, 0) AS pending_submissions,
              (p.account_status = ''blocked''
                OR (p.blocked_until IS NOT NULL AND p.blocked_until > now())) AS is_blocked,
              (p.onboarding_completed_at IS NULL) AS needs_onboarding
       FROM public.profiles p
       LEFT JOIN auth.users u ON u.id = p.id
       LEFT JOIN public.dio_wallets w ON w.user_id = p.id
       LEFT JOIN LATERAL (
         SELECT count(*) AS total_submissions,
                count(*) FILTER (WHERE status = ''approved'') AS approved_submissions,
                count(*) FILTER (WHERE status = ''rejected'') AS rejected_submissions,
                count(*) FILTER (WHERE status = ''pending'')  AS pending_submissions
         FROM public.community_submissions cs WHERE cs.user_id = p.id
       ) s ON true
       WHERE %s
       ORDER BY %s
       LIMIT %s OFFSET %s
     ) x', _where, _order, _size_n, _offset) INTO _rows;

  RETURN jsonb_build_object(
    'ok', true, 'total', _total, 'page', _page_n, 'page_size', _size_n, 'users', _rows);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, text, text, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, text, text, integer, integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_user_profile(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _admin uuid := auth.uid(); _out jsonb;
BEGIN
  IF _admin IS NULL OR NOT private.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT row_to_json(x) FROM (
        SELECT p.id, u.email, p.display_name, p.username, p.avatar_url,
               p.selected_exam, p.preparation_year, p.account_status,
               p.blocked_at, p.blocked_until, p.block_reason, p.blocked_by,
               p.created_at, p.updated_at, p.last_active_at,
               p.total_active_seconds, p.total_sessions,
               p.onboarding_completed_at
        FROM public.profiles p
        LEFT JOIN auth.users u ON u.id = p.id
        WHERE p.id = _user_id
      ) x
    ),
    'dio_balance', (SELECT COALESCE(balance, 0) FROM public.dio_wallets WHERE user_id = _user_id),
    'submissions', (
      SELECT jsonb_build_object(
        'total', count(*),
        'approved', count(*) FILTER (WHERE status = 'approved'),
        'rejected', count(*) FILTER (WHERE status = 'rejected'),
        'pending', count(*) FILTER (WHERE status = 'pending')
      ) FROM public.community_submissions WHERE user_id = _user_id
    ),
    'recent_submissions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', material_name, 'kind', kind, 'status', status, 'created_at', created_at)
        ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.community_submissions
            WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 10) s
    ),
    'unlocks_count', (SELECT count(*) FROM public.material_unlocks WHERE user_id = _user_id AND status = 'active'),
    'bookmarks_count', (SELECT count(*) FROM public.bookmarks WHERE user_id = _user_id),
    'recent_sessions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'started_at', started_at, 'ended_at', ended_at,
        'active_seconds', active_seconds) ORDER BY started_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.user_sessions
            WHERE user_id = _user_id ORDER BY started_at DESC LIMIT 10) u
    ),
    'avg_session_seconds', (
      SELECT CASE WHEN p.total_sessions > 0
             THEN round(p.total_active_seconds::numeric / p.total_sessions)::bigint
             ELSE 0 END
      FROM public.profiles p WHERE p.id = _user_id
    )
  ) INTO _out;

  IF (_out->'profile') IS NULL OR (_out->'profile')::text = 'null' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  END IF;
  RETURN _out || jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_user_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_profile(uuid) TO authenticated, service_role;

-- Block / temporary block / unblock. Admins cannot block other admins.
CREATE OR REPLACE FUNCTION public.admin_block_user(
  _user_id uuid, _action text, _duration_hours integer DEFAULT NULL,
  _reason text DEFAULT '', _start_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _admin uuid := auth.uid();
BEGIN
  IF _admin IS NULL OR NOT private.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _action NOT IN ('block', 'temp_block', 'unblock') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BAD_ACTION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  END IF;
  IF _action <> 'unblock' AND private.has_role(_user_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'CANNOT_BLOCK_ADMIN');
  END IF;

  IF _action = 'block' THEN
    UPDATE public.profiles
    SET account_status = 'blocked', blocked_at = now(), blocked_until = NULL,
        block_reason = left(COALESCE(_reason, ''), 500), blocked_by = _admin,
        updated_at = now()
    WHERE id = _user_id;
  ELSIF _action = 'temp_block' THEN
    IF COALESCE(_duration_hours, 0) < 1 OR _duration_hours > 8760 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'BAD_DURATION');
    END IF;
    UPDATE public.profiles
    SET account_status = 'active',
        blocked_at = COALESCE(_start_at, now()),
        blocked_until = COALESCE(_start_at, now()) + (_duration_hours * interval '1 hour'),
        block_reason = left(COALESCE(_reason, ''), 500), blocked_by = _admin,
        updated_at = now()
    WHERE id = _user_id;
  ELSE
    UPDATE public.profiles
    SET account_status = 'active', blocked_at = NULL, blocked_until = NULL,
        block_reason = '', blocked_by = NULL, updated_at = now()
    WHERE id = _user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'action', _action, 'user_id', _user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_block_user(uuid, text, integer, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_block_user(uuid, text, integer, text, timestamptz) TO authenticated, service_role;

-- How many users / materials reference an exam (for safe deletion).
CREATE OR REPLACE FUNCTION public.admin_exam_usage(_exam_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _admin uuid := auth.uid(); _slug text;
BEGIN
  IF _admin IS NULL OR NOT private.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT slug INTO _slug FROM public.exams WHERE id = _exam_id;
  IF _slug IS NULL THEN RETURN jsonb_build_object('users', 0, 'materials', 0); END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles WHERE selected_exam = _slug),
    'materials', (SELECT count(*) FROM public.materials WHERE exam_id = _exam_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_exam_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_exam_usage(uuid) TO authenticated, service_role;

-- How many materials reference a subject/type filter (for safe deletion).
CREATE OR REPLACE FUNCTION public.admin_filter_usage(_filter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE _admin uuid := auth.uid(); _f public.material_filters;
BEGIN
  IF _admin IS NULL OR NOT private.has_role(_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT * INTO _f FROM public.material_filters WHERE id = _filter_id;
  IF _f.id IS NULL THEN RETURN jsonb_build_object('materials', 0); END IF;
  IF _f.kind = 'subject' THEN
    RETURN jsonb_build_object('materials', (SELECT count(*) FROM public.materials WHERE subject = _f.name));
  END IF;
  RETURN jsonb_build_object('materials', (SELECT count(*) FROM public.materials WHERE type = _f.name));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_filter_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_filter_usage(uuid) TO authenticated, service_role;

-- ============================ Block checks in Dio ============================

CREATE OR REPLACE FUNCTION public.dio_unlock(_item_kind text, _item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _uid uuid := auth.uid(); _cost integer; _title text; _link text; _bal integer;
        _unlock_id uuid; _res jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
  IF public.user_is_blocked(_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_BLOCKED'); END IF;
  IF NOT public.user_is_onboarded(_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'ONBOARDING_REQUIRED'); END IF;
  IF _item_kind NOT IN ('material','portal') THEN RETURN jsonb_build_object('ok', false, 'error', 'BAD_KIND'); END IF;

  IF _item_kind = 'material' THEN
    SELECT dio_cost, title, link INTO _cost, _title, _link FROM public.materials WHERE id = _item_id;
  ELSE
    SELECT dio_cost, name, link INTO _cost, _title, _link FROM public.portals WHERE id = _item_id;
  END IF;
  IF _cost IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;

  INSERT INTO public.dio_wallets (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO _bal FROM public.dio_wallets WHERE user_id = _uid FOR UPDATE;

  IF EXISTS (SELECT 1 FROM public.material_unlocks WHERE user_id=_uid AND item_kind=_item_kind AND item_id=_item_id AND status='active') THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'balance', _bal, 'link', _link, 'cost', _cost);
  END IF;

  IF _bal < _cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_DIO', 'balance', _bal, 'needed', _cost - _bal, 'cost', _cost);
  END IF;

  INSERT INTO public.material_unlocks (user_id, item_kind, item_id, amount_paid)
  VALUES (_uid, _item_kind, _item_id, _cost)
  ON CONFLICT (user_id, item_kind, item_id) DO NOTHING
  RETURNING id INTO _unlock_id;

  IF _unlock_id IS NULL THEN
    UPDATE public.material_unlocks SET status='active' WHERE user_id=_uid AND item_kind=_item_kind AND item_id=_item_id AND status='revoked';
    RETURN jsonb_build_object('ok', true, 'already', true, 'balance', _bal, 'link', _link, 'cost', _cost);
  END IF;

  IF _cost > 0 THEN
    _res := private.dio_apply(_uid, -_cost, 'MATERIAL_UNLOCK', 'Unlocked: ' || COALESCE(_title,'resource'),
                              _item_kind, 'unlock:' || _unlock_id::text, NULL, _item_kind, _item_id, NULL, NULL);
    IF (_res->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'DIO_DEBIT_FAILED:%', _res->>'error';
    END IF;
    UPDATE public.material_unlocks SET transaction_id = (_res->>'transaction_id')::uuid WHERE id = _unlock_id;
    _bal := (_res->>'balance')::integer;
  END IF;

  PERFORM set_config('app.system_bypass', '1', true);
  UPDATE public.profiles SET last_active_at = now() WHERE id = _uid;

  RETURN jsonb_build_object('ok', true, 'already', false, 'balance', _bal, 'link', _link, 'cost', _cost);
END; $$;
REVOKE ALL ON FUNCTION public.dio_unlock(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_unlock(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dio_ad_start(_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _uid uuid := auth.uid(); _offer public.dio_ad_offers; _row public.dio_ad_completions; _ref text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
  IF public.user_is_blocked(_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_BLOCKED'); END IF;
  IF NOT public.user_is_onboarded(_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'ONBOARDING_REQUIRED'); END IF;
  SELECT * INTO _offer FROM public.dio_ad_offers WHERE id = _offer_id;
  IF _offer.id IS NULL OR NOT _offer.active
     OR (_offer.starts_at IS NOT NULL AND _offer.starts_at > now())
     OR (_offer.ends_at IS NOT NULL AND _offer.ends_at < now()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'OFFER_UNAVAILABLE');
  END IF;

  SELECT * INTO _row FROM public.dio_ad_completions WHERE user_id=_uid AND offer_id=_offer_id AND status <> 'rejected';
  IF _row.id IS NOT NULL THEN
    IF _row.status = 'completed' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_CLAIMED');
    END IF;
    RETURN jsonb_build_object('ok', true, 'reference', _row.reference, 'status', _row.status,
                              'url', _offer.url, 'verification', _offer.verification, 'reward', _offer.reward_amount);
  END IF;

  _ref := encode(gen_random_bytes(16), 'hex');
  INSERT INTO public.dio_ad_completions (user_id, offer_id, reference, reward_amount)
  VALUES (_uid, _offer_id, _ref, _offer.reward_amount)
  ON CONFLICT (user_id, offer_id) WHERE status <> 'rejected' DO NOTHING
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    SELECT * INTO _row FROM public.dio_ad_completions WHERE user_id=_uid AND offer_id=_offer_id AND status <> 'rejected';
  END IF;

  PERFORM set_config('app.system_bypass', '1', true);
  UPDATE public.profiles SET last_active_at = now() WHERE id = _uid;

  RETURN jsonb_build_object('ok', true, 'reference', _row.reference, 'status', _row.status,
                            'url', _offer.url, 'verification', _offer.verification, 'reward', _offer.reward_amount);
END; $$;
REVOKE ALL ON FUNCTION public.dio_ad_start(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_ad_start(uuid) TO authenticated, service_role;

-- ============================ Signup trigger =================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _base text; _username text; _n integer := 0;
BEGIN
  _base := lower(regexp_replace(
    split_part(COALESCE(NEW.email, ''), '@', 1), '[^a-z0-9._-]', '', 'g'));
  IF _base = '' THEN _base := 'user'; END IF;
  _username := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''), _base);

  LOOP
    BEGIN
      INSERT INTO public.profiles (id, display_name, username)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        _username
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW; -- profile already provisioned
      END IF;
      _n := _n + 1;
      IF _n > 10 THEN
        INSERT INTO public.profiles (id, display_name)
        VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
        ON CONFLICT (id) DO NOTHING;
        EXIT;
      END IF;
      _username := _base || floor(random() * 9000 + 1000)::text;
    END;
  END LOOP;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.dio_wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================ Grants hygiene =================================

REVOKE EXECUTE ON FUNCTION public.get_onboarding_options() FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.activity_begin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.activity_heartbeat(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.activity_end(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, text, text, text, integer, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_user_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_block_user(uuid, text, integer, text, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_exam_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_filter_usage(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_is_blocked(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_is_onboarded(uuid) FROM anon;
