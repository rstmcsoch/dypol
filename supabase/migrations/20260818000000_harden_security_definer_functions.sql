-- ============================================================================
-- Harden SECURITY DEFINER functions: least-privilege EXECUTE, fixed
-- search_path, and INVOKER where elevated rights are not required.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Functions that do not need SECURITY DEFINER
-- ---------------------------------------------------------------------------

-- Reads only the caller's own profile (used as user_is_blocked(auth.uid())
-- in RLS). Authenticated users already have SELECT on their profiles row.
ALTER FUNCTION public.user_is_blocked(uuid) SECURITY INVOKER;

-- Same: only checks the caller's own onboarding columns.
ALTER FUNCTION public.user_is_onboarded(uuid) SECURITY INVOKER;

-- Only reads enabled exams / years, which already have public-read RLS.
ALTER FUNCTION public.get_onboarding_options() SECURITY INVOKER;

-- Admin-gated internally, but only counts rows the admin can already SELECT.
ALTER FUNCTION public.admin_exam_usage(uuid) SECURITY INVOKER;
ALTER FUNCTION public.admin_filter_usage(uuid) SECURITY INVOKER;

-- Internal quote helper. Called from SECURITY DEFINER get_active_quotes /
-- admin_quote_action, so it inherits the outer definer rights.
ALTER FUNCTION public._quote_json(uuid[], boolean) SECURITY INVOKER;

-- Trigger helper: no privileged table access.
ALTER FUNCTION public.set_updated_at() SECURITY INVOKER;

-- Ledger immutability trigger: no privileged table access.
ALTER FUNCTION private.dio_block_mutation() SECURITY INVOKER;

