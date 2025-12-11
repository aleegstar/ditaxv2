
-- Remove existing permissive INSERT policies for chat_messages
DROP POLICY IF EXISTS "Admins can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to admins or recipients" ON chat_messages;

-- Create strict INSERT policy: sender_id must be auth.uid() and recipient_id must be valid
CREATE POLICY "Strict message insertion policy"
ON chat_messages FOR INSERT
WITH CHECK (
    -- Sender must be the authenticated user
    sender_id = auth.uid() 
    AND (
        -- Allow messages to null (general chat) if user has admin role
        (recipient_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
        OR
        -- Allow direct messages to users with admin/support roles
        (recipient_id IS NOT NULL AND (
            has_role(recipient_id, 'admin'::app_role) OR
            has_role(recipient_id, 'support'::app_role)
        ))
        OR
        -- Allow messages to existing conversation participants
        (recipient_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM chat_messages 
            WHERE (sender_id = auth.uid() AND recipient_id = chat_messages.recipient_id)
               OR (sender_id = chat_messages.recipient_id AND recipient_id = auth.uid())
        ))
    )
);

-- Create strict UPDATE policy: only allow updating read status and only for recipients
CREATE POLICY "Strict message update policy" 
ON chat_messages FOR UPDATE
USING (
    -- Only recipients can update messages (typically to mark as read)
    auth.uid() = recipient_id 
    OR 
    -- Admins can update any message
    has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
    -- Ensure sender_id and recipient_id cannot be changed
    sender_id = OLD.sender_id 
    AND recipient_id = OLD.recipient_id
    AND content = OLD.content
    AND attachment_id = OLD.attachment_id
    AND created_at = OLD.created_at
);

-- Add support role to app_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'support') THEN
        ALTER TYPE app_role ADD VALUE 'support';
    END IF;
END$$;
