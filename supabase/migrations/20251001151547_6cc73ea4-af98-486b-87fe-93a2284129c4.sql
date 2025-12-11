-- Fix rate_limits table security issue - corrected version
-- Ensure RLS is enabled and policies are properly configured

-- Enable RLS on rate_limits table (idempotent operation)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'rate_limits' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rate_limits', pol.policyname);
    END LOOP;
END $$;

-- Create secure policies:

-- 1. Only service role can insert rate limit records
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

-- 4. Admins can view all rate limits for monitoring
CREATE POLICY "Admins can view all rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Users can only view their own active rate limits
CREATE POLICY "Users can view own active rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND blocked_until IS NOT NULL 
  AND blocked_until > now()
);

-- Log the security fix
INSERT INTO public.security_audit_logs (
  action,
  success,
  resource,
  error_message
) VALUES (
  'RATE_LIMITS_RLS_SECURED',
  true,
  'rate_limits_table',
  'Enabled RLS and applied strict policies - only service role can modify rate limits'
);