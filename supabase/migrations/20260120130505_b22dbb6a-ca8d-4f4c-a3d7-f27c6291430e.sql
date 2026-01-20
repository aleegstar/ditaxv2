-- =============================================
-- SUPABASE COST OPTIMIZATION MIGRATION
-- =============================================

-- 1. Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at 
ON public.security_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_action 
ON public.security_audit_logs(user_id, action);

CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_created 
ON public.chat_messages(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_data_user_year 
ON public.form_data(user_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_tax_returns_user_status 
ON public.tax_returns(user_id, status);

CREATE INDEX IF NOT EXISTS idx_uploaded_documents_user_year 
ON public.uploaded_documents(user_id, tax_year);

-- 2. Create optimized cleanup function (30 days instead of 90)
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_logs integer := 0;
  deleted_sessions integer := 0;
  deleted_rate_limits integer := 0;
  deleted_email_notifications integer := 0;
BEGIN
  -- Clean up security logs older than 30 days (keep critical ones for 90 days)
  DELETE FROM security_audit_logs 
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND action NOT IN ('ADMIN_ACTION_APPROVED', 'ADMIN_ACTION_REJECTED', 'USER_DELETION_COMPLETED', 'ADMIN_BOOTSTRAP');
  GET DIAGNOSTICS deleted_logs = ROW_COUNT;
  
  -- Clean up user sessions older than 14 days
  DELETE FROM user_sessions 
  WHERE login_time < NOW() - INTERVAL '14 days';
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  -- Clean up rate limit records older than 1 day
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS deleted_rate_limits = ROW_COUNT;
  
  -- Clean up email notification tracking older than 7 days
  DELETE FROM email_notifications 
  WHERE sent_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_email_notifications = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'deleted_logs', deleted_logs,
    'deleted_sessions', deleted_sessions,
    'deleted_rate_limits', deleted_rate_limits,
    'deleted_email_notifications', deleted_email_notifications,
    'executed_at', NOW()
  );
END;
$$;

-- 3. Run initial cleanup
SELECT public.cleanup_old_data();

-- 4. Vacuum analyze the most frequently used tables
-- Note: VACUUM cannot run inside a transaction, but ANALYZE can
ANALYZE public.security_audit_logs;
ANALYZE public.chat_messages;
ANALYZE public.user_sessions;
ANALYZE public.form_data;
ANALYZE public.tax_returns;