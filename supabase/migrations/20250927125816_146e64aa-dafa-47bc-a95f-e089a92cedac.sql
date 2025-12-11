-- Additional security fix for rate_limits table
-- Add user-specific policy to prevent users from viewing other users' rate limiting data

-- Add a policy for users to view only their own rate limit records (if needed for debugging)
CREATE POLICY "Users can view their own rate limits only"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Create enhanced security monitoring function for suspicious patterns
CREATE OR REPLACE FUNCTION public.detect_security_anomalies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  suspicious_ips inet[];
  brute_force_count integer;
  privilege_escalation_count integer;
BEGIN
  -- Check for brute force patterns from specific IPs
  SELECT ARRAY_AGG(DISTINCT ip_address) INTO suspicious_ips
  FROM security_audit_logs
  WHERE action LIKE '%LOGIN_FAILED%'
    AND success = false
    AND created_at > NOW() - INTERVAL '30 minutes'
  GROUP BY ip_address
  HAVING COUNT(*) >= 10;
  
  -- Log suspicious IP activity
  IF array_length(suspicious_ips, 1) > 0 THEN
    INSERT INTO security_audit_logs (
      action,
      success,
      resource,
      error_message,
      ip_address
    ) VALUES (
      'SUSPICIOUS_IP_PATTERN_DETECTED',
      false,
      'security_monitoring',
      format('Multiple IPs with excessive failed login attempts: %s', suspicious_ips::text),
      suspicious_ips[1]
    );
  END IF;
  
  -- Check for rapid privilege escalation attempts
  SELECT COUNT(*) INTO privilege_escalation_count
  FROM security_audit_logs
  WHERE action LIKE '%PRIVILEGE_ESCALATION%' OR action LIKE '%ADMIN_ACCESS_DENIED%'
    AND success = false
    AND created_at > NOW() - INTERVAL '15 minutes';
    
  IF privilege_escalation_count >= 5 THEN
    INSERT INTO security_audit_logs (
      action,
      success,
      resource,
      error_message
    ) VALUES (
      'RAPID_PRIVILEGE_ESCALATION_DETECTED',
      false,
      'security_monitoring',
      format('Rapid privilege escalation attempts detected: %s attempts in 15 minutes', privilege_escalation_count)
    );
  END IF;
  
  -- Check for unusual file upload patterns
  SELECT COUNT(*) INTO brute_force_count
  FROM security_audit_logs
  WHERE action = 'FILE_VALIDATION' 
    AND success = false
    AND created_at > NOW() - INTERVAL '5 minutes'
    AND user_id IS NOT NULL
  GROUP BY user_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  IF brute_force_count >= 20 THEN
    INSERT INTO security_audit_logs (
      action,
      success,
      resource,
      error_message
    ) VALUES (
      'SUSPICIOUS_FILE_UPLOAD_PATTERN',
      false,
      'security_monitoring',
      format('Excessive failed file validation attempts: %s attempts in 5 minutes', brute_force_count)
    );
  END IF;
END;
$$;

-- Create a function to clean up old security logs (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Keep security logs for 90 days only
  DELETE FROM security_audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup operation
  INSERT INTO security_audit_logs (
    action,
    success,
    resource,
    error_message
  ) VALUES (
    'SECURITY_LOGS_CLEANUP',
    true,
    'security_monitoring',
    format('Cleaned up %s old security log entries', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$;

-- Enhanced rate limiting function with better security
CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(
  p_user_id uuid,
  p_action text,
  p_max_attempts integer DEFAULT 10,
  p_window_minutes integer DEFAULT 15,
  p_ip_address inet DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  window_start timestamp with time zone;
  attempt_count integer;
  is_blocked boolean := false;
  result jsonb;
BEGIN
  -- Calculate window start time
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count attempts in the current window
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND window_start >= enhanced_rate_limit_check.window_start;
  
  -- Check if user is currently blocked
  SELECT EXISTS(
    SELECT 1 FROM rate_limits
    WHERE user_id = p_user_id
      AND action = p_action
      AND blocked_until > now()
  ) INTO is_blocked;
  
  -- Return status
  result := jsonb_build_object(
    'allowed', (attempt_count < p_max_attempts AND NOT is_blocked),
    'attempt_count', attempt_count,
    'max_attempts', p_max_attempts,
    'window_minutes', p_window_minutes,
    'is_blocked', is_blocked,
    'reset_time', window_start + (p_window_minutes || ' minutes')::interval
  );
  
  -- Log if limit exceeded
  IF attempt_count >= p_max_attempts OR is_blocked THEN
    INSERT INTO security_audit_logs (
      user_id,
      action,
      success,
      resource,
      error_message,
      ip_address
    ) VALUES (
      p_user_id,
      'RATE_LIMIT_EXCEEDED',
      false,
      p_action,
      format('Rate limit exceeded: %s/%s attempts in %s minutes', attempt_count, p_max_attempts, p_window_minutes),
      p_ip_address
    );
  END IF;
  
  RETURN result;
END;
$$;