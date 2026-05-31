ALTER TABLE public.uploaded_documents
  ADD COLUMN IF NOT EXISTS pending_assignment boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS uploaded_documents_pending_idx
  ON public.uploaded_documents (user_id)
  WHERE pending_assignment;