UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'application/octet-stream']
WHERE id = 'chat_attachments';