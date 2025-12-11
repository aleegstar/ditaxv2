-- Phase 1: Optimize Auth RLS Initialization Plan
-- Wrap all auth.uid() and auth.role() calls in subqueries for better performance
-- This prevents re-evaluation of auth functions for each row

-- ============================================================================
-- PAYMENT_EVENTS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all payment events" ON payment_events;
DROP POLICY IF EXISTS "Users can view their own payment events" ON payment_events;
DROP POLICY IF EXISTS "Service role can insert payment events" ON payment_events;

CREATE POLICY "Admins can view all payment events"
  ON payment_events FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can view their own payment events"
  ON payment_events FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can insert payment events"
  ON payment_events FOR INSERT
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.jwt() ->> 'iss'::text) = 'supabase'::text));

-- ============================================================================
-- EMAIL_NOTIFICATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all email notifications" ON email_notifications;
DROP POLICY IF EXISTS "Service role can insert email notifications" ON email_notifications;

CREATE POLICY "Admins can view all email notifications"
  ON email_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Service role can insert email notifications"
  ON email_notifications FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- ============================================================================
-- FORM_CHAT_HISTORY
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete their own chat history" ON form_chat_history;
DROP POLICY IF EXISTS "Users can insert their own chat history" ON form_chat_history;
DROP POLICY IF EXISTS "Users can update their own chat history" ON form_chat_history;
DROP POLICY IF EXISTS "Users can view their own chat history" ON form_chat_history;

CREATE POLICY "Users can delete their own chat history"
  ON form_chat_history FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own chat history"
  ON form_chat_history FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own chat history"
  ON form_chat_history FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own chat history"
  ON form_chat_history FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- DOCUMENT_TEMPLATES
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete document templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can insert document templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can update document templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can view all document templates" ON document_templates;

CREATE POLICY "Admins can delete document templates"
  ON document_templates FOR DELETE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can insert document templates"
  ON document_templates FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) AND (SELECT auth.uid()) = uploaded_by);

CREATE POLICY "Admins can update document templates"
  ON document_templates FOR UPDATE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can view all document templates"
  ON document_templates FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ============================================================================
-- TICKET_MESSAGES
-- ============================================================================
DROP POLICY IF EXISTS "Admins can create messages for all tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON ticket_messages;

CREATE POLICY "Admins can create messages for all tickets"
  ON ticket_messages FOR INSERT
  WITH CHECK ((EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  )) AND (SELECT auth.uid()) = sender_id);

CREATE POLICY "Admins can view all ticket messages"
  ON ticket_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Users can create messages for their tickets"
  ON ticket_messages FOR INSERT
  WITH CHECK ((EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = ticket_messages.ticket_id
    AND support_tickets.user_id = (SELECT auth.uid())
  )) AND (SELECT auth.uid()) = sender_id);

CREATE POLICY "Users can view messages from their tickets"
  ON ticket_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = ticket_messages.ticket_id
    AND support_tickets.user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- CHAT_ATTACHMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert their own attachments" ON chat_attachments;
DROP POLICY IF EXISTS "Users can view attachments for accessible messages" ON chat_attachments;
DROP POLICY IF EXISTS "chat_attachments_insert_policy" ON chat_attachments;
DROP POLICY IF EXISTS "chat_attachments_select_policy" ON chat_attachments;

CREATE POLICY "Users can insert their own attachments"
  ON chat_attachments FOR INSERT
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

CREATE POLICY "Users can view attachments for accessible messages"
  ON chat_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_messages
    WHERE chat_messages.id = chat_attachments.message_id
    AND (
      chat_messages.sender_id = (SELECT auth.uid())
      OR chat_messages.recipient_id = (SELECT auth.uid())
      OR (chat_messages.recipient_id IS NULL AND get_current_user_role() = 'admin'::app_role)
    )
  ));

CREATE POLICY "chat_attachments_insert_policy"
  ON chat_attachments FOR INSERT
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

CREATE POLICY "chat_attachments_select_policy"
  ON chat_attachments FOR SELECT
  USING (
    (uploaded_by = (SELECT auth.uid()))
    OR (EXISTS (
      SELECT 1 FROM chat_messages
      WHERE chat_messages.attachment_id = chat_attachments.id
      AND (
        chat_messages.sender_id = (SELECT auth.uid())
        OR chat_messages.recipient_id = (SELECT auth.uid())
        OR chat_messages.recipient_id IS NULL
      )
    ))
    OR (EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'admin'::app_role
    ))
  );

-- ============================================================================
-- FORM_PROGRESS
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete their own form progress" ON form_progress;
DROP POLICY IF EXISTS "Users can insert their own form progress" ON form_progress;
DROP POLICY IF EXISTS "Users can update their own form progress" ON form_progress;
DROP POLICY IF EXISTS "Users can view their own form progress" ON form_progress;

