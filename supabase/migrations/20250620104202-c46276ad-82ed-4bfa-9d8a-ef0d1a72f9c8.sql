
-- Lösche alle allgemeinen Chat-Nachrichten (nur private Chats sollen bleiben)
DELETE FROM chat_messages 
WHERE chat_type = 'general' OR recipient_id IS NULL;

-- Stelle sicher, dass alle verbleibenden Nachrichten den Typ 'direct' haben
UPDATE chat_messages 
SET chat_type = 'direct' 
WHERE chat_type != 'direct';
