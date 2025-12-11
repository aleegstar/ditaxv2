
-- Create the documents bucket if it doesn't exist
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
        
        -- Create proper RLS policies using the storage API
        -- Policy for uploading files (INSERT)
        INSERT INTO storage.policies (name, definition, bucket_id, operation)
        VALUES (
            'Users can upload their own files',
            'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
            'documents',
            'INSERT'
        );
        
        -- Policy for reading files (SELECT)
        INSERT INTO storage.policies (name, definition, bucket_id, operation)
        VALUES (
            'Users can read their own files',
            'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
            'documents',
            'SELECT'
        );
        
        -- Policy for deleting files (DELETE)
        INSERT INTO storage.policies (name, definition, bucket_id, operation)
        VALUES (
            'Users can delete their own files',
            'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
            'documents',
            'DELETE'
        );
        
        -- Policy for updating metadata (UPDATE)
        INSERT INTO storage.policies (name, definition, bucket_id, operation)
        VALUES (
            'Users can update their own files',
            'auth.role() = ''authenticated'' AND (storage.foldername(name))[1] = auth.uid()::text',
            'documents',
            'UPDATE'
        );
    END IF;
END $$;
