DO $$
DECLARE
  test_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO test_ids
  FROM auth.users
  WHERE email ILIKE 'aikido_%'
     OR email ILIKE '%@ditax.test'
     OR email ILIKE '%pentest%'
     OR email ILIKE '%@auto-pentest.com';

  IF test_ids IS NULL OR array_length(test_ids, 1) = 0 THEN
    RAISE NOTICE 'No pentest users found';
    RETURN;
  END IF;

  -- Audit-Immutability für Pentest-Cleanup temporär aushebeln
  ALTER TABLE public.user_consents DISABLE TRIGGER USER;

  -- Pentest-Consents direkt löschen (Audit-Trail bleibt für echte User unangetastet)
  DELETE FROM public.user_consents WHERE user_id = ANY(test_ids);

  -- Referenzen ohne CASCADE
  DELETE FROM public.security_audit_logs WHERE user_id = ANY(test_ids);
  DELETE FROM public.rate_limits WHERE user_id = ANY(test_ids);
  UPDATE public.security_audit_logs_immutable SET user_id = NULL WHERE user_id = ANY(test_ids);
  UPDATE public.user_feedback SET user_id = NULL WHERE user_id = ANY(test_ids);
  UPDATE public.newsletter_send_log SET user_id = NULL WHERE user_id = ANY(test_ids);
  UPDATE public.admin_action_requests SET approved_by = NULL WHERE approved_by = ANY(test_ids);
  UPDATE public.chat_messages SET handled_by_admin = NULL WHERE handled_by_admin = ANY(test_ids);
  UPDATE public.support_tickets SET assigned_admin_id = NULL WHERE assigned_admin_id = ANY(test_ids);
  DELETE FROM public.admin_notes_internal WHERE created_by = ANY(test_ids);
  DELETE FROM public.document_templates WHERE uploaded_by = ANY(test_ids);
  DELETE FROM public.newsletter_campaigns WHERE sent_by = ANY(test_ids);
  DELETE FROM public.ocr_document_configs WHERE updated_by = ANY(test_ids);
  UPDATE public.ocr_unrecognized_uploads SET resolved_by = NULL WHERE resolved_by = ANY(test_ids);

  DELETE FROM auth.users WHERE id = ANY(test_ids);

  -- Trigger wieder aktivieren
  ALTER TABLE public.user_consents ENABLE TRIGGER USER;

  RAISE NOTICE 'Deleted % pentest users', array_length(test_ids, 1);
END $$;