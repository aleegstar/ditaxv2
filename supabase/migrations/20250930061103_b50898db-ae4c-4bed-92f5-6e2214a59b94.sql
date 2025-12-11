-- Fix security vulnerabilities in profiles, form_data, and rate_limits tables
-- Ensure no anonymous access to sensitive data

-- 1. DROP existing policies on profiles table to recreate them with better security
DROP POLICY IF EXISTS "Admins can access all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can access their own profile" ON public.profiles;

-- 2. Create new secure policies for profiles table
-- Users can only access their own profile and must be authenticated
CREATE POLICY "Users can access own profile only"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can access all profiles but must be authenticated and have admin role
CREATE POLICY "Admins can access all profiles securely"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Ensure form_data table policies explicitly block anonymous access
DROP POLICY IF EXISTS "Benutzer können ihre eigenen Daten lesen" ON public.form_data;
DROP POLICY IF EXISTS "Benutzer können ihre eigenen Daten einfügen" ON public.form_data;
DROP POLICY IF EXISTS "Benutzer können ihre eigenen Daten aktualisieren" ON public.form_data;
DROP POLICY IF EXISTS "Benutzer können ihre eigenen Daten löschen" ON public.form_data;
DROP POLICY IF EXISTS "Admins can view all form data" ON public.form_data;

-- Create secure form_data policies
CREATE POLICY "Users can read own form data"
ON public.form_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own form data"
ON public.form_data
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own form data"
ON public.form_data
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own form data"
ON public.form_data
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can access all form data"
ON public.form_data
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Simplify and secure rate_limits policies
DROP POLICY IF EXISTS "admin_view_rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "automated_security_rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "edge_functions_manage_rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "service_role_rate_limits_restricted" ON public.rate_limits;
DROP POLICY IF EXISTS "users_view_own_rate_status" ON public.rate_limits;

-- Create simplified, secure rate_limits policies
CREATE POLICY "Admins can manage rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own rate limit status"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND blocked_until > now());

CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Add additional security function to validate authenticated users
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- 6. Ensure all sensitive tables have explicit RLS enable
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 7. Add security comment for documentation
COMMENT ON TABLE public.profiles IS 'Contains highly sensitive PII - protected by RLS with authenticated user checks';
COMMENT ON TABLE public.form_data IS 'Contains sensitive financial/tax data - protected by strict RLS policies';
COMMENT ON TABLE public.rate_limits IS 'Security-critical table for rate limiting - simplified policies for better security';