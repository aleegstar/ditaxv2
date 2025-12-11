
-- Datenbereinigung: Setze chat_type auf 'general' für Nachrichten ohne recipient_id
UPDATE chat_messages 
SET chat_type = 'general' 
WHERE recipient_id IS NULL AND chat_type = 'direct';

-- Stelle sicher, dass alle direkten Nachrichten eine recipient_id haben
-- (Nachrichten ohne recipient_id und chat_type 'direct' werden zu 'general')
UPDATE chat_messages 
SET chat_type = 'general' 
WHERE chat_type = 'direct' AND recipient_id IS NULL;
