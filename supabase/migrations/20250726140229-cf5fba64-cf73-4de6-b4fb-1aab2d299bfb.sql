-- Check existing storage policies for documents bucket
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%documents%';

-- Create comprehensive storage policies for documents bucket
-- First, let's create policies for users to upload their own documents

-- Policy for users to upload documents to their own folder
CREATE POLICY "Users can upload documents to own folder" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for users to select/view their own documents
CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for users to update their own documents
CREATE POLICY "Users can update own documents" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for users to delete their own documents
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy for admins to access all documents
CREATE POLICY "Admins can access all documents" ON storage.objects
  FOR ALL 
  USING (
    bucket_id = 'documents' 
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::app_role
    )
  )
  WITH CHECK (
    bucket_id = 'documents' 
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::app_role
    )
  );