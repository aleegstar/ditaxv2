-- Clean up orphaned data before adding CASCADE constraints

-- First, identify and clean up orphaned records that reference non-existent profiles
-- This ensures all foreign key constraints can be added successfully

-- Clean up form_data with missing user profiles
DELETE FROM public.form_data 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up tax_returns with missing user profiles  
DELETE FROM public.tax_returns 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up uploaded_documents with missing user profiles
DELETE FROM public.uploaded_documents 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up form_progress with missing user profiles
DELETE FROM public.form_progress 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up form_chat_history with missing user profiles
DELETE FROM public.form_chat_history 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up user_encryption_keys with missing user profiles
DELETE FROM public.user_encryption_keys 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up user_notifications with missing user profiles
DELETE FROM public.user_notifications 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up user_passkeys with missing user profiles
DELETE FROM public.user_passkeys 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up user_consents with missing user profiles
DELETE FROM public.user_consents 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up user_sessions with missing user profiles
DELETE FROM public.user_sessions 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up user_roles with missing user profiles
DELETE FROM public.user_roles 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up completed_tax_returns with missing user profiles
DELETE FROM public.completed_tax_returns 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up support_tickets with missing user profiles
DELETE FROM public.support_tickets 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up asset_data with missing user profiles
DELETE FROM public.asset_data 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up income_data with missing user profiles
DELETE FROM public.income_data 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up deduction_data with missing user profiles
DELETE FROM public.deduction_data 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Clean up chat_messages with missing sender profiles
DELETE FROM public.chat_messages 
WHERE sender_id IS NOT NULL AND sender_id NOT IN (SELECT id FROM public.profiles);

-- Clean up chat_messages with missing recipient profiles (but allow NULL recipients for admin messages)
DELETE FROM public.chat_messages 
WHERE recipient_id IS NOT NULL AND recipient_id NOT IN (SELECT id FROM public.profiles);

-- Clean up chat_attachments with missing uploader profiles
DELETE FROM public.chat_attachments 
WHERE uploaded_by NOT IN (SELECT id FROM public.profiles);

-- Clean up ticket_attachments with missing uploader profiles
DELETE FROM public.ticket_attachments 
WHERE uploaded_by NOT IN (SELECT id FROM public.profiles);

-- Clean up ticket_messages with missing sender profiles
DELETE FROM public.ticket_messages 
WHERE sender_id NOT IN (SELECT id FROM public.profiles);