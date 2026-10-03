CREATE TABLE public.app_download_settings (
  key text PRIMARY KEY DEFAULT 'default',
  enabled boolean NOT NULL DEFAULT false,
  apk_url text NOT NULL DEFAULT '',
  version text NOT NULL DEFAULT '1.0.0',
  file_size_label text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT 'Get the Dypol App',
  description text NOT NULL DEFAULT 'Keep your study materials, bookmarks, Dio rewards, and updates close at hand.',
  whats_new text NOT NULL DEFAULT '',
  download_label text NOT NULL DEFAULT 'Download APK',
  dismiss_label text NOT NULL DEFAULT 'Maybe later',
  note_text text NOT NULL DEFAULT 'Android APK · Install manually after download',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_download_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_download_settings TO authenticated;
GRANT ALL ON public.app_download_settings TO service_role;
ALTER TABLE public.app_download_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read popup settings" ON public.app_download_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert popup settings" ON public.app_download_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update popup settings" ON public.app_download_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER app_download_settings_updated BEFORE UPDATE ON public.app_download_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.app_download_settings (key) VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE public.app_download_user_states (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dismissed','downloaded')),
  popup_seen_at timestamptz,
  dismissed_at timestamptz,
  download_clicked_at timestamptz,
  shown_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_download_user_states TO authenticated;
GRANT ALL ON public.app_download_user_states TO service_role;
ALTER TABLE public.app_download_user_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own popup state" ON public.app_download_user_states FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Returns popup content only when the caller is eligible right now.
CREATE OR REPLACE FUNCTION public.app_popup_check()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s public.app_download_settings; st text; confirmed timestamptz;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('show', false); END IF;
  SELECT * INTO s FROM public.app_download_settings WHERE key='default';
  IF s IS NULL OR NOT s.enabled OR s.apk_url !~* '^https://' THEN RETURN jsonb_build_object('show', false); END IF;
  SELECT email_confirmed_at INTO confirmed FROM auth.users WHERE id = uid;
  IF confirmed IS NULL THEN RETURN jsonb_build_object('show', false); END IF;
  IF NOT public.user_is_onboarded(uid) OR public.user_is_blocked(uid) THEN RETURN jsonb_build_object('show', false); END IF;
  SELECT status INTO st FROM public.app_download_user_states WHERE user_id = uid;
  IF st IN ('dismissed','downloaded') THEN RETURN jsonb_build_object('show', false); END IF;
  RETURN jsonb_build_object('show', true, 'settings', to_jsonb(s) - 'created_at' - 'updated_at' - 'key' - 'enabled');
END $$;

CREATE OR REPLACE FUNCTION public.app_popup_mark(_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); v text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH'); END IF;
  IF _action NOT IN ('seen','dismissed','downloaded') THEN RETURN jsonb_build_object('ok', false, 'error', 'ACTION'); END IF;
  SELECT version INTO v FROM public.app_download_settings WHERE key='default';
  INSERT INTO public.app_download_user_states (user_id, status, popup_seen_at, shown_version)
    VALUES (uid, 'pending', now(), v) ON CONFLICT (user_id) DO NOTHING;
  IF _action = 'seen' THEN
    UPDATE public.app_download_user_states SET popup_seen_at = COALESCE(popup_seen_at, now()), shown_version = COALESCE(shown_version, v), updated_at = now() WHERE user_id = uid;
  ELSIF _action = 'dismissed' THEN
    UPDATE public.app_download_user_states SET status = 'dismissed', dismissed_at = COALESCE(dismissed_at, now()), updated_at = now() WHERE user_id = uid AND status = 'pending';
  ELSE
    UPDATE public.app_download_user_states SET status = 'downloaded', download_clicked_at = COALESCE(download_clicked_at, now()), updated_at = now() WHERE user_id = uid AND status <> 'downloaded';
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_app_popup_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE shown int; dl int; dis int; elig int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT count(*) FILTER (WHERE popup_seen_at IS NOT NULL), count(*) FILTER (WHERE status='downloaded'), count(*) FILTER (WHERE status='dismissed')
    INTO shown, dl, dis FROM public.app_download_user_states;
  SELECT count(*) INTO elig FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE u.email_confirmed_at IS NOT NULL AND p.onboarding_completed_at IS NOT NULL;
  RETURN jsonb_build_object('eligible', elig, 'shown', shown, 'downloads', dl, 'dismissals', dis,
    'conversion', CASE WHEN shown > 0 THEN round(dl::numeric * 100 / shown, 1) ELSE 0 END);
END $$;

REVOKE EXECUTE ON FUNCTION public.app_popup_check() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.app_popup_mark(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_app_popup_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_popup_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_popup_mark(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_app_popup_stats() TO authenticated;