CREATE POLICY "Users can delete their own form progress"
  ON form_progress FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own form progress"
  ON form_progress FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own form progress"
  ON form_progress FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own form progress"
  ON form_progress FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- RATE_LIMITS
-- ============================================================================
DROP POLICY IF EXISTS "Only service role can delete rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Only service role can insert rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Only service role can update rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Service role and admins can view rate limits" ON rate_limits;

CREATE POLICY "Only service role can delete rate limits"
  ON rate_limits FOR DELETE
  USING (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.jwt() ->> 'iss'::text) = 'supabase'::text));

CREATE POLICY "Only service role can insert rate limits"
  ON rate_limits FOR INSERT
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.jwt() ->> 'iss'::text) = 'supabase'::text));

CREATE POLICY "Only service role can update rate limits"
  ON rate_limits FOR UPDATE
  USING (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.jwt() ->> 'iss'::text) = 'supabase'::text))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.jwt() ->> 'iss'::text) = 'supabase'::text));

CREATE POLICY "Service role and admins can view rate limits"
  ON rate_limits FOR SELECT
  USING (
    ((SELECT auth.role()) = 'service_role'::text)
    OR ((SELECT auth.jwt() ->> 'iss'::text) = 'supabase'::text)
    OR has_role((SELECT auth.uid()), 'admin'::app_role)
  );

-- ============================================================================
-- USER_NOTIFICATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Service role can create notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;

CREATE POLICY "Service role can create notifications"
  ON user_notifications FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- SECURITY_AUDIT_LOGS_IMMUTABLE
-- ============================================================================
DROP POLICY IF EXISTS "Audit logs are read-only for admins" ON security_audit_logs_immutable;
DROP POLICY IF EXISTS "Only service role can delete" ON security_audit_logs_immutable;

CREATE POLICY "Audit logs are read-only for admins"
  ON security_audit_logs_immutable FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Only service role can delete"
  ON security_audit_logs_immutable FOR DELETE
  USING ((SELECT auth.role()) = 'service_role'::text);

-- ============================================================================
-- USER_PASSKEYS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all passkeys" ON user_passkeys;
DROP POLICY IF EXISTS "Users can create their own passkeys" ON user_passkeys;
DROP POLICY IF EXISTS "Users can delete their own passkeys" ON user_passkeys;
DROP POLICY IF EXISTS "Users can update their own passkeys" ON user_passkeys;
DROP POLICY IF EXISTS "Users can view their own passkeys" ON user_passkeys;

CREATE POLICY "Admins can view all passkeys"
  ON user_passkeys FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Users can create their own passkeys"
  ON user_passkeys FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own passkeys"
  ON user_passkeys FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own passkeys"
  ON user_passkeys FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own passkeys"
  ON user_passkeys FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- PROFILE_ACCESS_LOGS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all profile access logs" ON profile_access_logs;
DROP POLICY IF EXISTS "Service role can insert access logs" ON profile_access_logs;

CREATE POLICY "Admins can view all profile access logs"
  ON profile_access_logs FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Service role can insert access logs"
  ON profile_access_logs FOR INSERT
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.jwt() ->> 'iss'::text) = 'supabase'::text));

-- ============================================================================
-- DEFINITIVE_TAX_BILLS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete definitive tax bills" ON definitive_tax_bills;
DROP POLICY IF EXISTS "Admins can insert definitive tax bills for users" ON definitive_tax_bills;
DROP POLICY IF EXISTS "Admins can update all definitive tax bills" ON definitive_tax_bills;
DROP POLICY IF EXISTS "Admins can view all definitive tax bills" ON definitive_tax_bills;
DROP POLICY IF EXISTS "Users can insert their own definitive tax bills" ON definitive_tax_bills;
DROP POLICY IF EXISTS "Users can view their own definitive tax bills" ON definitive_tax_bills;

CREATE POLICY "Admins can delete definitive tax bills"
  ON definitive_tax_bills FOR DELETE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can insert definitive tax bills for users"
  ON definitive_tax_bills FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) AND (SELECT auth.uid()) = uploaded_by_admin_id);

CREATE POLICY "Admins can update all definitive tax bills"
  ON definitive_tax_bills FOR UPDATE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can view all definitive tax bills"
  ON definitive_tax_bills FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can insert their own definitive tax bills"
  ON definitive_tax_bills FOR INSERT
  WITH CHECK (((SELECT auth.uid()) = user_id) AND ((SELECT auth.uid()) = uploaded_by_user_id));

CREATE POLICY "Users can view their own definitive tax bills"
  ON definitive_tax_bills FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- FORM_DATA
