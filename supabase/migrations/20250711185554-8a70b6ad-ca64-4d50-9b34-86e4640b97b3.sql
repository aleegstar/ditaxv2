-- Create RPC function for getting single user profile for admin
CREATE OR REPLACE FUNCTION public.get_single_profile_for_admin(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  address text,
  phone text,
  avatar_url text,
  admin_notes text,
  date_of_birth date,
  privacy_preferences jsonb,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return the specific profile
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.address,
    p.phone,
    p.avatar_url,
    p.admin_notes,
    p.date_of_birth,
    p.privacy_preferences,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = target_user_id;
END;
$$;