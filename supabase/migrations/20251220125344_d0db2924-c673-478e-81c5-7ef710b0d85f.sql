-- Fix ticket-attachments bucket security: make private and add proper RLS policies

-- Make the bucket private (if it exists)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'ticket-attachments';

-- Create proper RLS policies for ticket-attachments bucket

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "ticket_attachments_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_delete_policy" ON storage.objects;

-- Policy: Users can view their own ticket attachments, admins can view all
CREATE POLICY "ticket_attachments_select_policy" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  (
    -- Admins can view all ticket attachments
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR
    -- Users can view attachments for their own tickets
    EXISTS (
      SELECT 1 FROM public.ticket_attachments ta
      JOIN public.support_tickets st ON st.id = ta.ticket_id
      WHERE ta.file_path = storage.objects.name
      AND st.user_id = auth.uid()
    )
  )
);

-- Policy: Authenticated users can upload to ticket-attachments
CREATE POLICY "ticket_attachments_insert_policy" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  auth.uid() IS NOT NULL
);

-- Policy: Only admins or file owners can update
CREATE POLICY "ticket_attachments_update_policy" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ticket-attachments' AND
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR
    EXISTS (
      SELECT 1 FROM public.ticket_attachments ta
      WHERE ta.file_path = storage.objects.name
      AND ta.uploaded_by = auth.uid()
    )
  )
);

-- Policy: Only admins or file owners can delete
CREATE POLICY "ticket_attachments_delete_policy" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ticket-attachments' AND
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR
    EXISTS (
      SELECT 1 FROM public.ticket_attachments ta
      WHERE ta.file_path = storage.objects.name
      AND ta.uploaded_by = auth.uid()
    )
  )
);