
-- Erstelle den documents Storage Bucket falls er nicht existiert
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 10485760, '{"image/png", "image/jpeg", "image/jpg", "application/pdf"}')
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Stelle sicher, dass RLS für uploaded_documents aktiviert ist
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;

-- Lösche existierende Policies falls vorhanden
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.uploaded_documents;
DROP POLICY IF EXISTS "Users can read their own documents" ON public.uploaded_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.uploaded_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.uploaded_documents;

-- Erstelle RLS-Policies für uploaded_documents
CREATE POLICY "Users can insert their own documents"
  ON public.uploaded_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own documents"
  ON public.uploaded_documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.uploaded_documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.uploaded_documents
  FOR DELETE
  USING (auth.uid() = user_id);
