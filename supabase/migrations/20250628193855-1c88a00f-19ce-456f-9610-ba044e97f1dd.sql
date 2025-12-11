
-- Add privacy_preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN privacy_preferences jsonb DEFAULT '{
  "marketing_emails": false,
  "analytics_tracking": false,
  "data_sharing": false
}'::jsonb;
