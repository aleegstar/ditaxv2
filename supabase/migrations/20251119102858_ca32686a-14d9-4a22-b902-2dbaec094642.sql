-- Add documents_tour_completed column to profiles table for tracking documents page onboarding tour
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS documents_tour_completed BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_documents_tour 
ON profiles(documents_tour_completed);

-- Add comment for documentation
COMMENT ON COLUMN profiles.documents_tour_completed IS 'Tracks whether user has completed the documents page onboarding tour';