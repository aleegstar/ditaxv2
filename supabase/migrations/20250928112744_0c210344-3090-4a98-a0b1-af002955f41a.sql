-- Enhance rate_limits table security with more restrictive policies
-- Replace overly permissive service role policy with more specific conditions

-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "service_manage_rate_limits" ON public.rate_limits;

-- Create more restrictive service role policy with specific conditions
CREATE POLICY "service_role_rate_limits_restricted" ON public.rate_limits
  FOR ALL
  TO service_role
  USING (
    -- Only allow service role operations for rate limiting management
    -- and security monitoring functions
    action IN ('login_attempt', 'api_request', 'file_upload', 'admin_operation', 'security_check')
  )
  WITH CHECK (
    -- Same conditions for inserts/updates
    action IN ('login_attempt', 'api_request', 'file_upload', 'admin_operation', 'security_check')
  );

-- Add policy for automated security functions
CREATE POLICY "automated_security_rate_limits" ON public.rate_limits
  FOR ALL
  TO service_role
  USING (
    -- Allow broader access for security automation and cleanup
    action LIKE 'SECURITY_%' OR action LIKE 'CLEANUP_%' OR action LIKE 'MONITOR_%'
  )
  WITH CHECK (
    action LIKE 'SECURITY_%' OR action LIKE 'CLEANUP_%' OR action LIKE 'MONITOR_%'
  );

-- Log the security enhancement
INSERT INTO public.security_audit_logs (
  action,
  success,
  resource,
  error_message
) VALUES (
  'RATE_LIMITS_POLICIES_ENHANCED',
  true,
  'rate_limits_security',
  'Replaced overly permissive service role policy with restrictive conditions'
);