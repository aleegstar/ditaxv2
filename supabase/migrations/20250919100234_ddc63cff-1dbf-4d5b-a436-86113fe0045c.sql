-- Add CASCADE DELETE constraints after data cleanup

-- Add foreign key constraints with CASCADE DELETE to profiles table
-- This will ensure when a profile is deleted, all related data is automatically removed

-- Add foreign key constraint to tax_returns
ALTER TABLE public.tax_returns 
DROP CONSTRAINT IF EXISTS tax_returns_user_id_fkey;
ALTER TABLE public.tax_returns 
ADD CONSTRAINT tax_returns_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to form_data
ALTER TABLE public.form_data 
DROP CONSTRAINT IF EXISTS form_data_user_id_fkey;
ALTER TABLE public.form_data 
ADD CONSTRAINT form_data_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to uploaded_documents
ALTER TABLE public.uploaded_documents 
DROP CONSTRAINT IF EXISTS uploaded_documents_user_id_fkey;
ALTER TABLE public.uploaded_documents 
ADD CONSTRAINT uploaded_documents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to form_progress
ALTER TABLE public.form_progress 
DROP CONSTRAINT IF EXISTS form_progress_user_id_fkey;
ALTER TABLE public.form_progress 
ADD CONSTRAINT form_progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to form_chat_history
ALTER TABLE public.form_chat_history 
DROP CONSTRAINT IF EXISTS form_chat_history_user_id_fkey;
ALTER TABLE public.form_chat_history 
ADD CONSTRAINT form_chat_history_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to user_encryption_keys
ALTER TABLE public.user_encryption_keys 
DROP CONSTRAINT IF EXISTS user_encryption_keys_user_id_fkey;
ALTER TABLE public.user_encryption_keys 
ADD CONSTRAINT user_encryption_keys_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to user_notifications
ALTER TABLE public.user_notifications 
DROP CONSTRAINT IF EXISTS user_notifications_user_id_fkey;
ALTER TABLE public.user_notifications 
ADD CONSTRAINT user_notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to user_passkeys
ALTER TABLE public.user_passkeys 
DROP CONSTRAINT IF EXISTS user_passkeys_user_id_fkey;
ALTER TABLE public.user_passkeys 
ADD CONSTRAINT user_passkeys_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to user_consents
ALTER TABLE public.user_consents 
DROP CONSTRAINT IF EXISTS user_consents_user_id_fkey;
ALTER TABLE public.user_consents 
ADD CONSTRAINT user_consents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to user_sessions
ALTER TABLE public.user_sessions 
DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE public.user_sessions 
ADD CONSTRAINT user_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to user_roles
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to completed_tax_returns
ALTER TABLE public.completed_tax_returns 
DROP CONSTRAINT IF EXISTS completed_tax_returns_user_id_fkey;
ALTER TABLE public.completed_tax_returns 
ADD CONSTRAINT completed_tax_returns_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to support_tickets
ALTER TABLE public.support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE public.support_tickets 
ADD CONSTRAINT support_tickets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to asset_data
ALTER TABLE public.asset_data 
DROP CONSTRAINT IF EXISTS asset_data_user_id_fkey;
ALTER TABLE public.asset_data 
ADD CONSTRAINT asset_data_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to income_data
ALTER TABLE public.income_data 
DROP CONSTRAINT IF EXISTS income_data_user_id_fkey;
ALTER TABLE public.income_data 
ADD CONSTRAINT income_data_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint to deduction_data
ALTER TABLE public.deduction_data 
DROP CONSTRAINT IF EXISTS deduction_data_user_id_fkey;
ALTER TABLE public.deduction_data 
ADD CONSTRAINT deduction_data_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Handle chat_messages with multiple user references
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_recipient_id_fkey;
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Handle chat_attachments
ALTER TABLE public.chat_attachments 
DROP CONSTRAINT IF EXISTS chat_attachments_uploaded_by_fkey;
ALTER TABLE public.chat_attachments 
ADD CONSTRAINT chat_attachments_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Handle ticket_attachments
ALTER TABLE public.ticket_attachments 
DROP CONSTRAINT IF EXISTS ticket_attachments_uploaded_by_fkey;
ALTER TABLE public.ticket_attachments 
ADD CONSTRAINT ticket_attachments_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Handle ticket_messages
ALTER TABLE public.ticket_messages 
DROP CONSTRAINT IF EXISTS ticket_messages_sender_id_fkey;
ALTER TABLE public.ticket_messages 
ADD CONSTRAINT ticket_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;