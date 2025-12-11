-- Upload template to storage and set as active
-- First, let me insert the template record (the file upload will be handled separately)
INSERT INTO document_templates (
  name,
  file_path,
  file_type,
  template_type,
  uploaded_by,
  is_active
) VALUES (
  'Begleitschreiben_Versand_Steuererklärung_Einzelperson-2.docx',
  'cover_letter_template_default.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'cover_letter',
  'system',
  true
)
ON CONFLICT DO NOTHING;

-- Deactivate any existing templates first
UPDATE document_templates 
SET is_active = false 
WHERE template_type = 'cover_letter' AND name != 'Begleitschreiben_Versand_Steuererklärung_Einzelperson-2.docx';