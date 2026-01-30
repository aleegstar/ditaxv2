-- Add tax_filer_id column to missing_item_requests for per-person filtering
ALTER TABLE missing_item_requests 
ADD COLUMN tax_filer_id UUID REFERENCES tax_filers(id);