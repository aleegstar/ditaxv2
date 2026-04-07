
-- 1. Fix immutable audit logs: remove permissive insert policy, restrict to service_role
DROP POLICY IF EXISTS "Audit logs are append-only" ON public.security_audit_logs_immutable;
CREATE POLICY "Service role can insert immutable audit logs"
  ON public.security_audit_logs_immutable
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Fix regular audit logs: remove permissive authenticated insert, restrict to service_role
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.security_audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.security_audit_logs;
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.security_audit_logs;
CREATE POLICY "Service role can insert audit logs"
  ON public.security_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. Fix overly permissive ticket-attachments storage policy
DROP POLICY IF EXISTS "ticket_attachments_insert_policy" ON storage.objects;
