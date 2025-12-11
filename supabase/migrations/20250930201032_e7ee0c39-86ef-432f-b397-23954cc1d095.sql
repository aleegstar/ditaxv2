-- Delete user and all associated data for alee.gstar@gmail.com
-- User ID from logs: 3bc9ac39-126e-42c6-95b0-9546aeaad903

DO $$
DECLARE
  target_user_id uuid := '3bc9ac39-126e-42c6-95b0-9546aeaad903';
BEGIN
  -- Delete from user_sessions first (this is causing the FK constraint error)
  DELETE FROM public.user_sessions WHERE user_id = target_user_id;
  
  -- Delete from other tables that might reference this user
  DELETE FROM public.form_chat_history WHERE user_id = target_user_id;
  DELETE FROM public.form_progress WHERE user_id = target_user_id;
  DELETE FROM public.form_data WHERE user_id = target_user_id;
  DELETE FROM public.uploaded_documents WHERE user_id = target_user_id;
  DELETE FROM public.chat_messages WHERE sender_id = target_user_id OR recipient_id = target_user_id;
  DELETE FROM public.chat_attachments WHERE uploaded_by = target_user_id;
  DELETE FROM public.completed_tax_returns WHERE user_id = target_user_id;
  DELETE FROM public.definitive_tax_bills WHERE user_id = target_user_id;
  DELETE FROM public.tax_returns WHERE user_id = target_user_id;
  DELETE FROM public.support_tickets WHERE user_id = target_user_id;
  DELETE FROM public.user_notifications WHERE user_id = target_user_id;
  DELETE FROM public.user_consents WHERE user_id = target_user_id;
  DELETE FROM public.user_encryption_keys WHERE user_id = target_user_id;
  DELETE FROM public.user_passkeys WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.security_audit_logs WHERE user_id = target_user_id;
  DELETE FROM public.rate_limits WHERE user_id = target_user_id;
  
  -- Delete profile (this should cascade to auth.users if properly set up)
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete from auth.users (requires service role)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RAISE NOTICE 'Successfully deleted user % and all associated data', target_user_id;
END $$;