-- ============================================================================
DROP POLICY IF EXISTS "Admins can access all form data" ON form_data;
DROP POLICY IF EXISTS "Users can delete own form data" ON form_data;
DROP POLICY IF EXISTS "Users can insert own form data" ON form_data;
DROP POLICY IF EXISTS "Users can read own form data" ON form_data;
DROP POLICY IF EXISTS "Users can update own form data" ON form_data;

CREATE POLICY "Admins can access all form data"
  ON form_data FOR ALL
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can delete own form data"
  ON form_data FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own form data"
  ON form_data FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can read own form data"
  ON form_data FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own form data"
  ON form_data FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- ASSET_DATA
-- ============================================================================
DROP POLICY IF EXISTS "Admins can insert asset data" ON asset_data;
DROP POLICY IF EXISTS "Admins can update asset data" ON asset_data;
DROP POLICY IF EXISTS "Admins can view all asset data" ON asset_data;

CREATE POLICY "Admins can insert asset data"
  ON asset_data FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can update asset data"
  ON asset_data FOR UPDATE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can view all asset data"
  ON asset_data FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ============================================================================
-- SUPPORT_TICKETS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;

CREATE POLICY "Admins can update all tickets"
  ON support_tickets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Users can create their own tickets"
  ON support_tickets FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own tickets"
  ON support_tickets FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- SECURITY_AUDIT_LOGS
-- ============================================================================
DROP POLICY IF EXISTS "Service role and edge functions can insert audit logs" ON security_audit_logs;

CREATE POLICY "Service role and edge functions can insert audit logs"
  ON security_audit_logs FOR INSERT
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR ((SELECT auth.jwt() ->> 'iss'::text) = 'supabase'::text));

-- ============================================================================
-- USER_ENCRYPTION_KEYS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all encryption keys" ON user_encryption_keys;
DROP POLICY IF EXISTS "Users can insert their own encryption keys" ON user_encryption_keys;
DROP POLICY IF EXISTS "Users can view their own encryption keys" ON user_encryption_keys;

CREATE POLICY "Admins can view all encryption keys"
  ON user_encryption_keys FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can insert their own encryption keys"
  ON user_encryption_keys FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own encryption keys"
  ON user_encryption_keys FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- UPLOADED_DOCUMENTS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can upload documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can view their own active documents" ON uploaded_documents;

CREATE POLICY "Admins can upload documents"
  ON uploaded_documents FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can view all documents"
  ON uploaded_documents FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can delete their own documents"
  ON uploaded_documents FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own documents"
  ON uploaded_documents FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own documents"
  ON uploaded_documents FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own active documents"
  ON uploaded_documents FOR SELECT
  USING (((SELECT auth.uid()) = user_id) AND (status = 'active'::text));

-- ============================================================================
-- CHAT_MESSAGES
-- ============================================================================
DROP POLICY IF EXISTS "Admins can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can update pool messages" ON chat_messages;
DROP POLICY IF EXISTS "Strict message access policy" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to admins or recipients" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their messages" ON chat_messages;

CREATE POLICY "Admins can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can update pool messages"
  ON chat_messages FOR UPDATE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) AND ((recipient_id IS NULL) OR (recipient_id = (SELECT auth.uid()))))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) AND ((recipient_id IS NULL) OR (recipient_id = (SELECT auth.uid()))));

CREATE POLICY "Strict message access policy"
  ON chat_messages FOR SELECT
  USING (
    ((SELECT auth.uid()) = sender_id)
    OR ((SELECT auth.uid()) = recipient_id)
    OR has_role((SELECT auth.uid()), 'admin'::app_role)
  );

CREATE POLICY "Users can insert their own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Users can mark messages as read"
  ON chat_messages FOR UPDATE
  USING ((SELECT auth.uid()) = recipient_id)
  WITH CHECK ((SELECT auth.uid()) = recipient_id);

CREATE POLICY "Users can send messages to admins or recipients"
  ON chat_messages FOR INSERT
  WITH CHECK (
    (sender_id = (SELECT auth.uid()))
    AND (
      (recipient_id IS NULL)
      OR (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = chat_messages.recipient_id
        AND user_roles.role = 'admin'::app_role
      ))
    )
  );

CREATE POLICY "Users can update their messages"
  ON chat_messages FOR UPDATE
  USING ((SELECT auth.uid()) = sender_id);

-- ============================================================================
-- DEDUCTION_DATA
-- ============================================================================
DROP POLICY IF EXISTS "Admins can insert deduction data" ON deduction_data;
DROP POLICY IF EXISTS "Admins can update deduction data" ON deduction_data;
DROP POLICY IF EXISTS "Admins can view all deduction data" ON deduction_data;

CREATE POLICY "Admins can insert deduction data"
  ON deduction_data FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can update deduction data"
  ON deduction_data FOR UPDATE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can view all deduction data"
  ON deduction_data FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ============================================================================
