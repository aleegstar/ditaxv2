-- ============================================================
-- Fix User Profile Display: Avatar Storage + Name Update
-- Resolves missing profile picture and last name issues
-- ============================================================

-- 1. Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Add RLS policies for avatars bucket
-- Using DO block to handle existing policies gracefully
DO $$ 
BEGIN
  -- Allow users to read all avatars (public bucket)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Avatars are publicly accessible'
  ) THEN
    CREATE POLICY "Avatars are publicly accessible"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');
  END IF;

  -- Allow users to upload their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Allow users to update their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Allow users to delete their own avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- 3. Update last_name for the specific user (sandrograber@...)
-- This fixes the "Ditax User" display issue
UPDATE public.profiles
SET last_name = 'Graber'
WHERE email LIKE '%sandrograber%'
  AND (last_name IS NULL OR last_name = '');

-- ============================================================
-- RESULT: 
-- ✅ Avatar storage bucket created/verified
-- ✅ Storage policies configured for avatars
-- ✅ Users can now upload and view profile pictures
-- ✅ Last name "Graber" set for sandrograber user
-- ✅ Full name "Sandro Graber" will display correctly
-- ============================================================