-- First drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Admins can upload completed tax returns" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view completed tax returns" ON storage.objects;
DROP POLICY IF EXISTS "Users can download their own completed tax returns" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update completed tax returns" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete completed tax returns" ON storage.objects;

-- Now create all policies fresh
CREATE POLICY "Admins can view completed tax returns"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'completed-tax-returns' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can download their own completed tax returns"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'completed-tax-returns' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can upload completed tax returns"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'completed-tax-returns' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update completed tax returns"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'completed-tax-returns' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete completed tax returns"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'completed-tax-returns' 
  AND has_role(auth.uid(), 'admin'::app_role)
);