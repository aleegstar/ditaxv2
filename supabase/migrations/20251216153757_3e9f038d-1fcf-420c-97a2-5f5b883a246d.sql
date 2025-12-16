-- 1. RLS-Policies für ticket_messages Tabelle
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages for tickets they own
CREATE POLICY "Users can view their ticket messages"
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_messages.ticket_id
    AND st.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can insert messages for their own tickets
CREATE POLICY "Users can insert messages for their tickets"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
      AND st.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
ON public.ticket_messages
FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- 2. RLS-Policies für user_field_encryption_keys Tabelle
ALTER TABLE public.user_field_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own encryption keys
CREATE POLICY "Users can view their own field encryption keys"
ON public.user_field_encryption_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own encryption keys
CREATE POLICY "Users can insert their own field encryption keys"
ON public.user_field_encryption_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own encryption keys
CREATE POLICY "Users can update their own field encryption keys"
ON public.user_field_encryption_keys
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only service role can delete encryption keys
CREATE POLICY "Service role can delete field encryption keys"
ON public.user_field_encryption_keys
FOR DELETE
USING (auth.role() = 'service_role');

-- Admins can view all encryption keys (for support purposes)
CREATE POLICY "Admins can view all field encryption keys"
ON public.user_field_encryption_keys
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. SELECT-Policy für user_passkeys hinzufügen
CREATE POLICY "Users can view their own passkeys"
ON public.user_passkeys
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all passkeys
CREATE POLICY "Admins can view all passkeys"
ON public.user_passkeys
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Zusätzliche fehlende Policies

-- user_consents: Users can view their own consents
CREATE POLICY "Users can view their own consents"
ON public.user_consents
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all consents
CREATE POLICY "Admins can view all consents"
ON public.user_consents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));