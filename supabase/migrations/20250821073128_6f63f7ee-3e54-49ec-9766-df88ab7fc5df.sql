
-- Add email_notifications table for tracking sent emails
CREATE TABLE IF NOT EXISTS email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  notification_type text NOT NULL DEFAULT 'unread_messages',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_notifications
CREATE POLICY "System can insert email notifications" ON email_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all email notifications" ON email_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_unread ON chat_messages(recipient_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_sent_at ON email_notifications(user_id, sent_at);

-- Add trigger to automatically set read=false for new admin messages
CREATE OR REPLACE FUNCTION set_admin_message_unread()
RETURNS TRIGGER AS $$
BEGIN
  -- If message is from admin (sender_id with admin role) to a regular user
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.sender_id AND role = 'admin'
  ) AND NEW.recipient_id IS NOT NULL THEN
    NEW.read = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_set_admin_message_unread
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_admin_message_unread();

-- Enable realtime for chat_messages
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE email_notifications;
