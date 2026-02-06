-- Fix orphaned documents: assign null tax_filer_id to primary tax filer
UPDATE uploaded_documents ud
SET tax_filer_id = (
  SELECT tf.id FROM tax_filers tf 
  WHERE tf.user_id = ud.user_id AND tf.is_primary = true 
  LIMIT 1
)
WHERE ud.tax_filer_id IS NULL 
AND ud.status = 'active';