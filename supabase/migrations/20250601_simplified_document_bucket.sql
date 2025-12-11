

-- Drop existing problematic policies first
DO $$
BEGIN
    -- Delete existing policies for the documents bucket to start fresh
    DELETE FROM storage.policies 
    WHERE bucket_id = 'documents';
    
    -- Check if the bucket exists and create it if not
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
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

-- Sehr einfache und permissive Richtlinien für den documents bucket erstellen
-- Diese Richtlinien sind bewusst einfach gehalten, um Probleme zu vermeiden

-- Policy for uploading files (INSERT) - Sehr permissiv
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES (
    'Benutzer können Dateien hochladen',
    'auth.role() = ''authenticated''',
    'documents',
    'INSERT'
);

-- Policy for reading files (SELECT) - Sehr permissiv
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES (
    'Benutzer können Dateien lesen',
    'auth.role() = ''authenticated''',
    'documents',
    'SELECT'
);

-- Policy for deleting files (DELETE) - Sehr permissiv
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES (
    'Benutzer können Dateien löschen',
    'auth.role() = ''authenticated''',
    'documents',
    'DELETE'
);

-- Policy for updating metadata (UPDATE) - Sehr permissiv
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES (
    'Benutzer können Dateien aktualisieren',
    'auth.role() = ''authenticated''',
    'documents',
    'UPDATE'
);

-- Ensure the uploaded_documents table has a clear policy
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.uploaded_documents;

CREATE POLICY "Users can insert their own documents"
  ON public.uploaded_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ensure users can read their own documents
CREATE POLICY IF NOT EXISTS "Users can read their own documents"
  ON public.uploaded_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Ensure users can delete their own documents
CREATE POLICY IF NOT EXISTS "Users can delete their own documents"
  ON public.uploaded_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a helper function for the edge function to execute storage migrations
CREATE OR REPLACE FUNCTION public.execute_storage_migration()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Delete any existing policies
    DELETE FROM storage.policies 
    WHERE bucket_id = 'documents';
    
    -- Create very permissive policies
    -- Policy for uploading files (INSERT)
    INSERT INTO storage.policies (name, definition, bucket_id, operation)
    VALUES (
        'Benutzer können Dateien hochladen',
        'auth.role() = ''authenticated''',
        'documents',
        'INSERT'
    );

    -- Policy for reading files (SELECT)
    INSERT INTO storage.policies (name, definition, bucket_id, operation)
    VALUES (
        'Benutzer können Dateien lesen',
        'auth.role() = ''authenticated''',
        'documents',
        'SELECT'
    );

    -- Policy for deleting files (DELETE)
    INSERT INTO storage.policies (name, definition, bucket_id, operation)
    VALUES (
        'Benutzer können Dateien löschen',
        'auth.role() = ''authenticated''',
        'documents',
        'DELETE'
    );

    -- Policy for updating metadata (UPDATE)
    INSERT INTO storage.policies (name, definition, bucket_id, operation)
    VALUES (
        'Benutzer können Dateien aktualisieren',
        'auth.role() = ''authenticated''',
        'documents',
        'UPDATE'
    );
    
    SELECT jsonb_build_object(
        'success', true,
        'message', 'Storage migration executed successfully',
        'policies_count', 4
    ) INTO result;
    
    RETURN result;
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Error executing storage migration: ' || SQLERRM
    );
END;
$$;

