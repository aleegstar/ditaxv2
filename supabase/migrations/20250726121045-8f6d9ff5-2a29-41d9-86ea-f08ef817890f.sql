-- Add tax_year column to uploaded_documents table
ALTER TABLE public.uploaded_documents 
ADD COLUMN tax_year TEXT;

-- Add document_category column for better organization
ALTER TABLE public.uploaded_documents 
ADD COLUMN document_category TEXT;

-- Add is_assigned_to_checklist column to track assignment status
ALTER TABLE public.uploaded_documents 
ADD COLUMN is_assigned_to_checklist BOOLEAN DEFAULT false;

-- Create index for better performance on tax_year and user_id queries
CREATE INDEX idx_uploaded_documents_tax_year_user_id ON public.uploaded_documents(tax_year, user_id);

-- Create index for document_category
CREATE INDEX idx_uploaded_documents_category ON public.uploaded_documents(document_category);

-- Update existing documents to have a default tax_year if needed
-- (This handles existing data by setting a default year)
UPDATE public.uploaded_documents 
SET tax_year = '2024', is_assigned_to_checklist = true 
WHERE tax_year IS NULL;