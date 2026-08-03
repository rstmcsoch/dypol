DROP POLICY IF EXISTS "Public read site-assets" ON storage.objects;

CREATE POLICY "Admins read site-assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'site-assets' AND private.has_role(auth.uid(), 'admin'::app_role));