-- Add SELECT policy for users to view their own encryption keys
CREATE POLICY "Users can view their own encryption keys"
ON user_encryption_keys FOR SELECT
USING (auth.uid() = user_id);

-- Add UPDATE policy for users to update their own encryption keys
CREATE POLICY "Users can update their own encryption keys"
ON user_encryption_keys FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add admin SELECT policy for viewing all encryption keys
CREATE POLICY "Admins can view all encryption keys"
ON user_encryption_keys FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin UPDATE policy for managing all encryption keys
CREATE POLICY "Admins can update all encryption keys"
ON user_encryption_keys FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));