-- Enable RLS on ticket_attachments and add policies for insert/select
ALTER TABLE IF EXISTS public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own attachments
DROP POLICY IF EXISTS "Users can insert their own ticket attachments" ON public.ticket_attachments;
CREATE POLICY "Users can insert their own ticket attachments"
ON public.ticket_attachments
FOR INSERT
WITH CHECK (uploaded_by = auth.uid());

-- Allow users and admins to view attachments related to their tickets/messages
DROP POLICY IF EXISTS "Users/Admins can view ticket attachments" ON public.ticket_attachments;
CREATE POLICY "Users/Admins can view ticket attachments"
ON public.ticket_attachments
FOR SELECT
USING (
  -- Uploader can always view
  uploaded_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_attachments.ticket_id
      AND (st.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::public.app_role))
  )
  OR EXISTS (
    SELECT 1 FROM public.ticket_messages tm
    JOIN public.support_tickets st2 ON st2.id = tm.ticket_id
    WHERE tm.id = ticket_attachments.message_id
      AND (
        st2.user_id = auth.uid() 
        OR has_role(auth.uid(), 'admin'::public.app_role)
        OR tm.sender_id = auth.uid()
      )
  )
);
