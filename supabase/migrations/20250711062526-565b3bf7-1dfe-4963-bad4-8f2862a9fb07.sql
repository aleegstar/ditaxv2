
-- Remove existing permissive SELECT policies for chat_messages
DROP POLICY IF EXISTS "Admins can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view their chat messages" ON chat_messages;

-- Create strict SELECT policy: only sender, recipient, or admin can view messages
CREATE POLICY "Strict message access policy"
ON chat_messages FOR SELECT
USING (
    -- User is the sender of the message
    auth.uid() = sender_id 
    OR 
    -- User is the recipient of the message
    auth.uid() = recipient_id
    OR
    -- User has admin role
    has_role(auth.uid(), 'admin'::app_role)
);
