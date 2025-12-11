-- Add UPDATE policy for admins to mark pool messages as read
CREATE POLICY "Admins can update pool messages"
ON public.chat_messages
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  (recipient_id IS NULL OR recipient_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND 
  (recipient_id IS NULL OR recipient_id = auth.uid())
);