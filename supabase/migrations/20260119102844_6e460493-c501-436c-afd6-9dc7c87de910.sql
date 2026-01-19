-- Create storage bucket for missing items uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'missing-items',
  'missing-items',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for missing-items bucket
CREATE POLICY "Users can upload missing item files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'missing-items' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own missing item files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'missing-items' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Admins can delete missing item files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'missing-items' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);