-- INCOME_DATA
-- ============================================================================
DROP POLICY IF EXISTS "Admins can insert income data" ON income_data;
DROP POLICY IF EXISTS "Admins can update income data" ON income_data;
DROP POLICY IF EXISTS "Admins can view all income data" ON income_data;

CREATE POLICY "Admins can insert income data"
  ON income_data FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can update income data"
  ON income_data FOR UPDATE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can view all income data"
  ON income_data FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ============================================================================
-- USER_ROLES
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can modify roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Only admins can assign roles"
  ON user_roles FOR INSERT
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Only admins can modify roles"
  ON user_roles FOR UPDATE
  USING (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (((SELECT auth.role()) = 'service_role'::text) OR has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- USER_FIELD_ENCRYPTION_KEYS
-- ============================================================================
DROP POLICY IF EXISTS "Service role can manage field keys" ON user_field_encryption_keys;
DROP POLICY IF EXISTS "Users can view own field keys" ON user_field_encryption_keys;

CREATE POLICY "Service role can manage field keys"
  ON user_field_encryption_keys FOR ALL
  USING ((SELECT auth.role()) = 'service_role'::text);

CREATE POLICY "Users can view own field keys"
  ON user_field_encryption_keys FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- ADMIN_ACTION_REQUESTS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can approve requests" ON admin_action_requests;
DROP POLICY IF EXISTS "Admins can create requests" ON admin_action_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON admin_action_requests;

CREATE POLICY "Admins can approve requests"
  ON admin_action_requests FOR UPDATE
  USING (has_role((SELECT auth.uid()), 'admin'::app_role) AND ((SELECT auth.uid()) <> requested_by));

CREATE POLICY "Admins can create requests"
  ON admin_action_requests FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role) AND (requested_by = (SELECT auth.uid())));

CREATE POLICY "Admins can view all requests"
  ON admin_action_requests FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- ============================================================================
-- USER_CONSENTS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all consents" ON user_consents;
DROP POLICY IF EXISTS "Users can insert their own consents" ON user_consents;
DROP POLICY IF EXISTS "Users can view their own consents" ON user_consents;

CREATE POLICY "Admins can view all consents"
  ON user_consents FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Users can insert their own consents"
  ON user_consents FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view their own consents"
  ON user_consents FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- ADMIN_ACCESS_LOGS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can insert access logs" ON admin_access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON admin_access_logs;
DROP POLICY IF EXISTS "Only service role can delete logs" ON admin_access_logs;
DROP POLICY IF EXISTS "Users can view logs where they are the accessed user" ON admin_access_logs;

CREATE POLICY "Admins can insert access logs"
  ON admin_access_logs FOR INSERT
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Admins can view all access logs"
  ON admin_access_logs FOR SELECT
  USING (has_role((SELECT auth.uid()), 'admin'::app_role));

CREATE POLICY "Only service role can delete logs"
  ON admin_access_logs FOR DELETE
  USING ((SELECT auth.role()) = 'service_role'::text);

CREATE POLICY "Users can view logs where they are the accessed user"
  ON admin_access_logs FOR SELECT
  USING ((SELECT auth.uid()) = accessed_user_id);

-- ============================================================================
-- COMPLETED_TAX_RETURNS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can delete completed tax returns" ON completed_tax_returns;
DROP POLICY IF EXISTS "Admins can insert completed tax returns" ON completed_tax_returns;
DROP POLICY IF EXISTS "Admins can update completed tax returns" ON completed_tax_returns;
DROP POLICY IF EXISTS "Users can view their own completed tax returns" ON completed_tax_returns;

CREATE POLICY "Admins can delete completed tax returns"
  ON completed_tax_returns FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Admins can insert completed tax returns"
  ON completed_tax_returns FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Admins can update completed tax returns"
  ON completed_tax_returns FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Users can view their own completed tax returns"
  ON completed_tax_returns FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- TAX_RETURNS
-- ============================================================================
DROP POLICY IF EXISTS "Admins can insert tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Admins can update all tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Admins can view all tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Users can create own tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Users can delete own tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Users can update own tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Users can view own tax returns" ON tax_returns;

CREATE POLICY "Admins can insert tax returns"
  ON tax_returns FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Admins can update all tax returns"
  ON tax_returns FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Admins can view all tax returns"
  ON tax_returns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
    AND user_roles.role = 'admin'::app_role
  ));

CREATE POLICY "Users can create own tax returns"
  ON tax_returns FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own tax returns"
  ON tax_returns FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own tax returns"
  ON tax_returns FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own tax returns"
  ON tax_returns FOR SELECT
  USING ((SELECT auth.uid()) = user_id);