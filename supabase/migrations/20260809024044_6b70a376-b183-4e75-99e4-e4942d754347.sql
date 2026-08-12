-- ============ Dio core tables ============

CREATE TABLE public.dio_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dio_wallets TO authenticated;
GRANT ALL ON public.dio_wallets TO service_role;
ALTER TABLE public.dio_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own wallet" ON public.dio_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all wallets" ON public.dio_wallets FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX dio_wallets_balance_idx ON public.dio_wallets (balance DESC);
CREATE TRIGGER dio_wallets_updated_at BEFORE UPDATE ON public.dio_wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dio_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('MATERIAL_UNLOCK','AD_REWARD','ADMIN_CREDIT','ADMIN_DEBIT','ADMIN_GIFT','REFUND','OTHER')),
  reason text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'system',
  item_kind text,
  item_id uuid,
  ad_offer_id uuid,
  ad_completion_id uuid,
  admin_id uuid,
  balance_before integer NOT NULL,
  balance_after integer NOT NULL,
  reference text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dio_transactions TO authenticated;
GRANT ALL ON public.dio_transactions TO service_role;
ALTER TABLE public.dio_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.dio_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all transactions" ON public.dio_transactions FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX dio_tx_user_created_idx ON public.dio_transactions (user_id, created_at DESC);
CREATE INDEX dio_tx_type_created_idx ON public.dio_transactions (type, created_at DESC);
CREATE INDEX dio_tx_item_idx ON public.dio_transactions (item_kind, item_id);
CREATE INDEX dio_tx_offer_idx ON public.dio_transactions (ad_offer_id);

-- ledger is immutable
CREATE OR REPLACE FUNCTION private.dio_block_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Dio ledger entries are immutable'; END; $$;
CREATE TRIGGER dio_tx_immutable BEFORE UPDATE OR DELETE ON public.dio_transactions
FOR EACH ROW EXECUTE FUNCTION private.dio_block_mutation();

CREATE TABLE public.material_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('material','portal')),
  item_id uuid NOT NULL,
  transaction_id uuid REFERENCES public.dio_transactions(id) ON DELETE SET NULL,
  amount_paid integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  unlocked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.material_unlocks TO authenticated;
GRANT ALL ON public.material_unlocks TO service_role;
ALTER TABLE public.material_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own unlocks" ON public.material_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all unlocks" ON public.material_unlocks FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update unlocks" ON public.material_unlocks FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE UNIQUE INDEX material_unlocks_unique_idx ON public.material_unlocks (user_id, item_kind, item_id);
CREATE INDEX material_unlocks_item_idx ON public.material_unlocks (item_kind, item_id);

-- ============ Ad offers / completions ============

CREATE TABLE public.dio_ad_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Sponsored activity',
  description text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  reward_amount integer NOT NULL DEFAULT 10 CHECK (reward_amount >= 0 AND reward_amount <= 100000),
  verification text NOT NULL DEFAULT 'manual' CHECK (verification IN ('postback','manual')),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dio_ad_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dio_ad_offers TO authenticated;
