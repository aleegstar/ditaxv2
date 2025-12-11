
-- Add bot_session_id column to chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN bot_session_id uuid;

-- Add index for better performance when querying by bot_session_id
CREATE INDEX idx_chat_messages_bot_session_id ON public.chat_messages(bot_session_id);
