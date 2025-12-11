-- Fix rate_limits table security issue
-- The table needs proper RLS policies to prevent manipulation by attackers

-- First, ensure RLS is enabled on the rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can view own rate limit status" ON public.rate_limits;

-- Create secure policies:

-- 1. Only service role can insert rate limit records
-- This is critical - rate limits should only be created by backend functions
CREATE POLICY "Service role can insert rate limits"
ON public.rate_limits
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Only service role can update rate limit records
CREATE POLICY "Service role can update rate limits"
ON public.rate_limits
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Only service role can delete rate limit records
CREATE POLICY "Service role can delete rate limits"
ON public.rate_limits
FOR DELETE
TO service_role
USING (true);

-- 4. Admins can view all rate limits for monitoring purposes
CREATE POLICY "Admins can view all rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Users can only view their own active rate limits (for transparency)
-- But they cannot modify them
CREATE POLICY "Users can view own active rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND blocked_until IS NOT NULL 
  AND blocked_until > now()
);

-- Log the security improvement
INSERT INTO public.security_audit_logs (
  action,
  success,
  resource,
  error_message
) VALUES (
  'RATE_LIMITS_RLS_HARDENED',
  true,
  'rate_limits_table',
  'Applied strict RLS policies to rate_limits table - only service role can modify, admins/users can only view'
);