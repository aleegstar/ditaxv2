-- Add explicit DENY policies for admin_access_logs to enforce append-only behavior
-- This makes security intent crystal clear and prevents accidental modifications

-- Explicitly prevent updates to maintain audit integrity
CREATE POLICY "No updates to access logs"
  ON admin_access_logs FOR UPDATE
  USING (false);

-- Explicitly prevent deletions (only service role for maintenance/cleanup)
CREATE POLICY "Only service role can delete logs"
  ON admin_access_logs FOR DELETE
  USING (auth.role() = 'service_role');
