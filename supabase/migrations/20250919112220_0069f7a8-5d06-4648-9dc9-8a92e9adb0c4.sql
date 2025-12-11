-- Add MFA-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_setup_offered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS mfa_setup_dismissed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS mfa_setup_reminder_count integer DEFAULT 0;

-- Add login_count to user_sessions for tracking login frequency
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS login_count integer DEFAULT 1;

-- Create function to increment login count
CREATE OR REPLACE FUNCTION public.increment_login_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Get current max login count for user
  SELECT COALESCE(MAX(login_count), 0) + 1 INTO current_count
  FROM user_sessions 
  WHERE user_id = p_user_id;
  
  -- Update the latest session with incremented count
  UPDATE user_sessions 
  SET login_count = current_count
  WHERE user_id = p_user_id 
  AND login_time = (
    SELECT MAX(login_time) 
    FROM user_sessions 
    WHERE user_id = p_user_id
  );
  
  RETURN current_count;
END;
$$;

-- Create function to check if MFA prompt should be shown
CREATE OR REPLACE FUNCTION public.should_show_mfa_prompt(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_record RECORD;
  login_count integer;
BEGIN
  -- Get user profile data
  SELECT 
    mfa_enabled,
    mfa_setup_offered_at,
    mfa_setup_dismissed_at,
    mfa_setup_reminder_count
  INTO profile_record
  FROM profiles 
  WHERE id = p_user_id;
  
  -- If MFA is already enabled, don't show prompt
  IF profile_record.mfa_enabled THEN
    RETURN false;
  END IF;
  
  -- If user dismissed permanently, don't show
  IF profile_record.mfa_setup_dismissed_at IS NOT NULL AND 
     profile_record.mfa_setup_reminder_count >= 3 THEN
    RETURN false;
  END IF;
  
  -- Get current login count
  SELECT COALESCE(MAX(us.login_count), 0) INTO login_count
  FROM user_sessions us
  WHERE us.user_id = p_user_id;
  
  -- Show prompt after 2nd login if not offered before
  IF login_count >= 2 AND profile_record.mfa_setup_offered_at IS NULL THEN
    RETURN true;
  END IF;
  
  -- Show reminder after 1 week if user chose "later"
  IF profile_record.mfa_setup_offered_at IS NOT NULL AND 
     profile_record.mfa_setup_dismissed_at IS NOT NULL AND
     profile_record.mfa_setup_reminder_count < 3 AND
     profile_record.mfa_setup_dismissed_at < NOW() - INTERVAL '7 days' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;