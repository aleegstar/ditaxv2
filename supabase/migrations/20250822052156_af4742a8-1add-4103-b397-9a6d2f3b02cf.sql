
-- Add column to profiles table to allow users to disable OTP fallback
ALTER TABLE profiles ADD COLUMN disable_otp_fallback boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.disable_otp_fallback IS 'When true, user can only authenticate with passkeys, OTP is disabled';
