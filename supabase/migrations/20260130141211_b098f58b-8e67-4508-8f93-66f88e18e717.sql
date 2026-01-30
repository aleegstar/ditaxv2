-- Add admin_notes column to tax_filers table for per-person notes
ALTER TABLE tax_filers 
ADD COLUMN admin_notes TEXT DEFAULT '';