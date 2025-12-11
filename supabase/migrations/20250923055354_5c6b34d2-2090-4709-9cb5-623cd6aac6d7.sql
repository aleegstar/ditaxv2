-- Fix app_role type definition and security issues
-- Create the app_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Fix rate_limits table RLS policies for better security
DROP POLICY IF EXISTS "Users can view their own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Admins can view all rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Admins can delete rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Service role can insert rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Service role can update rate limits" ON rate_limits;

-- Create more secure rate_limits policies
CREATE POLICY "Service role and edge functions can manage rate limits"
ON rate_limits FOR ALL
USING (auth.role() = 'service_role' OR (auth.jwt() ->> 'iss') = 'supabase')
WITH CHECK (auth.role() = 'service_role' OR (auth.jwt() ->> 'iss') = 'supabase');

CREATE POLICY "Admins can view rate limits for security monitoring"
ON rate_limits FOR SELECT
USING (verify_admin_role());

-- Apply comprehensive security hardening
SELECT apply_security_hardening();

-- Create function to monitor suspicious activity patterns
CREATE OR REPLACE FUNCTION monitor_security_patterns()
RETURNS void AS $$
DECLARE
  suspicious_count integer;
BEGIN
  -- Check for multiple failed admin access attempts
  SELECT COUNT(*) INTO suspicious_count
  FROM security_audit_logs
  WHERE action LIKE '%ADMIN_ACCESS_DENIED%'
    AND success = false
    AND created_at > NOW() - INTERVAL '1 hour';
    
  -- Log if suspicious pattern detected
  IF suspicious_count >= 5 THEN
    INSERT INTO security_audit_logs (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate and strengthen user sessions
CREATE OR REPLACE FUNCTION strengthen_user_session_security()
RETURNS void AS $$
BEGIN
  -- Clean up old sessions (older than 7 days)
  DELETE FROM user_sessions 
  WHERE login_time < NOW() - INTERVAL '7 days';
  
  -- Log session cleanup
  INSERT INTO security_audit_logs (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;