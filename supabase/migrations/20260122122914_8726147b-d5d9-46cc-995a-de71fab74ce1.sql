-- Add column to track when feedback prompt was shown
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS feedback_prompt_shown_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;