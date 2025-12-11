
-- Fix storage policies for completed-tax-returns bucket
-- First, ensure the bucket exists with correct settings
DO $$
BEGIN
    -- Check if the bucket exists and update/create it
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'completed-tax-returns') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('completed-tax-returns', 'completed-tax-returns', false, 50485760, '{"application/pdf"}');
    ELSE
        UPDATE storage.buckets 
        SET public = false, 
            file_size_limit = 50485760, 
            allowed_mime_types = '{"application/pdf"}'
        WHERE id = 'completed-tax-returns';
    END IF;
END $$;

-- Remove existing policies to start fresh
DELETE FROM storage.policies WHERE bucket_id = 'completed-tax-returns';

-- Create comprehensive RLS policies for storage.objects table
-- Users can view their own completed tax returns
CREATE POLICY "Users can view their own completed tax returns"
ON storage.objects FOR SELECT
USING (bucket_id = 'completed-tax-returns' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can upload completed tax returns for any user
CREATE POLICY "Admins can upload completed tax returns"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'completed-tax-returns' AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Admins can view all completed tax returns
CREATE POLICY "Admins can view all completed tax returns"
ON storage.objects FOR SELECT
USING (bucket_id = 'completed-tax-returns' AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Admins can update completed tax returns
CREATE POLICY "Admins can update completed tax returns"
ON storage.objects FOR UPDATE
USING (bucket_id = 'completed-tax-returns' AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Admins can delete completed tax returns
CREATE POLICY "Admins can delete completed tax returns"
ON storage.objects FOR DELETE
USING (bucket_id = 'completed-tax-returns' AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
));
