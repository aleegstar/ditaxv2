-- Set tax_year for existing uploaded documents that are missing the value
BEGIN;
UPDATE public.uploaded_documents
SET tax_year = '2024'
WHERE tax_year IS NULL;
COMMIT;