-- Delete user alexlodgarage@gmail.com and all associated data
-- First delete from profiles if exists
DELETE FROM public.profiles WHERE id = '986c2f7a-38b0-4f9e-a16d-05a56ac518bb';

-- Delete from any other tables that might reference this user
DELETE FROM public.user_roles WHERE user_id = '986c2f7a-38b0-4f9e-a16d-05a56ac518bb';
DELETE FROM public.user_sessions WHERE user_id = '986c2f7a-38b0-4f9e-a16d-05a56ac518bb';
DELETE FROM public.form_data WHERE user_id = '986c2f7a-38b0-4f9e-a16d-05a56ac518bb';
DELETE FROM public.uploaded_documents WHERE user_id = '986c2f7a-38b0-4f9e-a16d-05a56ac518bb';
DELETE FROM public.chat_messages WHERE sender_id = '986c2f7a-38b0-4f9e-a16d-05a56ac518bb' OR recipient_id = '986c2f7a-38b0-4f9e-a16d-05a56ac518bb';

-- Clean up temporary file
-- Note: The auth user will need to be deleted from Supabase Dashboard manually