DO $$
DECLARE
  v_ids uuid[];
  v_admin uuid := '604af39e-79eb-4921-89e4-23ffffc39ff9'; -- sandrograber.ch@gmail.com
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM auth.users
  WHERE (last_sign_in_at IS NULL OR last_sign_in_at < NOW() - INTERVAL '10 days')
    AND id <> v_admin;

  -- Reassign NOT NULL admin references to active admin
  UPDATE public.document_templates       SET uploaded_by      = v_admin WHERE uploaded_by      = ANY(v_ids);

  -- Null out nullable admin/audit references
  UPDATE public.admin_notes_internal     SET created_by       = NULL    WHERE created_by       = ANY(v_ids);
  UPDATE public.chat_messages            SET handled_by_admin = NULL    WHERE handled_by_admin = ANY(v_ids);
  UPDATE public.newsletter_campaigns     SET sent_by          = NULL    WHERE sent_by          = ANY(v_ids);
  UPDATE public.ocr_document_configs     SET updated_by       = NULL    WHERE updated_by       = ANY(v_ids);
  UPDATE public.ocr_unrecognized_uploads SET resolved_by      = NULL    WHERE resolved_by      = ANY(v_ids);
  UPDATE public.support_tickets          SET assigned_admin_id= NULL    WHERE assigned_admin_id= ANY(v_ids);

  -- Delete rows with NOT NULL FK and no cascade
  DELETE FROM public.rate_limits         WHERE user_id = ANY(v_ids);
  DELETE FROM public.security_audit_logs WHERE user_id = ANY(v_ids);

  DELETE FROM auth.users WHERE id = ANY(v_ids);

  RAISE NOTICE 'Deleted % users', array_length(v_ids, 1);
END $$;