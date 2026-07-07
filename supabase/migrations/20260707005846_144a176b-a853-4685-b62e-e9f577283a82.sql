GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS "Admins upload site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins update site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read site-assets" ON storage.objects;

CREATE POLICY "Admins upload site-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins update site-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins delete site-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Public read site-assets"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'site-assets');