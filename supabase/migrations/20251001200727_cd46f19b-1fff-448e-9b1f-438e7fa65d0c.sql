-- Add SELECT policy for service role to complete RLS coverage
CREATE POLICY "Service role can select rate limits" 
ON public.rate_limits 
FOR SELECT 
TO service_role
USING (true);