
-- Drop and recreate INSERT policy without redundant service_role check
DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;
CREATE POLICY "Only admins can assign roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));

-- Drop and recreate DELETE policy without redundant service_role check
DROP POLICY IF EXISTS "Only admins can remove roles" ON public.user_roles;
CREATE POLICY "Only admins can remove roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::public.app_role));

-- Drop and recreate UPDATE policy without redundant service_role check
DROP POLICY IF EXISTS "Only admins can modify roles" ON public.user_roles;
CREATE POLICY "Only admins can modify roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