GRANT ALL ON public.dio_ad_offers TO service_role;
ALTER TABLE public.dio_ad_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read live offers" ON public.dio_ad_offers FOR SELECT TO authenticated
  USING (active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "Admins read all offers" ON public.dio_ad_offers FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert offers" ON public.dio_ad_offers FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update offers" ON public.dio_ad_offers FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete offers" ON public.dio_ad_offers FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER dio_ad_offers_updated_at BEFORE UPDATE ON public.dio_ad_offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX dio_ad_offers_sort_idx ON public.dio_ad_offers (active, sort_order);

CREATE TABLE public.dio_ad_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.dio_ad_offers(id) ON DELETE RESTRICT,
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected')),
  reward_amount integer NOT NULL DEFAULT 0,
  transaction_id uuid REFERENCES public.dio_transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.dio_ad_completions TO authenticated;
GRANT ALL ON public.dio_ad_completions TO service_role;
ALTER TABLE public.dio_ad_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own completions" ON public.dio_ad_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all completions" ON public.dio_ad_completions FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE UNIQUE INDEX dio_ad_completions_one_per_offer_idx ON public.dio_ad_completions (user_id, offer_id) WHERE status <> 'rejected';
CREATE INDEX dio_ad_completions_offer_idx ON public.dio_ad_completions (offer_id, status);

-- ============ Dio cost on content ============

ALTER TABLE public.materials ADD COLUMN dio_cost integer NOT NULL DEFAULT 0 CHECK (dio_cost >= 0 AND dio_cost <= 1000000);
ALTER TABLE public.portals ADD COLUMN dio_cost integer NOT NULL DEFAULT 0 CHECK (dio_cost >= 0 AND dio_cost <= 1000000);

-- ============ Atomic ledger helper ============

CREATE OR REPLACE FUNCTION private.dio_apply(
  _user_id uuid, _amount integer, _type text, _reason text, _source text, _reference text,
  _admin_id uuid DEFAULT NULL, _item_kind text DEFAULT NULL, _item_id uuid DEFAULT NULL,
  _ad_offer_id uuid DEFAULT NULL, _ad_completion_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _before integer; _after integer; _txid uuid;
BEGIN
  INSERT INTO public.dio_wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO _before FROM public.dio_wallets WHERE user_id = _user_id FOR UPDATE;
  _after := _before + _amount;
  IF _after < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_DIO', 'balance', _before, 'needed', -_after);
  END IF;
  BEGIN
    INSERT INTO public.dio_transactions
      (user_id, amount, type, reason, source, reference, admin_id, item_kind, item_id, ad_offer_id, ad_completion_id, balance_before, balance_after)
    VALUES (_user_id, _amount, _type, COALESCE(_reason,''), COALESCE(_source,'system'), _reference, _admin_id, _item_kind, _item_id, _ad_offer_id, _ad_completion_id, _before, _after)
    RETURNING id INTO _txid;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'balance', _before);
  END;
  UPDATE public.dio_wallets SET balance = _after WHERE user_id = _user_id;
  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'transaction_id', _txid, 'balance', _after);
END; $$;
REVOKE ALL ON FUNCTION private.dio_apply(uuid,integer,text,text,text,text,uuid,text,uuid,uuid,uuid) FROM PUBLIC;

-- ============ Unlock (student) ============

