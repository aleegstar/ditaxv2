
-- Erweitere die chat_messages Tabelle um neue Felder für Chatbot/Human-Unterscheidung
ALTER TABLE chat_messages 
ADD COLUMN chat_type VARCHAR(20) DEFAULT 'human' CHECK (chat_type IN ('bot', 'human', 'escalated')),
ADD COLUMN escalation_requested BOOLEAN DEFAULT false,
ADD COLUMN escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN handled_by_admin UUID REFERENCES auth.users(id),
ADD COLUMN bot_session_id UUID;

-- Index für bessere Performance bei Filterung
CREATE INDEX idx_chat_messages_chat_type ON chat_messages(chat_type);
CREATE INDEX idx_chat_messages_escalation ON chat_messages(escalation_requested, escalated_at);
CREATE INDEX idx_chat_messages_bot_session ON chat_messages(bot_session_id);

-- RLS Policy für Bot-Nachrichten
CREATE POLICY "Bot can insert messages" ON chat_messages
FOR INSERT WITH CHECK (chat_type = 'bot' AND sender_id IS NULL);

-- RLS Policy für Admins um Bot-Nachrichten zu sehen
CREATE POLICY "Admins can view bot messages" ON chat_messages
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR chat_type != 'bot');
