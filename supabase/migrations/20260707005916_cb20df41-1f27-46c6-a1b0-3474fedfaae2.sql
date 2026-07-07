CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admin insert materials" ON public.materials;
DROP POLICY IF EXISTS "Admin update materials" ON public.materials;
DROP POLICY IF EXISTS "Admin delete materials" ON public.materials;
DROP POLICY IF EXISTS "Admin insert portals" ON public.portals;
DROP POLICY IF EXISTS "Admin update portals" ON public.portals;
DROP POLICY IF EXISTS "Admin delete portals" ON public.portals;
DROP POLICY IF EXISTS "Admin insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admin update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins upload site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins update site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete site-assets" ON storage.objects;

CREATE POLICY "Admin insert materials"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update materials"
ON public.materials
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete materials"
ON public.materials
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert portals"
ON public.portals
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update portals"
ON public.portals
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete portals"
ON public.portals
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert site_settings"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update site_settings"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload site-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND private.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins update site-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND private.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'site-assets'
  AND private.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins delete site-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND private.has_role(auth.uid(), 'admin')
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;