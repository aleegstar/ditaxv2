-- Fix RLS policy for user_sessions to allow inserts in trigger contexts
-- This prevents "Database error granting user" during OAuth callbacks

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.user_sessions;

-- Create new policy that allows inserts in trigger contexts (auth.jwt() IS NULL)
CREATE POLICY "Users can create their own sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  OR auth.role() = 'service_role' 
  OR auth.jwt() IS NULL  -- Allow in trigger context (OAuth callbacks)
);

-- Also ensure we can handle the admin-operations deletion properly
-- Update the admin access policy if needed for complete user deletion
CREATE OR REPLACE FUNCTION public.delete_auth_user_admin(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow admins or service role
  IF NOT (verify_admin_role() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- This function will be called by edge functions to delete auth users
  -- Returns success status for edge function to handle auth.admin.deleteUser
  result := jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'message', 'Ready for auth user deletion'
  );

  RETURN result;
END;
$$;