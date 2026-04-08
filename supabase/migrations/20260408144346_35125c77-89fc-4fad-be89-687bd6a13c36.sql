-- Fix: Restrict account_deletion_feedback INSERT to service_role only
-- Previously allowed any unauthenticated user (public role) to insert arbitrary rows
DROP POLICY IF EXISTS "Service role can insert feedback" ON public.account_deletion_feedback;

CREATE POLICY "Service role can insert feedback"
  ON public.account_deletion_feedback
  FOR INSERT
  TO service_role
  WITH CHECK (true);