-- ============================================================================
-- Daily Quote system for DYPOL
--
-- Tables:
--   public.daily_quotes    — the quote library (admin managed)
--   public.quote_settings  — single-row configuration ('main')
--   public.quote_history   — server-side rotation history / stats
--
-- Functions:
--   public.get_active_quotes()      — SECURITY DEFINER, callable by anyone.
--                                     Determines the current quote(s) server-side
--                                     so every visitor sees the same quote for the
--                                     same period. Persists rotation state
--                                     atomically (advisory lock).
--   public.admin_quote_action(...)  — SECURITY DEFINER, admin-only. Powers
--                                     "set as today / fixed, next, prev, reset,
--                                     shuffle" controls.
--
-- RLS: quote tables are admin-only read/write. Normal users receive quote
-- content exclusively through get_active_quotes().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Quote library
-- ---------------------------------------------------------------------------
CREATE TABLE public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  author text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order integer NOT NULL DEFAULT 100,
  start_at timestamptz,
  end_at timestamptz,
  display_count integer NOT NULL DEFAULT 0,
  last_displayed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_quotes TO authenticated;
GRANT ALL ON public.daily_quotes TO service_role;

ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage daily_quotes" ON public.daily_quotes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER daily_quotes_updated_at BEFORE UPDATE ON public.daily_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX daily_quotes_active_idx ON public.daily_quotes (status, sort_order);
CREATE INDEX daily_quotes_window_idx ON public.daily_quotes (start_at, end_at);

-- ---------------------------------------------------------------------------
-- 2. Settings (single row, key = 'main')
-- ---------------------------------------------------------------------------
CREATE TABLE public.quote_settings (
  key text PRIMARY KEY,
  -- General
  enabled boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'authenticated', 'admins')),
  display_mode text NOT NULL DEFAULT 'daily' CHECK (display_mode IN ('daily', 'random', 'fixed', 'sequential', 'scheduled')),
  quotes_per_day integer NOT NULL DEFAULT 1,
  multi_layout text NOT NULL DEFAULT 'stack' CHECK (multi_layout IN ('stack', 'steps', 'carousel', 'rotate')),
  multi_interval_seconds integer NOT NULL DEFAULT 8,
  -- Rotation
  rotation_frequency text NOT NULL DEFAULT 'daily' CHECK (rotation_frequency IN ('daily', '12h', '6h', '3h', '1h', 'custom')),
  custom_interval_minutes integer NOT NULL DEFAULT 360,
  selection_mode text NOT NULL DEFAULT 'random' CHECK (selection_mode IN ('random', 'sequential')),
  anti_repeat boolean NOT NULL DEFAULT true,
  avoid_last_count integer NOT NULL DEFAULT 5,
  -- Fixed / locked
  lock_quote boolean NOT NULL DEFAULT false,
  fixed_quote_id uuid REFERENCES public.daily_quotes(id) ON DELETE SET NULL,
  -- Scheduling
  scheduling_enabled boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  -- Appearance
  show_author boolean NOT NULL DEFAULT true,
  show_category boolean NOT NULL DEFAULT true,
  show_icon boolean NOT NULL DEFAULT true,
  animation_enabled boolean NOT NULL DEFAULT true,
  animation_type text NOT NULL DEFAULT 'fade' CHECK (animation_type IN ('none', 'fade', 'slide', 'scale', 'blur')),
  animation_speed text NOT NULL DEFAULT 'normal' CHECK (animation_speed IN ('slow', 'normal', 'fast', 'custom')),
  animation_duration_ms integer NOT NULL DEFAULT 500,
  card_style text NOT NULL DEFAULT 'glass' CHECK (card_style IN ('glass', 'solid', 'outline', 'gradient')),
  text_align text NOT NULL DEFAULT 'left' CHECK (text_align IN ('left', 'center')),
  -- Server-managed rotation state (period selection, anti-repeat tracking)
  rotation_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_settings TO authenticated;
