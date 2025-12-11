
-- Drop existing policies if they cause issues
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.uploaded_documents;

-- Create a clearer, more explicit policy for document uploads
CREATE POLICY "Users can insert their own documents"
  ON public.uploaded_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ensure the storage.objects policies are correctly set for the documents bucket
INSERT INTO storage.policies (name, definition, bucket_id, operation)
SELECT 
  'Users can upload to their own folder', 
  'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
  'documents', 
  'INSERT'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies 
  WHERE bucket_id = 'documents' AND operation = 'INSERT'
);

-- Check the documents bucket exists and is properly configured
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    -- Check if the bucket already exists
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'documents'
    ) INTO bucket_exists;

    -- If the bucket doesn't exist, create it
    IF NOT bucket_exists THEN
        -- Create the documents bucket with proper settings
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('documents', 'documents', false, 10485760, '{"image/png", "image/jpeg", "image/jpg", "application/pdf"}');
        
        -- Create proper RLS policies for the bucket
        INSERT INTO storage.policies (name, definition, bucket_id, operation)
        VALUES (
            'Users can upload their own files',
            'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
            'documents',
            'INSERT'
        );
        
        INSERT INTO storage.policies (name, definition, bucket_id, operation)
        VALUES (
            'Users can read their own files',
            'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
            'documents',
            'SELECT'
        );
        
        INSERT INTO storage.policies (name, definition, bucket_id, operation)
        VALUES (
            'Users can delete their own files',
            'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
            'documents',
            'DELETE'
        );
        
        INSERT INTO storage.policies (name, definition, bucket_id, operation)
        VALUES (
            'Users can update their own files',
            'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
            'documents',
            'UPDATE'
        );
    END IF;
END $$;
