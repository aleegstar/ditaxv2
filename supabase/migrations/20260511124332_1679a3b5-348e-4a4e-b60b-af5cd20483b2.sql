-- Remove admin SELECT access to user-held DEKs (envelope encryption privacy)
DROP POLICY IF EXISTS "Admins can view all field encryption keys" ON public.user_field_encryption_keys;

-- Allow admins to view user sessions for security incident investigation
CREATE POLICY "Admins can view all user sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));