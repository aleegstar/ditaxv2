-- Remove old constraint that only checks user_id + tax_year
ALTER TABLE tax_returns DROP CONSTRAINT IF EXISTS unique_user_tax_year;

-- Create new constraint that includes tax_filer_id for multi-person support
ALTER TABLE tax_returns 
ADD CONSTRAINT unique_user_taxfiler_tax_year 
UNIQUE (user_id, tax_filer_id, tax_year);