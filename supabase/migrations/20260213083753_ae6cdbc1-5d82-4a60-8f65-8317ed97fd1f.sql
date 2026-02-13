ALTER TABLE public.user_feedback 
  ADD COLUMN IF NOT EXISTS feedback_category text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_consent boolean DEFAULT false;