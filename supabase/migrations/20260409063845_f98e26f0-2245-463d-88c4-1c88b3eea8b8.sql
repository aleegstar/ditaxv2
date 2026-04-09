-- Fix 1: Drop the overly permissive immutable audit log INSERT policy
-- The "Service role can insert immutable audit logs" policy already exists and is correct
DROP POLICY IF EXISTS "Audit logs are append-only" ON public.security_audit_logs_immutable;

-- Fix 2: Drop overly permissive ticket-attachments storage INSERT policy
DROP POLICY IF EXISTS "ticket_attachments_insert_policy" ON storage.objects;