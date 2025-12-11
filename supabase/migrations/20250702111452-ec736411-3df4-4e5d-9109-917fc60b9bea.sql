
-- 1. Create secure admin verification function
CREATE OR REPLACE FUNCTION public.verify_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
$$;

-- 2. Drop dangerous profile policies
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- 3. Create secure profile policies
CREATE POLICY "Users can insert own profile only" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile, admins view all" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR public.verify_admin_role()
);

-- 4. Clean up duplicate chat policies
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_policy" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update_policy" ON public.chat_messages;

-- Keep only the more restrictive policies
CREATE POLICY "Users can send messages to admins or recipients" ON public.chat_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (
    recipient_id IS NULL OR -- broadcast to admins
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = recipient_id AND role = 'admin'::app_role)
  )
);

-- 5. Create audit logging table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource text,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs" ON public.security_audit_logs
FOR SELECT USING (public.verify_admin_role());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.security_audit_logs
FOR INSERT WITH CHECK (true);

-- 6. Add rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  UNIQUE(user_id, action)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON public.rate_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" ON public.rate_limits
FOR ALL USING (true) WITH CHECK (true);
