-- Deactivate any existing cover letter templates
UPDATE document_templates 
SET is_active = false 
WHERE template_type = 'cover_letter';

-- Insert the default template as active
INSERT INTO document_templates (
  name,
  file_path,
  file_type,
  template_type,
  is_active,
  uploaded_by
) VALUES (
  'Standard Begleitschreiben Vorlage',
  'templates/begleitschreiben-template.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'cover_letter',
  true,
  '00000000-0000-0000-0000-000000000000'
) 
ON CONFLICT DO NOTHING;