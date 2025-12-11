-- Fix remaining functions that may still have search path issues

-- Fix monitor_security_patterns function 
CREATE OR REPLACE FUNCTION public.monitor_security_patterns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  suspicious_count integer;
BEGIN
  -- Check for multiple failed admin access attempts
  SELECT COUNT(*) INTO suspicious_count
  FROM public.security_audit_logs
  WHERE action LIKE '%ADMIN_ACCESS_DENIED%'
    AND success = false
    AND created_at > NOW() - INTERVAL '1 hour';
    
  -- Log if suspicious pattern detected
  IF suspicious_count >= 5 THEN
    INSERT INTO public.security_audit_logs (
      action,
      success,
      resource,
      error_message
    ) VALUES (
      'SUSPICIOUS_ADMIN_ACCESS_PATTERN',
      false,
      'security_monitoring',
      format('Multiple failed admin access attempts detected: %s attempts in last hour', suspicious_count)
    );
  END IF;
END;
$$;

-- Fix strengthen_user_session_security function
CREATE OR REPLACE FUNCTION public.strengthen_user_session_security()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean up old sessions (older than 7 days)
  DELETE FROM public.user_sessions 
  WHERE login_time < NOW() - INTERVAL '7 days';
  
  -- Log session cleanup
  INSERT INTO public.security_audit_logs (
    action,
    success,
    resource,
    error_message
  ) VALUES (
    'SESSION_CLEANUP_COMPLETED',
    true,
    'user_sessions',
    'Old user sessions cleaned up for security'
  );
END;
$$;

-- Fix increment_login_count function
CREATE OR REPLACE FUNCTION public.increment_login_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Get current max login count for user
  SELECT COALESCE(MAX(login_count), 0) + 1 INTO current_count
  FROM public.user_sessions 
  WHERE user_id = p_user_id;
  
  -- Update the latest session with incremented count
  UPDATE public.user_sessions 
  SET login_count = current_count
  WHERE user_id = p_user_id 
  AND login_time = (
    SELECT MAX(login_time) 
    FROM public.user_sessions 
    WHERE user_id = p_user_id
  );
  
  RETURN current_count;
END;
$$;