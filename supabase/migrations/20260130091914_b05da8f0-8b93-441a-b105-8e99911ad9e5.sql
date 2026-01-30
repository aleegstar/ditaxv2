-- Add avatar_url column to tax_filers table
ALTER TABLE tax_filers 
ADD COLUMN avatar_url TEXT DEFAULT NULL;