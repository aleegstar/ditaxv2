-- Fix Critical Security Issue: Add proper RLS policies for rate_limits table
-- This table was missing proper access controls

-- First, ensure RLS is enabled on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Remove any overly permissive existing policies and add secure ones
DROP POLICY IF EXISTS "Edge functions can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can view their own rate limits only" ON public.rate_limits;
DROP POLICY IF EXISTS "Admins can view rate limits for monitoring" ON public.rate_limits;

-- Create secure policies for rate_limits table
-- Only service role and edge functions can insert/update/delete rate limit records
CREATE POLICY "Service role and edge functions can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'iss') = 'supabase')
WITH CHECK (auth.role() = 'service_role' OR (auth.jwt() ->> 'iss') = 'supabase');

-- Admins can view rate limits for monitoring purposes only
CREATE POLICY "Admins can view rate limits for monitoring" 
ON public.rate_limits 
FOR SELECT 
USING (verify_admin_role());

-- Users can only view their own rate limits
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add enhanced security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  p_action text,
  p_resource text DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO security_audit_logs (
    user_id,
    action,
    resource,
    success,
    error_message,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource,
    p_success,
    p_error_message,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Add function for progressive rate limiting
CREATE OR REPLACE FUNCTION public.check_progressive_rate_limit(
  p_action text,
  p_max_attempts integer DEFAULT 10,
  p_window_minutes integer DEFAULT 15
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  window_start timestamp with time zone;
  attempt_count integer;
  is_blocked boolean := false;
  block_duration interval;
  result jsonb;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Authentication required');
  END IF;
  
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count attempts in current window
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limits
  WHERE user_id = check_progressive_rate_limit.user_id
    AND action = p_action
    AND window_start >= check_progressive_rate_limit.window_start;
  
  -- Check if user is currently blocked
  SELECT EXISTS(
    SELECT 1 FROM rate_limits
    WHERE user_id = check_progressive_rate_limit.user_id
      AND action = p_action
      AND blocked_until > now()
  ) INTO is_blocked;
  
  -- Progressive blocking: longer blocks for repeated violations
  IF attempt_count >= p_max_attempts THEN
    -- Calculate block duration based on violation count
    block_duration := CASE 
      WHEN attempt_count < 20 THEN '15 minutes'::interval
      WHEN attempt_count < 50 THEN '1 hour'::interval
      WHEN attempt_count < 100 THEN '6 hours'::interval
      ELSE '24 hours'::interval
    END;
    
    -- Update or insert rate limit record with block
    INSERT INTO rate_limits (user_id, action, attempts, window_start, blocked_until)
    VALUES (user_id, p_action, attempt_count + 1, window_start, now() + block_duration)
    ON CONFLICT (user_id, action) 
    DO UPDATE SET 
      attempts = EXCLUDED.attempts,
      window_start = EXCLUDED.window_start,
      blocked_until = EXCLUDED.blocked_until;
    
    is_blocked := true;
  ELSE
    -- Record the attempt
    INSERT INTO rate_limits (user_id, action, attempts, window_start)
    VALUES (user_id, p_action, attempt_count + 1, window_start)
    ON CONFLICT (user_id, action) 
    DO UPDATE SET 
      attempts = EXCLUDED.attempts,
      window_start = EXCLUDED.window_start;
  END IF;
  
  result := jsonb_build_object(
    'allowed', NOT is_blocked AND attempt_count < p_max_attempts,
    'attempt_count', attempt_count,
    'max_attempts', p_max_attempts,
    'is_blocked', is_blocked,
    'block_duration_minutes', CASE WHEN is_blocked THEN extract(epoch from block_duration)/60 ELSE 0 END,
    'reset_time', window_start + (p_window_minutes || ' minutes')::interval
  );
  
  RETURN result;
END;
$$;

-- Add data retention policy function
CREATE OR REPLACE FUNCTION public.apply_data_retention_policies()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_logs integer;
  deleted_sessions integer;
  deleted_rate_limits integer;
  result_message text;
BEGIN
  -- Only allow admins to execute this
  IF NOT verify_admin_role() THEN
    RAISE EXCEPTION 'Only administrators can apply data retention policies';
  END IF;
  
  -- Clean up old security logs (keep 90 days)
  DELETE FROM security_audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_logs = ROW_COUNT;
  
  -- Clean up old user sessions (keep 30 days)
  DELETE FROM user_sessions 
  WHERE login_time < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  -- Clean up old rate limit records (keep 7 days)
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_rate_limits = ROW_COUNT;
  
  result_message := format(
    'Data retention applied: %s audit logs, %s sessions, %s rate limits deleted',
    deleted_logs, deleted_sessions, deleted_rate_limits
  );
  
  -- Log the cleanup
  PERFORM log_security_event_enhanced(
    'DATA_RETENTION_APPLIED',
    'system_maintenance',
    true,
    result_message
  );
  
  RETURN result_message;
END;
$$;