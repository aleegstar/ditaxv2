
-- Drop the problematic RLS policies that try to access auth.users directly
DROP POLICY IF EXISTS "Only administrators can update admin_notes" ON public.profiles;
DROP POLICY IF EXISTS "Only administrators can view admin_notes" ON public.profiles;

-- Create a security definer function to get current user role (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    'user'::app_role
  );
$$;

-- Create new correct RLS policies for admin notes using the security definer function
CREATE POLICY "Admins can update admin_notes" ON public.profiles
FOR UPDATE USING (public.get_current_user_role() = 'admin'::app_role);

CREATE POLICY "Admins can view admin_notes" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR public.get_current_user_role() = 'admin'::app_role
);
