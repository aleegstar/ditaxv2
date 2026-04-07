-- Remove the permissive policy that allows any authenticated user to insert audit logs
DROP POLICY IF EXISTS "Service role and edge functions can insert audit logs" ON public.security_audit_logs;