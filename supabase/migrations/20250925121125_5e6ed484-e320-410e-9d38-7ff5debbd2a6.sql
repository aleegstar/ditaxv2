-- Make verify_admin_access function more robust with conditional logging and exception handling
CREATE OR REPLACE FUNCTION public.verify_admin_access(operation_type text DEFAULT 'general'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_is_admin BOOLEAN;
  current_user_id UUID;
  can_log BOOLEAN := false;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if we can log (only for Edge Functions)
  BEGIN
    can_log := (auth.jwt() ->> 'iss') = 'supabase';
  EXCEPTION WHEN others THEN
    can_log := false;
  END;
  
  -- Check if user exists and is authenticated
  IF current_user_id IS NULL THEN
    -- Log unauthorized access attempt only if we can log
    IF can_log THEN
      BEGIN
        INSERT INTO security_audit_logs (
          action, 
          success, 
          error_message,
          resource
        ) VALUES (
          'ADMIN_ACCESS_DENIED_NO_AUTH',
          false,
          'Attempted admin access without authentication',
          operation_type
        );
      EXCEPTION WHEN others THEN
        -- Ignore logging errors
        NULL;
      END;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Verify admin role
  SELECT has_role(current_user_id, 'admin'::app_role) INTO user_is_admin;
  
  -- Log access attempt only if we can log
  IF can_log THEN
    BEGIN
      INSERT INTO security_audit_logs (
        user_id,
        action,
        success,
        resource,
        error_message
      ) VALUES (
        current_user_id,
        CASE WHEN user_is_admin THEN 'ADMIN_ACCESS_GRANTED' ELSE 'ADMIN_ACCESS_DENIED' END,
        user_is_admin,
        operation_type,
        CASE WHEN NOT user_is_admin THEN 'User lacks admin privileges' ELSE NULL END
      );
    EXCEPTION WHEN others THEN
      -- Ignore logging errors
      NULL;
    END;
  END IF;
  
  RETURN user_is_admin;
END;
$$;