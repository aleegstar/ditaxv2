
-- Add bot_handover_requested column to chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN bot_handover_requested boolean DEFAULT false;

-- Create index for better performance on bot handover queries
CREATE INDEX idx_chat_messages_bot_handover ON public.chat_messages(bot_handover_requested) WHERE bot_handover_requested = true;
