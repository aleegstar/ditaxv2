-- Drop existing CHECK CONSTRAINT
ALTER TABLE tax_returns DROP CONSTRAINT IF EXISTS tax_returns_status_check;

-- Add new CHECK CONSTRAINT with all allowed status values
ALTER TABLE tax_returns ADD CONSTRAINT tax_returns_status_check 
CHECK (status = ANY (ARRAY[
  'pending',
  'processing', 
  'success',
  'error',
  'missing_documents',
  'missing_information',
  'completed',
  'in_processing',
  'paid'
]));