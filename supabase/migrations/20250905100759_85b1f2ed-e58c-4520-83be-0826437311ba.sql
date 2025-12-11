-- Add express_service field to tax_returns table
ALTER TABLE public.tax_returns 
ADD COLUMN express_service BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the field
COMMENT ON COLUMN public.tax_returns.express_service IS 'Indicates if express service (10-day processing) was requested for this tax return';