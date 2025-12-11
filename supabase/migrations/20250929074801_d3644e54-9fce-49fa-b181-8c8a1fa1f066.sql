-- Create missing profile for user ditaxswiss@gmail.com
-- This will fix the onboarding tour issue by ensuring the profile exists
INSERT INTO public.profiles (
  id,
  email,
  first_name,
  last_name,
  onboarding_tour_completed,
  updated_at
) VALUES (
  'c80d8180-8c40-47ea-ae60-3326af360aeb',
  'ditaxswiss@gmail.com',
  '',
  '',
  false,
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  onboarding_tour_completed = false,
  updated_at = now();