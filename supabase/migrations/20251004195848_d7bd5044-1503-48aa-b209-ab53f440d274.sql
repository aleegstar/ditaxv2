-- Ensure RLS is enabled on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Service role can delete rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role can insert rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role can select rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role can update rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Admins can view all rate limits" ON public.rate_limits;

-- Create secure policies that properly check for service_role
-- Only service_role and edge functions can insert rate limits
CREATE POLICY "Only service role can insert rate limits"
ON public.rate_limits
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' OR 
  (auth.jwt() ->> 'iss') = 'supabase'
);

-- Only service_role and edge functions can update rate limits
CREATE POLICY "Only service role can update rate limits"
ON public.rate_limits
FOR UPDATE
USING (
  auth.role() = 'service_role' OR 
  (auth.jwt() ->> 'iss') = 'supabase'
)
WITH CHECK (
  auth.role() = 'service_role' OR 
  (auth.jwt() ->> 'iss') = 'supabase'
);

-- Only service_role and edge functions can delete rate limits
CREATE POLICY "Only service role can delete rate limits"
ON public.rate_limits
FOR DELETE
USING (
  auth.role() = 'service_role' OR 
  (auth.jwt() ->> 'iss') = 'supabase'
);

-- Only service_role, edge functions, and admins can select rate limits
CREATE POLICY "Service role and admins can view rate limits"
ON public.rate_limits
FOR SELECT
USING (
  auth.role() = 'service_role' OR 
  (auth.jwt() ->> 'iss') = 'supabase' OR
  has_role(auth.uid(), 'admin'::app_role)
);