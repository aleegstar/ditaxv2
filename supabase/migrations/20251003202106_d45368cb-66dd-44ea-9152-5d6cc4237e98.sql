-- First, delete duplicate tax_returns keeping only the most recent one for each user/year combination
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY user_id, tax_year ORDER BY updated_at DESC, created_at DESC) as rn
  FROM tax_returns
)
DELETE FROM tax_returns 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint to prevent future duplicates
ALTER TABLE tax_returns ADD CONSTRAINT unique_user_tax_year UNIQUE (user_id, tax_year);