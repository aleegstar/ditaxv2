
-- Allow users to read their own tax documents from the private 'tax-documents' bucket.
-- Path convention used by the app stores files under <user_id>/<...>.
CREATE POLICY "Users can view their own tax documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tax-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
