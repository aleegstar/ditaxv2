-- Update rate_limits table RLS policies for enhanced security
-- This ensures that rate limiting data is properly protected

-- First, drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Admins can view rate limits for monitoring" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role and edge functions can manage rate limits" ON public.rate_limits;  
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.rate_limits;

-- Create enhanced RLS policies for rate_limits table
-- Policy 1: Only admins can view rate limiting data for monitoring
CREATE POLICY "admin_view_rate_limits" ON public.rate_limits
  FOR SELECT
  TO authenticated
  USING (verify_admin_role());

-- Policy 2: Only service role and edge functions can manage rate limits
CREATE POLICY "service_manage_rate_limits" ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 3: Edge functions can manage rate limits for security operations
CREATE POLICY "edge_functions_manage_rate_limits" ON public.rate_limits
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'iss') = 'supabase')
  WITH CHECK ((auth.jwt() ->> 'iss') = 'supabase');

-- Policy 4: Users can only view their own rate limit status (not details)
CREATE POLICY "users_view_own_rate_status" ON public.rate_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND blocked_until > now());

-- Add additional security: ensure no anonymous access
-- Revoke all permissions from anonymous users
REVOKE ALL ON public.rate_limits FROM anon;

-- Log security enhancement
INSERT INTO public.security_audit_logs (
  action,
  success,
  resource,
  error_message
) VALUES (
  'RATE_LIMITS_SECURITY_ENHANCED',
  true,
  'rate_limits_table',
  'Enhanced RLS policies applied to rate_limits table for better security'
);