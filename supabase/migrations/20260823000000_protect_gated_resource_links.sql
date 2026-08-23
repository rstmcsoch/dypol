-- ==========================================================================
-- Keep resource destination URLs out of anonymous/direct table reads.
--
-- `materials` and `portals` must remain publicly readable for their catalog
-- metadata, but their `link` column is the value protected by Dio unlocks.
-- RLS filters rows, not columns, so a public SELECT policy on the base table
-- also exposed paid destination URLs.  The catalog views below expose the URL
-- only to an admin or to an eligible signed-in user who has access.
-- ==========================================================================

ALTER TABLE public.materials
  ADD CONSTRAINT materials_link_http_only
  CHECK (
    link = ''
    OR (
      char_length(link) <= 4096
      AND link ~* '^https?://[^[:space:]]+$'
    )
  ) NOT VALID;

ALTER TABLE public.portals
  ADD CONSTRAINT portals_link_http_only
  CHECK (
    link = ''
    OR (
      char_length(link) <= 4096
      AND link ~* '^https?://[^[:space:]]+$'
    )
  ) NOT VALID;

ALTER TABLE public.materials VALIDATE CONSTRAINT materials_link_http_only;
ALTER TABLE public.portals VALIDATE CONSTRAINT portals_link_http_only;

-- A SECURITY INVOKER view cannot itself read a column that has been revoked
-- from the caller.  This narrowly scoped helper is therefore the sole reader
-- of the destination column.  Calling it directly never grants more access
-- than reading the catalog view.
CREATE OR REPLACE FUNCTION public.catalog_resource_access(
  _kind text,
  _item_id uuid
)
RETURNS TABLE (link text, has_link boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
ROWS 1
AS $$
DECLARE
  _uid uuid := auth.uid();
  _stored_link text := '';
  _cost integer := 0;
  _eligible boolean := false;
BEGIN
  IF _kind = 'material' THEN
    SELECT m.link, m.dio_cost
    INTO _stored_link, _cost
    FROM public.materials m
    WHERE m.id = _item_id;
  ELSIF _kind = 'portal' THEN
    SELECT p.link, p.dio_cost
    INTO _stored_link, _cost
    FROM public.portals p
    WHERE p.id = _item_id;
  END IF;

  link := '';
  has_link := NULLIF(btrim(COALESCE(_stored_link, '')), '') IS NOT NULL;
  IF NOT has_link THEN
    RETURN NEXT;
    RETURN;
  END IF;

  IF _uid IS NOT NULL
     AND COALESCE(private.has_role(_uid, 'admin'::public.app_role), false) THEN
    link := _stored_link;
    RETURN NEXT;
    RETURN;
  END IF;

  IF _uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _uid
        AND p.account_status <> 'blocked'
        AND (p.blocked_until IS NULL OR p.blocked_until <= now())
        AND p.onboarding_completed_at IS NOT NULL
        AND p.selected_exam IS NOT NULL
        AND p.preparation_year IS NOT NULL
    )
    INTO _eligible;
  END IF;

  IF _eligible
     AND (
       _cost = 0
       OR EXISTS (
         SELECT 1
         FROM public.material_unlocks u
         WHERE u.user_id = _uid
           AND u.item_kind = _kind
           AND u.item_id = _item_id
           AND u.status = 'active'
       )
     ) THEN
    link := _stored_link;
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_resource_access(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_resource_access(text, uuid)
  TO anon, authenticated, service_role;

CREATE VIEW public.materials_catalog
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  m.id,
  m.slug,
  m.tier,
  m.subject,
  m.type,
  m.title,
  m.description,
  access.link,
  access.has_link,
  m.image_url,
  m.credit_name,
  m.dio_cost,
  m.exam_id,
  m.sort_order,
  m.created_at,
  m.updated_at
FROM public.materials m
CROSS JOIN LATERAL public.catalog_resource_access('material', m.id) access;

CREATE VIEW public.portals_catalog
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.description,
  access.link,
  access.has_link,
  p.logo_url,
  p.link_count,
  p.credit_name,
  p.dio_cost,
  p.sort_order,
  p.created_at,
  p.updated_at
FROM public.portals p
CROSS JOIN LATERAL public.catalog_resource_access('portal', p.id) access;

REVOKE ALL ON public.materials_catalog FROM PUBLIC;
REVOKE ALL ON public.portals_catalog FROM PUBLIC;
GRANT SELECT ON public.materials_catalog TO anon, authenticated, service_role;
GRANT SELECT ON public.portals_catalog TO anon, authenticated, service_role;

-- Remove table-level SELECT and grant every catalog column except the secret
-- destination.  Admins still retain INSERT/UPDATE/DELETE and read the full URL
-- through the role-aware catalog views above.
REVOKE SELECT ON public.materials FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, slug, tier, subject, type, title, description, image_url, credit_name,
  dio_cost, exam_id, sort_order, created_at, updated_at
) ON public.materials TO anon, authenticated;

REVOKE SELECT ON public.portals FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, slug, name, description, logo_url, link_count, credit_name, dio_cost,
  sort_order, created_at, updated_at
) ON public.portals TO anon, authenticated;

COMMENT ON VIEW public.materials_catalog IS
  'Public material metadata. Destination link is visible only to admins or eligible users with Dio access.';
COMMENT ON VIEW public.portals_catalog IS
  'Public portal metadata. Destination link is visible only to admins or eligible users with Dio access.';
COMMENT ON FUNCTION public.catalog_resource_access(text, uuid) IS
  'SECURITY DEFINER: returns a destination only to an admin or an eligible user with free/unlocked access.';
