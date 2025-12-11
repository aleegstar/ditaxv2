
-- Phase 1: Critical Security Hardening

-- 1. Add database trigger to prevent unauthorized role escalation
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent non-admin users from granting admin roles
  IF NEW.role = 'admin'::app_role AND TG_OP = 'INSERT' THEN
    -- Only allow service_role or existing admins to create admin roles
    IF auth.role() != 'service_role' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Insufficient privileges to assign admin role'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  
  -- Prevent role modification for non-admins
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    IF auth.role() != 'service_role' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Insufficient privileges to modify user roles'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role escalation prevention
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON user_roles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- 2. Add server-side admin verification function
CREATE OR REPLACE FUNCTION verify_admin_access(operation_type TEXT DEFAULT 'general')
RETURNS BOOLEAN AS $$
DECLARE
  user_is_admin BOOLEAN;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user exists and is authenticated
  IF current_user_id IS NULL THEN
    -- Log unauthorized access attempt
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
    RETURN FALSE;
  END IF;
  
  -- Verify admin role
  SELECT has_role(current_user_id, 'admin'::app_role) INTO user_is_admin;
  
  -- Log access attempt
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
  
  RETURN user_is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Strengthen RLS policies with server-side verification
-- Update profiles table policies to use server-side verification
DROP POLICY IF EXISTS "Enhanced admin profile access" ON profiles;
CREATE POLICY "Enhanced admin profile access" 
  ON profiles FOR ALL 
  USING (
    auth.uid() = id OR verify_admin_access('profile_access')
  )
  WITH CHECK (
    auth.uid() = id OR verify_admin_access('profile_modification')
  );

-- 4. Add constraint to prevent user_id nullability in critical tables
ALTER TABLE user_roles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN id SET NOT NULL;

-- 5. Add integrity constraints
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_check 
  CHECK (user_id IS NOT NULL);

-- 6. Create session validation function
CREATE OR REPLACE FUNCTION validate_user_session()
RETURNS BOOLEAN AS $$
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
    SELECT 1 FROM user_sessions 
    WHERE user_id = auth.uid() 
    AND login_time > NOW() - INTERVAL '24 hours'
  ) INTO session_valid;
  
  -- Log session validation
  INSERT INTO security_audit_logs (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
