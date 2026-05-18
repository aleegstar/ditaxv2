ALTER TABLE public.prior_year_checklists
ADD COLUMN IF NOT EXISTS ai_consent_at timestamptz;