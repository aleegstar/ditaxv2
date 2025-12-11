-- Secure rate_limits table with strict RLS policies
-- 1) Ensure RLS is enabled
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2) Clean up any existing policies to avoid duplicates or overly permissive rules
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'rate_limits'
  ) THEN
    -- Drop known policy names if they exist
    BEGIN EXECUTE 'DROP POLICY IF EXISTS "Admins can view all rate limits" ON public.rate_limits'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN EXECUTE 'DROP POLICY IF EXISTS "Service role can insert rate limits" ON public.rate_limits'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN EXECUTE 'DROP POLICY IF EXISTS "Service role can update rate limits" ON public.rate_limits'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN EXECUTE 'DROP POLICY IF EXISTS "Service role can delete rate limits" ON public.rate_limits'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN EXECUTE 'DROP POLICY IF EXISTS "Users can view own active rate limits" ON public.rate_limits'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN EXECUTE 'DROP POLICY IF EXISTS "Users can view their rate limits" ON public.rate_limits'; EXCEPTION WHEN others THEN NULL; END;
  END IF;
END$$;

-- 3) Re-create least-privilege policies
-- Only the service role (Edge Functions, backend) can modify rate limits
CREATE POLICY "Service role can insert rate limits"
ON public.rate_limits
FOR INSERT
TO authenticated, anon
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update rate limits"
ON public.rate_limits
FOR UPDATE
TO authenticated, anon
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete rate limits"
ON public.rate_limits
FOR DELETE
TO authenticated, anon
USING (auth.role() = 'service_role');

-- Admins may read for monitoring/ops
CREATE POLICY "Admins can view all rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can read their own rate limit status (safe visibility)
CREATE POLICY "Users can view their rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4) Helpful index for lookups (idempotent create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_rate_limits_user_action_window'
  ) THEN
    CREATE INDEX idx_rate_limits_user_action_window
      ON public.rate_limits (user_id, action, window_start DESC);
  END IF;
END$$;