-- Fix remaining functions without proper search_path settings
-- Update all functions that might be missing search_path

-- Fix prevent_role_escalation function
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent non-admin users from granting admin roles
  IF NEW.role = 'admin'::public.app_role AND TG_OP = 'INSERT' THEN
    -- Only allow service_role or existing admins to create admin roles
    IF auth.role() != 'service_role' AND NOT has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Insufficient privileges to assign admin role'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  
  -- Prevent role modification for non-admins
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    IF auth.role() != 'service_role' AND NOT has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Insufficient privileges to modify user roles'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix prevent_admin_self_assignment function
CREATE OR REPLACE FUNCTION public.prevent_admin_self_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent users from giving themselves admin role directly
  IF NEW.role = 'admin'::public.app_role AND NEW.user_id = auth.uid() AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Users cannot assign admin role to themselves'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix track_user_session function
CREATE OR REPLACE FUNCTION public.track_user_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_sessions (user_id, login_time)
  VALUES (NEW.id, NOW());
  RETURN NEW;
END;
$$;

-- Fix validate_user_session function
CREATE OR REPLACE FUNCTION public.validate_user_session()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_valid BOOLEAN := FALSE;
  user_id UUID;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has recent valid session
  SELECT EXISTS(
    SELECT 1 FROM public.user_sessions 
    WHERE user_id = auth.uid() 
    AND login_time > NOW() - INTERVAL '24 hours'
  ) INTO session_valid;
  
  -- Log session validation
  INSERT INTO public.security_audit_logs (
    user_id,
    action,
    success,
    resource
  ) VALUES (
    user_id,
    'SESSION_VALIDATION',
    session_valid,
    'session_check'
  );
  
  RETURN session_valid;
END;
$$;