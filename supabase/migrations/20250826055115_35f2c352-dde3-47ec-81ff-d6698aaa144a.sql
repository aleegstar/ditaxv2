
-- Add a new RLS policy to allow users to mark messages as read when they are the recipient
CREATE POLICY "Users can mark messages as read" ON chat_messages
FOR UPDATE USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);
