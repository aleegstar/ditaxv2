-- Fix search path issues for functions using app_role enum
-- Update get_all_profiles_for_admin function to use proper search path
CREATE OR REPLACE FUNCTION public.get_all_profiles_for_admin()
RETURNS TABLE(id uuid, first_name text, last_name text, email text, address text, phone text, avatar_url text, admin_notes text, date_of_birth date, privacy_preferences jsonb, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return all profiles
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
  ORDER BY p.updated_at DESC;
END;
$$;

-- Update has_role function to use proper search path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update verify_admin_role function to use proper search path
CREATE OR REPLACE FUNCTION public.verify_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  );
$$;

-- Update get_current_user_role function to use proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    'user'::public.app_role
  );
$$;