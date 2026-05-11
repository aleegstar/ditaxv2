-- 1) Private quarantine bucket for the malware scanner
INSERT INTO storage.buckets (id, name, public)
VALUES ('quarantine', 'quarantine', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Admin-only access to quarantine bucket
DROP POLICY IF EXISTS "quarantine_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "quarantine_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "quarantine_admin_delete" ON storage.objects;

CREATE POLICY "quarantine_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'quarantine' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "quarantine_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quarantine' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "quarantine_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quarantine' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Revoke anon SELECT on sensitive tables (defense-in-depth on top of RLS)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles','tax_returns','uploaded_documents','completed_tax_returns',
    'definitive_tax_bills','chat_messages','chat_attachments','support_tickets',
    'missing_item_requests','user_notifications','user_passkeys','user_roles',
    'security_audit_logs','form_data','form_progress','form_chat_history',
    'tax_filers','user_sessions','rate_limits','admin_action_requests',
    'profile_access_logs','security_audit_logs_immutable'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;