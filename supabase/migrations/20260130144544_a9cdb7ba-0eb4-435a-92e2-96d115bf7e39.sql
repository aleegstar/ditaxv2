-- Add tax_filer_id column to definitive_tax_bills table
ALTER TABLE definitive_tax_bills 
ADD COLUMN tax_filer_id UUID REFERENCES tax_filers(id);