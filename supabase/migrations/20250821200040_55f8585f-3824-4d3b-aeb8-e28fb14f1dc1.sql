
-- Fix the check_passkeys_for_email function to properly access public schema tables
CREATE OR REPLACE FUNCTION public.check_passkeys_for_email(p_email text)
RETURNS TABLE(
  has_passkeys boolean,
  passkey_count integer,
  user_id uuid,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Find user by email and count their active passkeys
  RETURN QUERY
  SELECT 
    CASE WHEN COUNT(up.id) > 0 THEN true ELSE false END as has_passkeys,
    COUNT(up.id)::integer as passkey_count,
    p.id as user_id,
    p.email as email
  FROM public.profiles p
  LEFT JOIN public.user_passkeys up ON p.id = up.user_id AND up.is_active = true
  WHERE p.email = p_email
  GROUP BY p.id, p.email;
  
  -- If no user found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, NULL::uuid, p_email;
  END IF;
END;
$$;
