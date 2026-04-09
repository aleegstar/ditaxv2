
-- Fix 1: Tighten user_roles INSERT policy to authenticated only and add DELETE policy
DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;

CREATE POLICY "Only admins can assign roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.role() = 'service_role') OR has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Add DELETE policy for admins
CREATE POLICY "Only admins can remove roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    (auth.role() = 'service_role') OR has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Fix 2: Add UPDATE and DELETE storage policies for definitive-tax-bills user files
CREATE POLICY "Users can update their own definitive tax bills"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'definitive-tax-bills' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own definitive tax bills"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'definitive-tax-bills' AND (auth.uid())::text = (storage.foldername(name))[1]);
