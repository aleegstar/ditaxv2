ALTER TABLE public.prior_year_checklists
  ADD COLUMN IF NOT EXISTS contact_changes_confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS contact_changes_note text;