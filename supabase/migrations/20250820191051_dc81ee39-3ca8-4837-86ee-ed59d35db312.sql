
-- Add missing columns to chat_messages table for escalation functionality
ALTER TABLE public.chat_messages 
ADD COLUMN escalation_requested boolean DEFAULT false,
ADD COLUMN handled_by_admin uuid REFERENCES auth.users(id);

-- Add index for better performance on escalation queries
CREATE INDEX idx_chat_messages_escalation ON public.chat_messages(escalation_requested, handled_by_admin);
