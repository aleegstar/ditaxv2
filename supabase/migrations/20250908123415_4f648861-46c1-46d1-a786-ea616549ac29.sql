-- Create a new admin verification function that works around the enum type issue
CREATE OR REPLACE FUNCTION public.verify_admin_role_simple()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role::text = 'admin'
  );
$$;