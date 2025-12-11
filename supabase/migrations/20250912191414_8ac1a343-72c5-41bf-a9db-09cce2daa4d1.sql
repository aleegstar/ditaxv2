-- Insert the default template as active using a valid user ID
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
  'c80d8180-8c40-47ea-ae60-3326af360aeb'
) 
ON CONFLICT DO NOTHING;