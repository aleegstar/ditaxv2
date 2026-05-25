ALTER TABLE public.completed_tax_returns 
ADD COLUMN IF NOT EXISTS documents_deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_completed_tax_returns_signed_cleanup 
ON public.completed_tax_returns (signed_at) 
WHERE signed_at IS NOT NULL AND documents_deleted_at IS NULL;