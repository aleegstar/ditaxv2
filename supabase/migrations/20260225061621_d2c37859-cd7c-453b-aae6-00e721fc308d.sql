
-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Combined SELECT access for chat_attachments" ON public.chat_attachments;

-- Recreate with direct admin access
CREATE POLICY "Combined SELECT access for chat_attachments"
ON public.chat_attachments
FOR SELECT
USING (
  (uploaded_by = (SELECT auth.uid()))
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
  OR (EXISTS (
    SELECT 1 FROM chat_messages cm
    WHERE (cm.id = chat_attachments.message_id)
    AND (
      cm.sender_id = (SELECT auth.uid())
      OR cm.recipient_id = (SELECT auth.uid())
    )
  ))
);
