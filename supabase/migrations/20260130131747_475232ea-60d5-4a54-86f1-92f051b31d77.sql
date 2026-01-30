-- Drop the existing constraint that doesn't account for tax_filer_id
ALTER TABLE form_data DROP CONSTRAINT IF EXISTS form_data_unique;

-- Create new constraint that includes tax_filer_id
-- This allows different tax filers to have their own form data for the same year/form_type
ALTER TABLE form_data 
ADD CONSTRAINT form_data_unique 
UNIQUE (user_id, tax_year, form_type, tax_filer_id);