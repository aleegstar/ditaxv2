-- Create function to assign admin role to a specific user by email
-- This function can only be called by service_role or existing admins
CREATE OR REPLACE FUNCTION public.assign_admin_role_by_email(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  existing_role_count integer;
  result jsonb;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM profiles 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || user_email
    );
  END IF;
  
  -- Check if user already has admin role
  SELECT COUNT(*) INTO existing_role_count
  FROM user_roles 
  WHERE user_id = target_user_id AND role = 'admin'::app_role;
  
  IF existing_role_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already has admin role',
      'user_id', target_user_id
    );
  END IF;
  
  -- Insert admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role);
  
  -- Log the assignment
  INSERT INTO security_audit_logs (
    user_id,
    action,
    success,
    resource,
    error_message
  ) VALUES (
    target_user_id,
    'ADMIN_ROLE_ASSIGNED',
    true,
    'role_assignment',
    'Admin role assigned to user: ' || user_email
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', user_email,
    'message', 'Admin role successfully assigned'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Create function to make the first user an admin (bootstrap function)
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_count integer;
  first_user_id uuid;
  first_user_email text;
  result jsonb;
BEGIN
  -- Check if there are already any admins
  SELECT COUNT(*) INTO admin_count
  FROM user_roles 
  WHERE role = 'admin'::app_role;
  
  IF admin_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin users already exist. Cannot bootstrap.'
    );
  END IF;
  
  -- Get the first user (oldest profile)
  SELECT id, email INTO first_user_id, first_user_email
  FROM profiles 
  ORDER BY updated_at ASC 
  LIMIT 1;
  
  IF first_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No users found in the system'
    );
  END IF;
  
  -- Assign admin role to first user
  INSERT INTO user_roles (user_id, role)
  VALUES (first_user_id, 'admin'::app_role);
  
  -- Log the bootstrap
  INSERT INTO security_audit_logs (
    user_id,
    action,
    success,
    resource,
    error_message
  ) VALUES (
    first_user_id,
    'ADMIN_BOOTSTRAP',
    true,
    'role_assignment',
    'First admin bootstrapped for user: ' || first_user_email
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', first_user_id,
    'email', first_user_email,
    'message', 'First admin successfully bootstrapped'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;