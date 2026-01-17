-- Add SELECT policy for asset_data table to allow users to view their own data
-- This fixes the security warning: users currently cannot view their own asset data

CREATE POLICY "Users can view their own asset data"
ON public.asset_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);