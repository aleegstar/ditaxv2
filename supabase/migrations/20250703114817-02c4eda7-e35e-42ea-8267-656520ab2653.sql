
-- Create policy that allows users to view their own chat messages
CREATE POLICY "Users can view their chat messages" 
ON public.chat_messages 
FOR SELECT 
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR 
  (recipient_id IS NULL)
);
