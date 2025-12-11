
-- Make sender_id nullable to allow bot messages with sender_id = null
ALTER TABLE chat_messages ALTER COLUMN sender_id DROP NOT NULL;
