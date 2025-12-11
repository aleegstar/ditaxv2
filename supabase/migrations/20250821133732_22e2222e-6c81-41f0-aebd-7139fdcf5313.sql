
-- Erweitere den chat_type Check-Constraint um die zusätzlichen Werte
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_chat_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_chat_type_check 
  CHECK (chat_type IN ('direct', 'general', 'human', 'bot', 'admin'));
