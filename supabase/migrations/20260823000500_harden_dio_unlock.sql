-- Preserve admin revocations and never return an empty destination from the
-- student unlock RPC. The function remains the only mutation path for unlocks.
CREATE OR REPLACE FUNCTION public.dio_unlock(_item_kind text, _item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost integer;
  _title text;
  _link text;
  _bal integer;
  _unlock_id uuid;
  _res jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  END IF;
  IF public.user_is_blocked(_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ACCOUNT_BLOCKED');
  END IF;
  IF NOT public.user_is_onboarded(_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ONBOARDING_REQUIRED');
  END IF;
  IF _item_kind NOT IN ('material', 'portal') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'BAD_KIND');
  END IF;

  IF _item_kind = 'material' THEN
    SELECT dio_cost, title, link
    INTO _cost, _title, _link
    FROM public.materials
    WHERE id = _item_id;
  ELSE
    SELECT dio_cost, name, link
    INTO _cost, _title, _link
    FROM public.portals
    WHERE id = _item_id;
  END IF;

  IF _cost IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  END IF;
  IF NULLIF(btrim(COALESCE(_link, '')), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RESOURCE_UNAVAILABLE');
  END IF;

  INSERT INTO public.dio_wallets (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO _bal
  FROM public.dio_wallets
  WHERE user_id = _uid
  FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.material_unlocks
    WHERE user_id = _uid
      AND item_kind = _item_kind
      AND item_id = _item_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'ok', true, 'already', true, 'balance', _bal, 'link', _link, 'cost', _cost
    );
  END IF;

  -- A revoked row is an explicit admin decision. The old implementation let
  -- the user reactivate it for free by calling this RPC again.
  IF EXISTS (
    SELECT 1 FROM public.material_unlocks
    WHERE user_id = _uid
      AND item_kind = _item_kind
      AND item_id = _item_id
      AND status = 'revoked'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ACCESS_REVOKED');
  END IF;

  IF _bal < _cost THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'INSUFFICIENT_DIO', 'balance', _bal,
      'needed', _cost - _bal, 'cost', _cost
    );
  END IF;

  INSERT INTO public.material_unlocks (user_id, item_kind, item_id, amount_paid)
  VALUES (_uid, _item_kind, _item_id, _cost)
  RETURNING id INTO _unlock_id;

  IF _cost > 0 THEN
    _res := private.dio_apply(
      _uid,
      -_cost,
      'MATERIAL_UNLOCK',
      'Unlocked: ' || COALESCE(_title, 'resource'),
      _item_kind,
      'unlock:' || _unlock_id::text,
      NULL,
      _item_kind,
      _item_id,
      NULL,
      NULL
    );
    IF (_res->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'DIO_DEBIT_FAILED:%', _res->>'error';
    END IF;
    UPDATE public.material_unlocks
    SET transaction_id = (_res->>'transaction_id')::uuid
    WHERE id = _unlock_id;
    _bal := (_res->>'balance')::integer;
  END IF;

  PERFORM set_config('app.system_bypass', '1', true);
  UPDATE public.profiles SET last_active_at = now() WHERE id = _uid;

  RETURN jsonb_build_object(
    'ok', true, 'already', false, 'balance', _bal, 'link', _link, 'cost', _cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dio_unlock(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dio_unlock(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.dio_unlock(text, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.dio_unlock(text, uuid) IS
  'SECURITY DEFINER: validates account eligibility, preserves admin revocations, and atomically debits before returning a resource URL.';