GRANT ALL ON public.quote_settings TO service_role;

ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quote_settings" ON public.quote_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER quote_settings_updated_at BEFORE UPDATE ON public.quote_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Rotation history (lightweight stats trail)
-- ---------------------------------------------------------------------------
CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.daily_quotes(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  mode text NOT NULL DEFAULT '',
  shown_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_history TO authenticated;
GRANT ALL ON public.quote_history TO service_role;

ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quote_history" ON public.quote_history
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX quote_history_period_idx ON public.quote_history (period_key);
CREATE INDEX quote_history_quote_idx ON public.quote_history (quote_id, shown_at DESC);
CREATE INDEX quote_history_shown_idx ON public.quote_history (shown_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Internal helpers
-- ---------------------------------------------------------------------------

-- Appearance block returned to clients (mirrors quote_settings columns).
CREATE OR REPLACE FUNCTION public._quote_appearance(s public.quote_settings)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'show_author', s.show_author,
    'show_category', s.show_category,
    'show_icon', s.show_icon,
    'animation_enabled', s.animation_enabled,
    'animation_type', s.animation_type,
    'animation_speed', s.animation_speed,
    'animation_duration_ms', s.animation_duration_ms,
    'card_style', s.card_style,
    'text_align', s.text_align
  );
$$;

-- Quote rows for a list of ids, preserving the requested order.
-- p_any = true returns quotes regardless of status (explicit admin pins).
CREATE OR REPLACE FUNCTION public._quote_json(p_ids uuid[], p_any boolean)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', q.id,
      'text', q.text,
      'author', q.author,
      'category', q.category
    ) ORDER BY u.ord), '[]'::jsonb)
  FROM unnest(p_ids) WITH ORDINALITY AS u(id, ord)
  JOIN public.daily_quotes q ON q.id = u.id
  WHERE p_any OR q.status = 'active';
$$;

-- uuid[] out of a jsonb array of id strings ('[]' on anything unexpected).
CREATE OR REPLACE FUNCTION public._quote_ids_of(p_value jsonb)
RETURNS uuid[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_value) = 'array' THEN
      COALESCE((SELECT array_agg(x::uuid) FROM jsonb_array_elements_text(p_value) AS t(x)), '{}'::uuid[])
    ELSE '{}'::uuid[]
  END;
$$;

-- Resolve a usable IANA timezone (falls back to UTC for bad input).
CREATE OR REPLACE FUNCTION public._quote_tz(p_tz text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_tz IS NOT NULL AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_tz)
      THEN p_tz
    ELSE 'UTC'
  END;
$$;

-- Current rotation period key + period boundary, timezone aware.
-- Period keys encode the local date (and hour bucket for sub-daily modes),
-- so "one quote per day" means per calendar day in the configured timezone.
CREATE OR REPLACE FUNCTION public._quote_period(s public.quote_settings, v_now timestamptz, v_tz text)
RETURNS TABLE (period_key text, boundary timestamptz)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_local timestamp;
  v_minutes int;
  v_bucket bigint;
