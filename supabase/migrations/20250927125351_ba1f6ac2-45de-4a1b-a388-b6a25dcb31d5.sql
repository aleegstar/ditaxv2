-- Fix rate_limits table security by enabling proper RLS policies
-- Current issue: The table may have insufficient access controls

-- First, ensure RLS is enabled (should already be enabled)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to replace with more secure ones
DROP POLICY IF EXISTS "Admins can view rate limits for security monitoring" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role and edge functions can manage rate limits" ON public.rate_limits;

-- Create new, more restrictive policies
-- Only service role and edge functions can manage rate limits completely
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Edge functions (identified by JWT issuer) can manage rate limits
CREATE POLICY "Edge functions can manage rate limits"
ON public.rate_limits
FOR ALL
USING ((auth.jwt() ->> 'iss') = 'supabase')
WITH CHECK ((auth.jwt() ->> 'iss') = 'supabase');

-- Admins can only view rate limits for security monitoring (read-only)
CREATE POLICY "Admins can view rate limits for monitoring"
ON public.rate_limits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  )
);

-- Ensure no public access by revoking any default permissions
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM authenticated;

-- Grant only necessary permissions to authenticated users (none for rate_limits)
-- Service role will handle all rate limiting operations