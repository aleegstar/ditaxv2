
-- Drop existing policies that might be causing issues
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check if policies exist before dropping
    SELECT EXISTS (
        SELECT 1 FROM storage.policies 
        WHERE bucket_id = 'documents' AND operation = 'INSERT'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        -- Delete existing policies to start fresh
        DELETE FROM storage.policies 
        WHERE bucket_id = 'documents';
    END IF;
END $$;

-- Create the documents bucket if it doesn't exist with EXPLICIT public=false setting
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
    ELSE
        -- Update existing bucket to ensure correct settings
        UPDATE storage.buckets 
        SET public = false, 
            file_size_limit = 10485760, 
            allowed_mime_types = '{"image/png", "image/jpeg", "image/jpg", "application/pdf"}'
        WHERE id = 'documents';
    END IF;
END $$;

-- Create a more permissive policy for uploads that focuses ONLY on the user_id prefix
-- This simplified policy should be easier to debug and match with our upload path
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES (
    'Users can upload to their own folder',
    'auth.role() = ''authenticated'' AND storage.foldername(name)[1] = auth.uid()::text',
    'documents',
    'INSERT'
);

-- Add policy for reading files (focusing on the first path segment matching user ID)
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES (
    'Users can read their own files',
    'auth.role() = ''authenticated'' AND storage.foldername(name)[1] = auth.uid()::text',
    'documents',
    'SELECT'
);

-- Add policy for deleting files (focusing on the first path segment matching user ID)
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES (
    'Users can delete their own files',
    'auth.role() = ''authenticated'' AND storage.foldername(name)[1] = auth.uid()::text',
    'documents',
    'DELETE'
);

-- Add policy for updating files (focusing on the first path segment matching user ID)
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES (
    'Users can update their own files',
    'auth.role() = ''authenticated'' AND storage.foldername(name)[1] = auth.uid()::text',
    'documents',
    'UPDATE'
);

-- Create a helper function to retrieve storage policies
-- This allows us to debug them from clients with appropriate permissions
CREATE OR REPLACE FUNCTION public.get_storage_policies(bucket_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(p)
    INTO result
    FROM storage.policies p
    WHERE p.bucket_id = bucket_id;
    
    RETURN result;
END;
$$;

-- Ensure the uploaded_documents table has the right RLS policy
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.uploaded_documents;

CREATE POLICY "Users can insert their own documents"
  ON public.uploaded_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
