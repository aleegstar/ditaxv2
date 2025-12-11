-- Enable RLS on rate_limits table (ensure it's enabled)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop the insecure policy that allows users to view their rate limits
-- (This could help attackers understand and bypass rate limiting)
DROP POLICY IF EXISTS "Users can view their rate limits" ON public.rate_limits;

-- Ensure service role policies exist for rate limit management
DROP POLICY IF EXISTS "Service role can insert rate limits" ON public.rate_limits;
CREATE POLICY "Service role can insert rate limits" 
ON public.rate_limits 
FOR INSERT 
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update rate limits" ON public.rate_limits;
CREATE POLICY "Service role can update rate limits" 
ON public.rate_limits 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete rate limits" ON public.rate_limits;
CREATE POLICY "Service role can delete rate limits" 
ON public.rate_limits 
FOR DELETE 
TO service_role
USING (true);

-- Keep admin view access for monitoring
DROP POLICY IF EXISTS "Admins can view all rate limits" ON public.rate_limits;
CREATE POLICY "Admins can view all rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));