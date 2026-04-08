-- Remove duplicate INSERT policies on documents bucket
-- Keep "Users can upload own documents" (TO authenticated, foldername[1] = auth.uid())
-- Drop the two redundant ones

DROP POLICY IF EXISTS "Users can insert documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;