-- Drop existing policies that use direct user_roles query
DROP POLICY IF EXISTS "Admins can view quick replies" ON chat_quick_replies;
DROP POLICY IF EXISTS "Admins can create quick replies" ON chat_quick_replies;
DROP POLICY IF EXISTS "Admins can update quick replies" ON chat_quick_replies;
DROP POLICY IF EXISTS "Admins can delete quick replies" ON chat_quick_replies;

-- Create new policies using has_role() function (security definer, bypasses RLS)
CREATE POLICY "Admins can view quick replies"
ON chat_quick_replies FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create quick replies"
ON chat_quick_replies FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quick replies"
ON chat_quick_replies FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete quick replies"
ON chat_quick_replies FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));