BEGIN
  v_local := timezone(v_tz, v_now);
  v_minutes := GREATEST(1, CASE s.rotation_frequency
    WHEN '12h' THEN 720
    WHEN '6h' THEN 360
    WHEN '3h' THEN 180
    WHEN '1h' THEN 60
    WHEN 'custom' THEN GREATEST(5, s.custom_interval_minutes)
    ELSE 1440
  END);

  IF s.rotation_frequency = 'custom' THEN
    v_bucket := floor(extract(epoch from v_now) / (v_minutes * 60))::bigint;
    period_key := 'c' || v_bucket;
    boundary := to_timestamp((v_bucket + 1) * v_minutes * 60);
    RETURN NEXT;
    RETURN;
  END IF;

  period_key := to_char(v_local, 'YYYY-MM-DD');
  IF v_minutes < 1440 THEN
    v_bucket := floor((extract(hour FROM v_local) * 60 + extract(minute FROM v_local)) / v_minutes)::int;
    period_key := period_key || '-' || v_bucket;
    boundary := (date_trunc('day', v_local) + make_interval(mins => ((v_bucket + 1) * v_minutes)::int)) AT TIME ZONE v_tz;
  ELSE
    boundary := (date_trunc('day', v_local) + interval '1 day') AT TIME ZONE v_tz;
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public._quote_appearance(public.quote_settings) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._quote_json(uuid[], boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._quote_ids_of(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._quote_tz(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._quote_period(public.quote_settings, timestamptz, text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 5. Public: resolve the currently active quote(s), server-side.
--    Every visitor receives the same selection for the current period.
--    Rotation state is persisted under an advisory lock, so concurrent
--    first-visits of a new period cannot pick different quotes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_quotes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.quote_settings%ROWTYPE;
  v_tz text;
  v_now timestamptz := now();
  v_period text;
  v_boundary timestamptz;
  v_next_refresh int := 3600;
  v_take int;
  v_state jsonb;
  v_ids uuid[];
  v_valid uuid[];
  v_picked uuid[];
  v_candidates uuid[];
  v_pool uuid[];
  v_cycle uuid[];
  v_recent uuid[];
  v_keep int;
  v_anchor uuid;
  v_anchor_idx int;
  v_n int;
  v_manual boolean;
  v_windowed boolean;
  v_missing int;
  i int;
  v_quotes jsonb;
  v_base jsonb;
BEGIN
  SELECT * INTO s FROM public.quote_settings WHERE key = 'main';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'not_configured');
  END IF;

  v_base := jsonb_build_object(
    'display_mode', s.display_mode,
    'multi_layout', s.multi_layout,
    'multi_interval_seconds', s.multi_interval_seconds,
    'appearance', public._quote_appearance(s)
  );

  IF NOT s.enabled THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'disabled') || v_base;
  END IF;
  IF s.visibility = 'authenticated' AND auth.uid() IS NULL THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'auth_required') || v_base;
  END IF;
  IF s.visibility = 'admins' AND NOT COALESCE(private.has_role(auth.uid(), 'admin'::app_role), false) THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'admins_only') || v_base;
  END IF;

  v_tz := public._quote_tz(s.timezone);
  SELECT p.period_key, p.boundary INTO v_period, v_boundary
    FROM public._quote_period(s, v_now, v_tz) p;
  v_next_refresh := GREATEST(1, floor(extract(epoch FROM (v_boundary - v_now)))::int);
  v_take := LEAST(GREATEST(COALESCE(s.quotes_per_day, 1), 1), 12);
  v_windowed := s.scheduling_enabled OR s.display_mode = 'scheduled';

  v_base := v_base || jsonb_build_object(
    'enabled', true,
    'period_key', v_period,
    'timezone', v_tz,
    'next_refresh_in_seconds', v_next_refresh
  );

  -- ---- Locked master switch (explicit admin pin — always honoured) -------
  IF s.lock_quote AND s.fixed_quote_id IS NOT NULL THEN
    RETURN v_base || jsonb_build_object(
      'source', 'locked',
      'quotes', public._quote_json(ARRAY[s.fixed_quote_id], true)
    );
  END IF;

  -- ---- Fixed mode ---------------------------------------------------------
  IF s.display_mode = 'fixed' THEN
    IF s.fixed_quote_id IS NULL THEN
      RETURN v_base || jsonb_build_object('source', 'fixed', 'quotes', '[]'::jsonb, 'note', 'no_fixed_quote');
    END IF;
    RETURN v_base || jsonb_build_object(
      'source', 'fixed',
      'quotes', public._quote_json(ARRAY[s.fixed_quote_id], true)
    );
  END IF;

  -- ---- Serialize state mutation across concurrent visitors ----------------
  PERFORM pg_advisory_xact_lock(hashtext('dypol_quote_rotation'));
  SELECT rotation_state INTO v_state FROM public.quote_settings WHERE key = 'main';
  v_state := COALESCE(v_state, '{}'::jsonb);

  -- ---- Scheduled mode: deterministic from per-quote windows --------------
  IF s.display_mode = 'scheduled' THEN
    SELECT COALESCE(array_agg(id ORDER BY start_at DESC NULLS LAST, sort_order, created_at, id), '{}'::uuid[])
      INTO v_candidates
      FROM public.daily_quotes
     WHERE status = 'active'
       AND (start_at IS NULL OR start_at <= v_now)
       AND (end_at IS NULL OR end_at >= v_now);
    v_picked := v_candidates[1:v_take];

    -- Persist + count only when the active set changes.
    IF COALESCE(v_picked, '{}'::uuid[]) IS DISTINCT FROM public._quote_ids_of(v_state->'quote_ids')
       OR v_state->>'period_key' IS DISTINCT FROM v_period THEN
      UPDATE public.quote_settings
         SET rotation_state = jsonb_build_object(
               'period_key', v_period,
               'quote_ids', COALESCE(to_jsonb(v_picked), '[]'::jsonb),
               'cycle_ids', COALESCE(v_state->'cycle_ids', '[]'::jsonb),
               'recent_ids', COALESCE(v_state->'recent_ids', '[]'::jsonb),
               'last_quote_id', COALESCE(v_picked[array_length(v_picked, 1)], NULL),
               'manual_override', false,
               'picked_at', v_now
             )
       WHERE key = 'main';
      IF array_length(v_picked, 1) IS NOT NULL THEN
        INSERT INTO public.quote_history (quote_id, period_key, mode)
          SELECT unnest(v_picked), v_period, 'scheduled';
        UPDATE public.daily_quotes SET display_count = display_count + 1, last_displayed_at = v_now
         WHERE id = ANY(v_picked);
      END IF;
    END IF;

    RETURN v_base || jsonb_build_object(
      'source', 'scheduled',
      'quotes', public._quote_json(v_picked, false),
      'note', CASE WHEN array_length(v_picked, 1) IS NULL THEN 'no_scheduled_quotes' ELSE NULL END
    );
  END IF;

  -- ---- Rotation modes: daily / random / sequential ------------------------
  -- Reuse the persisted selection for this period (consistency across users).
  v_ids := public._quote_ids_of(v_state->'quote_ids');
  v_manual := COALESCE((v_state->>'manual_override')::boolean, false);

  IF v_state->>'period_key' = v_period AND COALESCE(array_length(v_ids, 1), 0) > 0 THEN
    -- Drop quotes that were disabled/deleted (or left their window) since the pick.
    SELECT COALESCE(array_agg(q.id ORDER BY u.ord), '{}'::uuid[]) INTO v_valid
      FROM unnest(v_ids) WITH ORDINALITY AS u(id, ord)
      JOIN public.daily_quotes q ON q.id = u.id
     WHERE v_manual
        OR (q.status = 'active'
            AND (NOT v_windowed OR q.start_at IS NULL OR q.start_at <= v_now)
            AND (NOT v_windowed OR q.end_at IS NULL OR q.end_at >= v_now));

    IF COALESCE(array_length(v_valid, 1), 0) > 0 THEN
      -- Honour a mid-period reduction of "quotes per day".
      v_valid := v_valid[1:v_take];
      RETURN v_base || jsonb_build_object(
        'source', CASE WHEN v_manual THEN 'manual' ELSE s.display_mode END,
        'quotes', public._quote_json(v_valid, v_manual)
      );
    END IF;
  END IF;

  -- Fresh pick for the new period.
  SELECT COALESCE(array_agg(id ORDER BY sort_order, created_at, id), '{}'::uuid[])
    INTO v_candidates
    FROM public.daily_quotes
   WHERE status = 'active'
     AND (NOT v_windowed OR start_at IS NULL OR start_at <= v_now)
     AND (NOT v_windowed OR end_at IS NULL OR end_at >= v_now);

  v_n := COALESCE(array_length(v_candidates, 1), 0);
  IF v_n = 0 THEN
    UPDATE public.quote_settings
       SET rotation_state = jsonb_build_object('period_key', v_period, 'quote_ids', '[]'::jsonb,
             'cycle_ids', COALESCE(v_state->'cycle_ids', '[]'::jsonb),
             'recent_ids', COALESCE(v_state->'recent_ids', '[]'::jsonb),
             'manual_override', false, 'picked_at', v_now)
     WHERE key = 'main';
    RETURN v_base || jsonb_build_object('source', s.display_mode, 'quotes', '[]'::jsonb, 'note', 'no_active_quotes');
  END IF;

  v_picked := '{}'::uuid[];

  IF s.display_mode = 'sequential' THEN
    -- Next quote(s) in admin-defined order, wrapping around.
    v_anchor := NULLIF(v_state->>'last_quote_id', '')::uuid;
    v_anchor_idx := COALESCE(array_position(v_candidates, v_anchor), 0);
    FOR i IN 1..LEAST(v_take, v_n) LOOP
      v_picked := v_picked || v_candidates[mod(v_anchor_idx - 1 + i, v_n) + 1];
    END LOOP;

  ELSE
    -- Cycle tracking for 'daily', recent tracking for 'random'.
    v_pool := v_candidates;
    IF s.display_mode = 'daily' THEN
      v_cycle := public._quote_ids_of(v_state->'cycle_ids');
      SELECT COALESCE(array_agg(u), '{}'::uuid[]) INTO v_pool
        FROM unnest(v_candidates) AS u WHERE NOT (u = ANY(v_cycle));
      IF COALESCE(array_length(v_pool, 1), 0) = 0 THEN
        -- All quotes used — start a fresh cycle.
        v_pool := v_candidates;
        v_cycle := '{}'::uuid[];
      END IF;
    ELSIF s.anti_repeat AND s.avoid_last_count > 0 THEN
      v_recent := public._quote_ids_of(v_state->'recent_ids');
      SELECT COALESCE(array_agg(u), '{}'::uuid[]) INTO v_pool
        FROM unnest(v_candidates) AS u WHERE NOT (u = ANY(v_recent));
      IF COALESCE(array_length(v_pool, 1), 0) = 0 THEN
        v_pool := v_candidates;
      END IF;
    END IF;

    IF s.selection_mode = 'sequential' THEN
      SELECT COALESCE(array_agg(u), '{}'::uuid[]) INTO v_picked
        FROM (SELECT u FROM unnest(v_pool) AS u
              ORDER BY array_position(v_candidates, u) LIMIT v_take) t;
    ELSE
      SELECT COALESCE(array_agg(u), '{}'::uuid[]) INTO v_picked
        FROM (SELECT u FROM unnest(v_pool) AS u ORDER BY random() LIMIT v_take) t;
    END IF;

    -- Top up from outside the pool (cycle/recent nearly exhausted).
    v_missing := v_take - COALESCE(array_length(v_picked, 1), 0);
    IF v_missing > 0 THEN
      SELECT COALESCE(v_picked || array_agg(u), v_picked) INTO v_picked
        FROM (SELECT u FROM unnest(v_candidates) AS u
              WHERE NOT (u = ANY(v_picked)) ORDER BY random() LIMIT v_missing) t;
    END IF;

    -- Update anti-repeat trackers.
    IF s.display_mode = 'daily' THEN
      v_cycle := v_cycle || v_picked;
      v_state := jsonb_set(v_state, '{cycle_ids}', to_jsonb(v_cycle));
    ELSE
      v_keep := GREATEST(s.avoid_last_count, v_take, 1);
      v_recent := public._quote_ids_of(v_state->'recent_ids') || v_picked;
      WHILE COALESCE(array_length(v_recent, 1), 0) > v_keep LOOP
        v_recent := v_recent[2:array_length(v_recent, 1)];
      END LOOP;
      v_state := jsonb_set(v_state, '{recent_ids}', to_jsonb(v_recent));
    END IF;
  END IF;

  -- Persist pick: rotation state + history + per-quote stats.
  UPDATE public.quote_settings
     SET rotation_state = jsonb_build_object(
           'period_key', v_period,
           'quote_ids', to_jsonb(v_picked),
           'cycle_ids', COALESCE(v_state->'cycle_ids', '[]'::jsonb),
           'recent_ids', COALESCE(v_state->'recent_ids', '[]'::jsonb),
           'last_quote_id', v_picked[array_length(v_picked, 1)],
           'manual_override', false,
           'picked_at', v_now
         )
   WHERE key = 'main';

  INSERT INTO public.quote_history (quote_id, period_key, mode)
    SELECT unnest(v_picked), v_period, s.display_mode;

  UPDATE public.daily_quotes
     SET display_count = display_count + 1, last_displayed_at = v_now
   WHERE id = ANY(v_picked);

  RETURN v_base || jsonb_build_object(
    'source', s.display_mode,
    'quotes', public._quote_json(v_picked, false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_quotes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_quotes() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Admin manual controls (double-checked admin role inside).
--    p_action: set_today | set_fixed | next | prev | reset | shuffle
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_quote_action(p_action text, p_quote_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.quote_settings%ROWTYPE;
  v_tz text;
  v_now timestamptz := now();
  v_period text;
  v_boundary timestamptz;
  v_take int;
  v_state jsonb;
  v_candidates uuid[];
  v_anchor uuid;
  v_anchor_idx int;
  v_n int;
  v_picked uuid[];
  v_cycle uuid[];
  v_recent uuid[];
  v_keep int;
  i int;
BEGIN
  IF NOT COALESCE(private.has_role(auth.uid(), 'admin'::app_role), false) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO s FROM public.quote_settings WHERE key = 'main';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote settings are missing';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('dypol_quote_rotation'));

  v_tz := public._quote_tz(s.timezone);
  SELECT p.period_key, p.boundary INTO v_period, v_boundary
    FROM public._quote_period(s, v_now, v_tz) p;
  v_take := LEAST(GREATEST(COALESCE(s.quotes_per_day, 1), 1), 12);
  v_state := COALESCE(s.rotation_state, '{}'::jsonb);

  IF p_action = 'reset' THEN
    UPDATE public.quote_settings SET rotation_state = '{}'::jsonb WHERE key = 'main';

  ELSIF p_action = 'set_fixed' THEN
    IF p_quote_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.daily_quotes WHERE id = p_quote_id) THEN
      RAISE EXCEPTION 'Quote not found';
    END IF;
    UPDATE public.quote_settings
       SET fixed_quote_id = p_quote_id,
           display_mode = CASE WHEN p_quote_id IS NULL THEN display_mode ELSE 'fixed' END
     WHERE key = 'main';

  ELSIF p_action IN ('set_today', 'next', 'prev', 'shuffle') THEN
    IF p_action = 'set_today' THEN
      IF p_quote_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.daily_quotes WHERE id = p_quote_id) THEN
        RAISE EXCEPTION 'Quote not found';
      END IF;
      v_picked := ARRAY[p_quote_id];
    ELSE
      SELECT COALESCE(array_agg(id ORDER BY sort_order, created_at, id), '{}'::uuid[])
        INTO v_candidates
        FROM public.daily_quotes
       WHERE status = 'active';
      v_n := COALESCE(array_length(v_candidates, 1), 0);
      IF v_n = 0 THEN
        RAISE EXCEPTION 'No active quotes available';
      END IF;

      IF p_action = 'shuffle' THEN
        SELECT COALESCE(array_agg(u), '{}'::uuid[]) INTO v_picked
          FROM (SELECT u FROM unnest(v_candidates) AS u ORDER BY random() LIMIT LEAST(v_take, v_n)) t;
      ELSE
        v_anchor := NULLIF(v_state->>'last_quote_id', '')::uuid;
        IF v_state->>'period_key' = v_period THEN
          v_anchor := COALESCE((public._quote_ids_of(v_state->'quote_ids'))[1], v_anchor);
        END IF;
        v_anchor_idx := COALESCE(array_position(v_candidates, v_anchor), CASE WHEN p_action = 'next' THEN 0 ELSE 1 END);
        v_picked := '{}'::uuid[];
        FOR i IN 1..LEAST(v_take, v_n) LOOP
          IF p_action = 'next' THEN
            v_picked := v_picked || v_candidates[mod(v_anchor_idx - 1 + i, v_n) + 1];
          ELSE
            -- mod() is truncating in PostgreSQL (can return negatives) — double-mod to wrap.
            v_picked := v_picked || v_candidates[mod(mod(v_anchor_idx - 1 - i, v_n) + v_n, v_n) + 1];
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- Keep anti-repeat trackers aware of the manual pick.
    v_cycle := public._quote_ids_of(v_state->'cycle_ids') || v_picked;
    v_keep := GREATEST(s.avoid_last_count, v_take, 1);
    v_recent := public._quote_ids_of(v_state->'recent_ids') || v_picked;
    WHILE COALESCE(array_length(v_recent, 1), 0) > v_keep LOOP
      v_recent := v_recent[2:array_length(v_recent, 1)];
    END LOOP;

    UPDATE public.quote_settings
       SET rotation_state = jsonb_build_object(
             'period_key', v_period,
             'quote_ids', to_jsonb(v_picked),
             'cycle_ids', to_jsonb(v_cycle),
             'recent_ids', to_jsonb(v_recent),
             'last_quote_id', v_picked[array_length(v_picked, 1)],
             'manual_override', true,
             'picked_at', v_now
           )
     WHERE key = 'main';

    INSERT INTO public.quote_history (quote_id, period_key, mode)
      SELECT unnest(v_picked), v_period, 'manual_' || p_action;

    UPDATE public.daily_quotes
       SET display_count = display_count + 1, last_displayed_at = v_now
     WHERE id = ANY(v_picked);

  ELSE
    RAISE EXCEPTION 'Unknown quote action: %', p_action;
  END IF;

  RETURN public.get_active_quotes();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_quote_action(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_quote_action(text, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Seed defaults (§16 of the spec) + starter quotes
-- ---------------------------------------------------------------------------
INSERT INTO public.daily_quotes (text, author, category, status, sort_order) VALUES
  ('The secret of getting ahead is getting started.', 'Mark Twain', 'Motivation', 'active', 10),
  ('It always seems impossible until it is done.', 'Nelson Mandela', 'Perseverance', 'active', 20),
  ('Don''t watch the clock; do what it does. Keep going.', 'Sam Levenson', 'Discipline', 'active', 30),
  ('Success is the sum of small efforts, repeated day in and day out.', 'Robert Collier', 'Consistency', 'active', 40),
  ('The expert in anything was once a beginner.', 'Helen Hayes', 'Learning', 'active', 50),
  ('You don''t have to be great to start, but you have to start to be great.', 'Zig Ziglar', 'Motivation', 'active', 60),
  ('Discipline is choosing between what you want now and what you want most.', 'Abraham Lincoln', 'Discipline', 'active', 70),
  ('A little progress each day adds up to big results.', '', 'Consistency', 'active', 80),
  ('Focus on being productive instead of busy.', 'Tim Ferriss', 'Focus', 'active', 90),
  ('Your future is created by what you do today, not tomorrow.', 'Robert Kiyosaki', 'Action', 'active', 100);

INSERT INTO public.quote_settings (key) VALUES ('main');
