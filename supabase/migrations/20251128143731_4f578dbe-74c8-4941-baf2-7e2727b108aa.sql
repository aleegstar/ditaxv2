-- Fix documents progress for user alee.gstar@gmail.com (tax year 2025)
-- This user was affected by the timing bug where documents were incorrectly marked as complete

UPDATE form_progress 
SET form_sections = jsonb_set(
  COALESCE(form_sections, '{}'::jsonb),
  '{documents}', 
  'false'::jsonb
)
WHERE user_id = (SELECT id FROM profiles WHERE email = 'alee.gstar@gmail.com')
  AND tax_year = '2025'
  AND (form_sections->>'documents')::boolean = true;