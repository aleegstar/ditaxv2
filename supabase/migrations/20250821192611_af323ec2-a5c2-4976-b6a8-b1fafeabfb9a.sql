
-- Create a function to verify passkey authentication and return user info
CREATE OR REPLACE FUNCTION public.verify_passkey_authentication(
  p_credential_id text,
  p_challenge text,
  p_signature text
) RETURNS TABLE(
  user_id uuid,
  email text,
  success boolean,
  error_message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  passkey_record RECORD;
  user_record RECORD;
BEGIN
  -- Find the passkey
  SELECT up.*, p.email INTO passkey_record, user_record
  FROM user_passkeys up
  JOIN profiles p ON p.id = up.user_id
  WHERE up.credential_id = p_credential_id 
    AND up.is_active = true;
    
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'Passkey not found or inactive';
    RETURN;
  END IF;
  
  -- Update last used timestamp and counter
  UPDATE user_passkeys 
  SET 
    last_used_at = now(),
    counter = counter + 1
  WHERE credential_id = p_credential_id;
  
  -- Log the authentication attempt
  INSERT INTO security_audit_logs (
    user_id,
    action,
    success,
    resource
  ) VALUES (
    passkey_record.user_id,
    'PASSKEY_AUTH_SUCCESS',
    true,
    'passkey_authentication'
  );
  
  RETURN QUERY SELECT 
    passkey_record.user_id, 
    user_record.email, 
    true, 
    NULL::text;
END;
$$;

-- Create a function to check if passkeys exist for an email
CREATE OR REPLACE FUNCTION public.check_passkeys_for_email(p_email text)
RETURNS TABLE(
  has_passkeys boolean,
  passkey_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  target_user_id uuid;
  passkey_count_val integer;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = p_email;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;
  
  -- Count active passkeys
  SELECT COUNT(*)::integer INTO passkey_count_val
  FROM user_passkeys
  WHERE user_id = target_user_id AND is_active = true;
  
  RETURN QUERY SELECT 
    (passkey_count_val > 0), 
    passkey_count_val;
END;
$$;