-- ---------------------------------------------------------------------------
-- 2. Fixed search_path on every function (DEFINER and INVOKER)
--    public + private where the body calls private.has_role / private.dio_apply;
--    public only otherwise. pg_temp last so temp objects cannot shadow.
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.user_is_blocked(uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.user_is_onboarded(uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.get_onboarding_options()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_exam_usage(uuid)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.admin_filter_usage(uuid)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public._quote_json(uuid[], boolean)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION private.dio_block_mutation()
  SET search_path = public, pg_temp;

ALTER FUNCTION public._quote_appearance(public.quote_settings)
  SET search_path = public, pg_temp;
ALTER FUNCTION public._quote_ids_of(jsonb)
  SET search_path = public, pg_temp;
ALTER FUNCTION public._quote_tz(text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public._quote_period(public.quote_settings, timestamptz, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.has_role(uuid, public.app_role)
  SET search_path = public, pg_temp;
ALTER FUNCTION private.has_role(uuid, public.app_role)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_temp;
ALTER FUNCTION private.protect_profile_columns()
  SET search_path = public, private, pg_temp;

ALTER FUNCTION public.complete_onboarding(text, integer)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.activity_begin(text)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.activity_heartbeat(uuid, integer)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.activity_end(uuid, integer)
  SET search_path = public, private, pg_temp;

ALTER FUNCTION public.admin_list_users(text, text, text, text, integer, integer, integer)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.admin_user_profile(uuid)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.admin_block_user(uuid, text, integer, text, timestamptz)
  SET search_path = public, private, pg_temp;

ALTER FUNCTION public.dio_unlock(text, uuid)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.dio_ad_start(uuid)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.dio_ad_award(text)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.dio_admin_adjust(uuid, integer, text, text)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.dio_admin_users(text, text, integer)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.dio_admin_transactions(uuid, text, timestamptz, timestamptz, integer, uuid, text, integer)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.dio_admin_stats()
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.dio_admin_review_completion(uuid, boolean)
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.dio_admin_pending_completions()
  SET search_path = public, private, pg_temp;
ALTER FUNCTION private.dio_apply(uuid, integer, text, text, text, text, uuid, text, uuid, uuid, uuid)
  SET search_path = public, private, pg_temp;

-- get_active_quotes / admin_quote_action call private.has_role (fully
-- qualified). Include private so the path is intentional, not empty/mutable.
ALTER FUNCTION public.get_active_quotes()
  SET search_path = public, private, pg_temp;
ALTER FUNCTION public.admin_quote_action(text, uuid)
  SET search_path = public, private, pg_temp;

-- ---------------------------------------------------------------------------
-- 3. EXECUTE privileges — never leave PUBLIC; grant only the role that
--    actually calls the function (frontend RPC, RLS, trigger, or service).
-- ---------------------------------------------------------------------------

-- Legacy public.has_role is unused by current policies (private.has_role
-- replaced it). Keep the function so any leftover policy does not break,
-- but do not let clients call it.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
-- RLS policies evaluate this as the querying role.
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

REVOKE ALL ON FUNCTION private.protect_profile_columns() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.protect_profile_columns() FROM anon, authenticated;

REVOKE ALL ON FUNCTION private.dio_apply(uuid, integer, text, text, text, text, uuid, text, uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.dio_apply(uuid, integer, text, text, text, text, uuid, text, uuid, uuid, uuid) FROM anon, authenticated;

REVOKE ALL ON FUNCTION private.dio_block_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.dio_block_mutation() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION private.dio_block_mutation() TO service_role;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;

-- Internal quote helpers: not part of the Data API contract.
REVOKE ALL ON FUNCTION public._quote_appearance(public.quote_settings) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._quote_json(uuid[], boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._quote_ids_of(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._quote_tz(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._quote_period(public.quote_settings, timestamptz, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._quote_appearance(public.quote_settings) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._quote_json(uuid[], boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._quote_ids_of(jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._quote_tz(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._quote_period(public.quote_settings, timestamptz, text) FROM anon, authenticated;

-- Public quote reader (home page, signed-out visitors).
REVOKE ALL ON FUNCTION public.get_active_quotes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_quotes() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_quote_action(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_quote_action(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_quote_action(text, uuid) TO authenticated, service_role;

-- RLS helpers + student RPCs
REVOKE ALL ON FUNCTION public.user_is_blocked(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_blocked(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_is_blocked(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.user_is_onboarded(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_onboarded(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_is_onboarded(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_onboarding_options() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_onboarding_options() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_options() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_onboarding(text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.activity_begin(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activity_begin(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.activity_begin(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.activity_heartbeat(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activity_heartbeat(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.activity_heartbeat(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.activity_end(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activity_end(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.activity_end(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dio_unlock(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_unlock(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_unlock(text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dio_ad_start(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_ad_start(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_ad_start(uuid) TO authenticated, service_role;

-- Server-only postback (src/routes/api/public/dio/ad-postback.ts uses service role).
REVOKE ALL ON FUNCTION public.dio_ad_award(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_ad_award(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dio_ad_award(text) TO service_role;

-- Admin RPCs: called from the admin UI with the signed-in admin JWT.
-- Role is re-checked inside each function via private.has_role.
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, text, text, integer, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, text, text, text, integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, text, text, integer, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_user_profile(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_user_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_user_profile(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_block_user(uuid, text, integer, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_block_user(uuid, text, integer, text, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_block_user(uuid, text, integer, text, timestamptz) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_exam_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_exam_usage(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_exam_usage(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_filter_usage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_filter_usage(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_filter_usage(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dio_admin_adjust(uuid, integer, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_admin_adjust(uuid, integer, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_admin_adjust(uuid, integer, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dio_admin_users(text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_admin_users(text, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_admin_users(text, text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dio_admin_transactions(uuid, text, timestamptz, timestamptz, integer, uuid, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_admin_transactions(uuid, text, timestamptz, timestamptz, integer, uuid, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_admin_transactions(uuid, text, timestamptz, timestamptz, integer, uuid, text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dio_admin_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_admin_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_admin_stats() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dio_admin_review_completion(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_admin_review_completion(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_admin_review_completion(uuid, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.dio_admin_pending_completions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_admin_pending_completions() FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_admin_pending_completions() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Comments on remaining SECURITY DEFINER functions
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION private.has_role(uuid, public.app_role) IS
  'SECURITY DEFINER: RLS helper that reads public.user_roles without recursion. EXECUTE: authenticated + service_role (policy evaluation).';

COMMENT ON FUNCTION public.handle_new_user() IS
  'SECURITY DEFINER: auth.users trigger that provisions profiles, roles, and a Dio wallet. EXECUTE revoked from PUBLIC/anon/authenticated.';

COMMENT ON FUNCTION private.protect_profile_columns() IS
  'SECURITY DEFINER: BEFORE UPDATE trigger that blocks client writes to privileged profile columns. Not callable via the API.';

COMMENT ON FUNCTION private.dio_apply(uuid, integer, text, text, text, text, uuid, text, uuid, uuid, uuid) IS
  'SECURITY DEFINER: atomic Dio ledger write. Not granted to PUBLIC/anon/authenticated; only other DEFINER functions and the table owner call it.';

COMMENT ON FUNCTION public.complete_onboarding(text, integer) IS
  'SECURITY DEFINER: writes protected onboarding columns via app.system_bypass. EXECUTE: authenticated + service_role. Binds to auth.uid().';

COMMENT ON FUNCTION public.activity_begin(text) IS
  'SECURITY DEFINER: inserts user_sessions (no client INSERT grant) and updates activity counters. EXECUTE: authenticated + service_role.';

COMMENT ON FUNCTION public.activity_heartbeat(uuid, integer) IS
  'SECURITY DEFINER: owned-session heartbeat with clamped deltas. EXECUTE: authenticated + service_role.';

COMMENT ON FUNCTION public.activity_end(uuid, integer) IS
  'SECURITY DEFINER: closes an owned session. EXECUTE: authenticated + service_role.';

COMMENT ON FUNCTION public.admin_list_users(text, text, text, text, integer, integer, integer) IS
  'SECURITY DEFINER: joins auth.users for the admin directory. Requires private.has_role(..., admin). EXECUTE: authenticated + service_role.';

COMMENT ON FUNCTION public.admin_user_profile(uuid) IS
  'SECURITY DEFINER: admin profile detail including auth.users email. Requires admin role.';

COMMENT ON FUNCTION public.admin_block_user(uuid, text, integer, text, timestamptz) IS
  'SECURITY DEFINER: privileged account-status updates. Requires admin; cannot block other admins.';

COMMENT ON FUNCTION public.dio_unlock(text, uuid) IS
  'SECURITY DEFINER: debit wallet + insert material_unlocks (no client write grants). Binds to auth.uid().';

COMMENT ON FUNCTION public.dio_ad_start(uuid) IS
  'SECURITY DEFINER: creates a pending ad completion for auth.uid().';

COMMENT ON FUNCTION public.dio_ad_award(text) IS
  'SECURITY DEFINER: credits Dio for a verified postback. EXECUTE: service_role only.';

COMMENT ON FUNCTION public.dio_admin_adjust(uuid, integer, text, text) IS
  'SECURITY DEFINER: admin ledger credit/debit. Requires admin role.';

COMMENT ON FUNCTION public.dio_admin_users(text, text, integer) IS
  'SECURITY DEFINER: lists wallets joined to auth.users. Requires admin role.';

COMMENT ON FUNCTION public.dio_admin_transactions(uuid, text, timestamptz, timestamptz, integer, uuid, text, integer) IS
  'SECURITY DEFINER: ledger listing with auth.users emails. Requires admin role.';

COMMENT ON FUNCTION public.dio_admin_stats() IS
  'SECURITY DEFINER: cross-user Dio aggregates. Requires admin role.';

COMMENT ON FUNCTION public.dio_admin_review_completion(uuid, boolean) IS
  'SECURITY DEFINER: approve/reject ad completions (approve calls dio_ad_award). Requires admin role.';

COMMENT ON FUNCTION public.dio_admin_pending_completions() IS
  'SECURITY DEFINER: pending completions with emails. Requires admin role.';

COMMENT ON FUNCTION public.get_active_quotes() IS
  'SECURITY DEFINER: shared quote rotation + writes quote_settings/history. EXECUTE: anon + authenticated + service_role (public homepage).';

COMMENT ON FUNCTION public.admin_quote_action(text, uuid) IS
  'SECURITY DEFINER: admin rotation controls. Requires admin role.';
