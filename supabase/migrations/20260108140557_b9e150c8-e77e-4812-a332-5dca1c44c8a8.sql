-- Add DELETE policy for chat_messages
CREATE POLICY "Users can delete own chat messages"
ON public.chat_messages
FOR DELETE
TO public
USING (
  sender_id = (SELECT auth.uid())
  OR recipient_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- Add DELETE policy for chat_attachments
CREATE POLICY "Users can delete own chat attachments"
ON public.chat_attachments
FOR DELETE
TO public
USING (
  uploaded_by = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);