CREATE OR REPLACE FUNCTION public.dio_unlock(_item_kind text, _item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _uid uuid := auth.uid(); _cost integer; _title text; _link text; _bal integer;
        _unlock_id uuid; _res jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
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

  RETURN jsonb_build_object('ok', true, 'already', false, 'balance', _bal, 'link', _link, 'cost', _cost);
END; $$;
REVOKE ALL ON FUNCTION public.dio_unlock(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_unlock(text, uuid) TO authenticated, service_role;

-- ============ Ad start / status (student) ============

CREATE OR REPLACE FUNCTION public.dio_ad_start(_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _uid uuid := auth.uid(); _offer public.dio_ad_offers; _row public.dio_ad_completions; _ref text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED'); END IF;
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

  RETURN jsonb_build_object('ok', true, 'reference', _row.reference, 'status', _row.status,
                            'url', _offer.url, 'verification', _offer.verification, 'reward', _offer.reward_amount);
END; $$;
REVOKE ALL ON FUNCTION public.dio_ad_start(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_ad_start(uuid) TO authenticated, service_role;

-- Award: only callable by the verified server callback (service_role) or admin helper below.
CREATE OR REPLACE FUNCTION public.dio_ad_award(_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _row public.dio_ad_completions; _offer public.dio_ad_offers; _res jsonb;
BEGIN
  SELECT * INTO _row FROM public.dio_ad_completions WHERE reference = _reference FOR UPDATE;
  IF _row.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNKNOWN_REFERENCE'); END IF;
  IF _row.status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'reward', _row.reward_amount);
  END IF;
  IF _row.status = 'rejected' THEN RETURN jsonb_build_object('ok', false, 'error', 'REJECTED'); END IF;

  SELECT * INTO _offer FROM public.dio_ad_offers WHERE id = _row.offer_id;
  _res := private.dio_apply(_row.user_id, _row.reward_amount, 'AD_REWARD',
            'Ad reward: ' || COALESCE(_offer.title,'sponsored activity'), 'ad',
            'ad:' || _row.reference, NULL, NULL, NULL, _row.offer_id, _row.id);
  IF (_res->>'ok')::boolean IS NOT TRUE THEN RETURN _res; END IF;

  UPDATE public.dio_ad_completions
    SET status='completed', completed_at=now(), transaction_id=(_res->>'transaction_id')::uuid
    WHERE id = _row.id;
  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'reward', _row.reward_amount, 'balance', _res->>'balance');
END; $$;
REVOKE ALL ON FUNCTION public.dio_ad_award(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_ad_award(text) TO service_role;

-- ============ Admin operations ============

CREATE OR REPLACE FUNCTION public.dio_admin_adjust(_user_id uuid, _amount integer, _type text, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _admin uuid := auth.uid(); _signed integer;
BEGIN
  IF _admin IS NULL OR NOT private.has_role(_admin, 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;
  IF _type NOT IN ('ADMIN_CREDIT','ADMIN_DEBIT','ADMIN_GIFT','REFUND','OTHER') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BAD_TYPE');
  END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 1000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BAD_AMOUNT');
  END IF;
  _signed := CASE WHEN _type = 'ADMIN_DEBIT' THEN -_amount ELSE _amount END;
  RETURN private.dio_apply(_user_id, _signed, _type, COALESCE(NULLIF(trim(_reason),''),'Admin adjustment'),
                           'admin', 'admin:' || gen_random_uuid()::text, _admin, NULL, NULL, NULL, NULL);
END; $$;
REVOKE ALL ON FUNCTION public.dio_admin_adjust(uuid,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_admin_adjust(uuid,integer,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dio_admin_users(_search text DEFAULT '', _sort text DEFAULT 'desc', _limit integer DEFAULT 50)
RETURNS TABLE (user_id uuid, email text, display_name text, balance integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name, COALESCE(w.balance, 0)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.dio_wallets w ON w.user_id = u.id
  WHERE COALESCE(NULLIF(trim(_search), ''), '') = ''
     OR u.email ILIKE '%' || trim(_search) || '%'
     OR COALESCE(p.display_name,'') ILIKE '%' || trim(_search) || '%'
  ORDER BY
    CASE WHEN lower(COALESCE(_sort,'desc')) = 'asc' THEN COALESCE(w.balance,0) END ASC NULLS LAST,
    CASE WHEN lower(COALESCE(_sort,'desc')) <> 'asc' THEN COALESCE(w.balance,0) END DESC NULLS LAST,
    u.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
END; $$;
REVOKE ALL ON FUNCTION public.dio_admin_users(text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_admin_users(text,text,integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dio_admin_transactions(
  _user_id uuid DEFAULT NULL, _type text DEFAULT NULL, _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL, _min_amount integer DEFAULT NULL, _admin_id uuid DEFAULT NULL,
  _source text DEFAULT NULL, _limit integer DEFAULT 100
) RETURNS TABLE (
  id uuid, user_id uuid, email text, amount integer, type text, reason text, source text,
  item_kind text, item_id uuid, ad_offer_id uuid, admin_id uuid, admin_email text,
  balance_before integer, balance_after integer, reference text, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT t.id, t.user_id, u.email::text, t.amount, t.type, t.reason, t.source,
         t.item_kind, t.item_id, t.ad_offer_id, t.admin_id, a.email::text,
         t.balance_before, t.balance_after, t.reference, t.created_at
  FROM public.dio_transactions t
  LEFT JOIN auth.users u ON u.id = t.user_id
  LEFT JOIN auth.users a ON a.id = t.admin_id
  WHERE (_user_id IS NULL OR t.user_id = _user_id)
    AND (_type IS NULL OR _type = '' OR t.type = _type)
    AND (_from IS NULL OR t.created_at >= _from)
    AND (_to IS NULL OR t.created_at <= _to)
    AND (_min_amount IS NULL OR abs(t.amount) >= _min_amount)
    AND (_admin_id IS NULL OR t.admin_id = _admin_id)
    AND (_source IS NULL OR _source = '' OR t.source = _source)
  ORDER BY t.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END; $$;
REVOKE ALL ON FUNCTION public.dio_admin_transactions(uuid,text,timestamptz,timestamptz,integer,uuid,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_admin_transactions(uuid,text,timestamptz,timestamptz,integer,uuid,text,integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dio_admin_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _out jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT jsonb_build_object(
    'total_held', (SELECT COALESCE(SUM(balance),0) FROM public.dio_wallets),
    'wallets', (SELECT COUNT(*) FROM public.dio_wallets),
    'earned_today', (SELECT COALESCE(SUM(amount),0) FROM public.dio_transactions WHERE amount > 0 AND created_at >= date_trunc('day', now())),
    'earned_week', (SELECT COALESCE(SUM(amount),0) FROM public.dio_transactions WHERE amount > 0 AND created_at >= now() - interval '7 days'),
    'spent_today', (SELECT COALESCE(-SUM(amount),0) FROM public.dio_transactions WHERE amount < 0 AND created_at >= date_trunc('day', now())),
    'spent_week', (SELECT COALESCE(-SUM(amount),0) FROM public.dio_transactions WHERE amount < 0 AND created_at >= now() - interval '7 days'),
    'total_unlocks', (SELECT COUNT(*) FROM public.material_unlocks WHERE status='active'),
    'total_ad_completions', (SELECT COUNT(*) FROM public.dio_ad_completions WHERE status='completed'),
    'pending_ad_completions', (SELECT COUNT(*) FROM public.dio_ad_completions WHERE status='pending'),
    'most_expensive', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT title, dio_cost FROM public.materials WHERE dio_cost > 0 ORDER BY dio_cost DESC LIMIT 5) x),
    'most_unlocked', (SELECT COALESCE(jsonb_agg(y), '[]'::jsonb) FROM (
        SELECT COALESCE(m.title, p.name, 'Unknown') AS title, COUNT(*) AS unlocks
        FROM public.material_unlocks mu
        LEFT JOIN public.materials m ON m.id = mu.item_id AND mu.item_kind = 'material'
        LEFT JOIN public.portals p ON p.id = mu.item_id AND mu.item_kind = 'portal'
        WHERE mu.status = 'active'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 5) y),
    'ad_totals', (SELECT COALESCE(jsonb_agg(z), '[]'::jsonb) FROM (
        SELECT o.id, o.title, o.active, o.reward_amount,
               COUNT(c.id) FILTER (WHERE c.status='completed') AS completions,
               COALESCE(SUM(t.amount) FILTER (WHERE t.amount > 0), 0) AS dio_distributed
        FROM public.dio_ad_offers o
        LEFT JOIN public.dio_ad_completions c ON c.offer_id = o.id
        LEFT JOIN public.dio_transactions t ON t.ad_completion_id = c.id
        GROUP BY o.id, o.title, o.active, o.reward_amount
        ORDER BY o.sort_order ASC) z)
  ) INTO _out;
  RETURN _out;
END; $$;
REVOKE ALL ON FUNCTION public.dio_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_admin_stats() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dio_admin_review_completion(_completion_id uuid, _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE _row public.dio_ad_completions;
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;
  SELECT * INTO _row FROM public.dio_ad_completions WHERE id = _completion_id;
  IF _row.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;
  IF NOT _approve THEN
    UPDATE public.dio_ad_completions SET status='rejected' WHERE id=_completion_id AND status='pending';
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;
  RETURN public.dio_ad_award(_row.reference);
END; $$;
REVOKE ALL ON FUNCTION public.dio_admin_review_completion(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_admin_review_completion(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dio_admin_pending_completions()
RETURNS TABLE (id uuid, user_id uuid, email text, offer_id uuid, offer_title text, reward_amount integer, reference text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT c.id, c.user_id, u.email::text, c.offer_id, o.title, c.reward_amount, c.reference, c.created_at
  FROM public.dio_ad_completions c
  LEFT JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.dio_ad_offers o ON o.id = c.offer_id
  WHERE c.status = 'pending'
  ORDER BY c.created_at ASC
  LIMIT 200;
END; $$;
REVOKE ALL ON FUNCTION public.dio_admin_pending_completions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dio_admin_pending_completions() TO authenticated, service_role;

-- ============ New users start with a 0 Dio wallet ============

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.dio_wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- backfill wallets for existing users
INSERT INTO public.dio_wallets (user_id, balance)
SELECT id, 0 FROM auth.users ON CONFLICT (user_id) DO NOTHING;