-- ============================================================================
-- PHASE 2 SECURITY ENHANCEMENTS
-- ============================================================================
-- 1. Immutable Audit Logs with Blockchain-style Integrity
-- 2. 2-Person Approval System for Critical Admin Actions
-- 3. Field Encryption Infrastructure
-- ============================================================================

-- ============================================================================
-- 1. IMMUTABLE AUDIT LOGS
-- ============================================================================

-- Create immutable audit logs table with hash chain
CREATE TABLE IF NOT EXISTS public.security_audit_logs_immutable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Blockchain-style integrity
  previous_hash TEXT,
  current_hash TEXT
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_immutable_created_at ON public.security_audit_logs_immutable(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_immutable_user_id ON public.security_audit_logs_immutable(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_immutable_action ON public.security_audit_logs_immutable(action);

-- Function to calculate hash for audit log entry
CREATE OR REPLACE FUNCTION public.calculate_audit_log_hash(
  p_id UUID,
  p_created_at TIMESTAMPTZ,
  p_action TEXT,
  p_resource TEXT,
  p_previous_hash TEXT
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(
    digest(
      COALESCE(p_previous_hash, '') || 
      p_id::TEXT || 
      p_created_at::TEXT || 
      p_action || 
      COALESCE(p_resource, ''),
      'sha256'
    ),
    'hex'
  );
END;
$$;

-- Trigger to set hash on insert
CREATE OR REPLACE FUNCTION public.set_audit_log_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_hash TEXT;
BEGIN
  -- Get hash of the last log entry
  SELECT current_hash INTO last_hash
  FROM public.security_audit_logs_immutable
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Set previous hash
  NEW.previous_hash := last_hash;
  
  -- Calculate current hash
  NEW.current_hash := calculate_audit_log_hash(
    NEW.id,
    NEW.created_at,
    NEW.action,
    NEW.resource,
    NEW.previous_hash
  );
  
  RETURN NEW;
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS set_audit_log_hash_trigger ON public.security_audit_logs_immutable;
CREATE TRIGGER set_audit_log_hash_trigger
  BEFORE INSERT ON public.security_audit_logs_immutable
  FOR EACH ROW
  EXECUTE FUNCTION public.set_audit_log_hash();

-- Make audit logs truly immutable (no updates or deletes except by service role)
ALTER TABLE public.security_audit_logs_immutable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are append-only"
  ON public.security_audit_logs_immutable
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Audit logs are read-only for admins"
  ON public.security_audit_logs_immutable
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Prevent updates and deletes (only service_role can delete for cleanup)
CREATE POLICY "No updates allowed"
  ON public.security_audit_logs_immutable
  FOR UPDATE
  USING (false);

CREATE POLICY "Only service role can delete"
  ON public.security_audit_logs_immutable
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. TWO-PERSON APPROVAL SYSTEM
-- ============================================================================

-- Table for admin action requests requiring approval
CREATE TABLE IF NOT EXISTS public.admin_action_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Request details
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'decrypt_documents', 'delete_user', 'modify_roles', etc.
  target_resource TEXT NOT NULL, -- user_id, document_id, etc.
  justification TEXT NOT NULL,
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, executed
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Execution tracking
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired')),
  CONSTRAINT different_approver CHECK (approved_by IS NULL OR approved_by != requested_by)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON public.admin_action_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_requests_requested_by ON public.admin_action_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_admin_requests_created_at ON public.admin_action_requests(created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER update_admin_action_requests_updated_at
  BEFORE UPDATE ON public.admin_action_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.admin_action_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all requests"
  ON public.admin_action_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create requests"
  ON public.admin_action_requests
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) AND
    requested_by = auth.uid()
  );

CREATE POLICY "Admins can approve requests"
  ON public.admin_action_requests
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) AND
    auth.uid() != requested_by
  );

-- Function to request sensitive admin action
CREATE OR REPLACE FUNCTION public.request_admin_action(
  p_action_type TEXT,
  p_target_resource TEXT,
  p_justification TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id UUID;
BEGIN
  -- Verify admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Validate inputs
  IF LENGTH(p_justification) < 10 THEN
    RAISE EXCEPTION 'Justification must be at least 10 characters';
  END IF;
  
  -- Create request
  INSERT INTO public.admin_action_requests (
    requested_by,
    action_type,
    target_resource,
    justification,
    metadata
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_resource,
    p_justification,
    p_metadata
  ) RETURNING id INTO request_id;
  
  -- Log the request
  INSERT INTO public.security_audit_logs_immutable (
    user_id,
    action,
    resource,
    success,
    metadata
  ) VALUES (
    auth.uid(),
    'ADMIN_ACTION_REQUESTED',
    p_action_type || ' - ' || p_target_resource,
    true,
    jsonb_build_object(
      'request_id', request_id,
      'action_type', p_action_type,
      'justification', p_justification
    )
  );
  
  RETURN request_id;
END;
$$;

-- Function to approve admin action request
CREATE OR REPLACE FUNCTION public.approve_admin_action(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record RECORD;
  result JSONB;
BEGIN
  -- Verify admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Get request
  SELECT * INTO request_record
  FROM public.admin_action_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Verify not same person
  IF request_record.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'Cannot approve your own request';
  END IF;
  
  -- Verify status
  IF request_record.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (status: %)', request_record.status;
  END IF;
  
  -- Check if request is not too old (24 hours)
  IF request_record.created_at < NOW() - INTERVAL '24 hours' THEN
    UPDATE public.admin_action_requests
    SET status = 'expired'
    WHERE id = p_request_id;
    
    RAISE EXCEPTION 'Request has expired (>24 hours old)';
  END IF;
  
  -- Approve request
  UPDATE public.admin_action_requests
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = p_request_id;
  
  -- Log approval
  INSERT INTO public.security_audit_logs_immutable (
    user_id,
    action,
    resource,
    success,
    metadata
  ) VALUES (
    auth.uid(),
    'ADMIN_ACTION_APPROVED',
    request_record.action_type || ' - ' || request_record.target_resource,
    true,
    jsonb_build_object(
      'request_id', p_request_id,
      'requested_by', request_record.requested_by,
      'approved_by', auth.uid(),
      'action_type', request_record.action_type
    )
  );
  
  result := jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'action_type', request_record.action_type,
    'target_resource', request_record.target_resource,
    'message', 'Request approved and ready for execution'
  );
  
  RETURN result;
END;
$$;

-- Function to reject admin action request
CREATE OR REPLACE FUNCTION public.reject_admin_action(
  p_request_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Verify admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  -- Get request
  SELECT * INTO request_record
  FROM public.admin_action_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Reject request
  UPDATE public.admin_action_requests
  SET 
    status = 'rejected',
    approved_by = auth.uid(),
    approved_at = NOW(),
    rejection_reason = p_rejection_reason
  WHERE id = p_request_id;
  
  -- Log rejection
  INSERT INTO public.security_audit_logs_immutable (
    user_id,
    action,
    resource,
    success,
    metadata
  ) VALUES (
    auth.uid(),
    'ADMIN_ACTION_REJECTED',
    request_record.action_type || ' - ' || request_record.target_resource,
    true,
    jsonb_build_object(
      'request_id', p_request_id,
      'requested_by', request_record.requested_by,
      'rejected_by', auth.uid(),
      'reason', p_rejection_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Request rejected'
  );
END;
$$;

-- ============================================================================
-- 3. FIELD ENCRYPTION INFRASTRUCTURE
-- ============================================================================

-- Table to store encrypted field keys (DEKs) per user
-- Note: This is prepared for future KMS integration
CREATE TABLE IF NOT EXISTS public.user_field_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL, -- 'ssn', 'bank_account', 'tax_id', etc.
  encrypted_dek TEXT NOT NULL, -- Data Encryption Key, encrypted with KEK/Master Key
  key_version INTEGER NOT NULL DEFAULT 1,
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  
  UNIQUE(user_id, field_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_field_keys_user_id ON public.user_field_encryption_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_field_keys_field_name ON public.user_field_encryption_keys(field_name);

-- RLS
ALTER TABLE public.user_field_encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own field keys"
  ON public.user_field_encryption_keys
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage field keys"
  ON public.user_field_encryption_keys
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add encrypted fields to form_data (for SSN, bank details)
-- These will be stored as encrypted strings, not plaintext
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_data' AND column_name = 'ssn_encrypted'
  ) THEN
    ALTER TABLE public.form_data 
      ADD COLUMN ssn_encrypted TEXT,
      ADD COLUMN ssn_iv TEXT,
      ADD COLUMN bank_details_encrypted TEXT,
      ADD COLUMN bank_details_iv TEXT,
      ADD COLUMN tax_id_encrypted TEXT,
      ADD COLUMN tax_id_iv TEXT;
  END IF;
END $$;

-- ============================================================================
-- 4. CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to expire old pending requests (call via cron)
CREATE OR REPLACE FUNCTION public.expire_old_admin_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.admin_action_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  IF expired_count > 0 THEN
    INSERT INTO public.security_audit_logs_immutable (
      action,
      resource,
      success,
      metadata
    ) VALUES (
      'ADMIN_REQUESTS_EXPIRED',
      'system_maintenance',
      true,
      jsonb_build_object('expired_count', expired_count)
    );
  END IF;
  
  RETURN expired_count;
END;
$$;

-- Function to verify audit log integrity
CREATE OR REPLACE FUNCTION public.verify_audit_log_integrity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_record RECORD;
  prev_hash TEXT := NULL;
  calculated_hash TEXT;
  mismatch_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  -- Only admins can verify
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  
  FOR log_record IN 
    SELECT * FROM public.security_audit_logs_immutable 
    ORDER BY created_at ASC
  LOOP
    total_count := total_count + 1;
    
    -- Verify previous hash matches
    IF log_record.previous_hash IS DISTINCT FROM prev_hash THEN
      mismatch_count := mismatch_count + 1;
    END IF;
    
    -- Verify current hash is correct
    calculated_hash := calculate_audit_log_hash(
      log_record.id,
      log_record.created_at,
      log_record.action,
      log_record.resource,
      log_record.previous_hash
    );
    
    IF log_record.current_hash != calculated_hash THEN
      mismatch_count := mismatch_count + 1;
    END IF;
    
    prev_hash := log_record.current_hash;
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_logs', total_count,
    'mismatches', mismatch_count,
    'integrity_valid', mismatch_count = 0,
    'checked_at', NOW()
  );
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.security_audit_logs_immutable TO authenticated;
GRANT SELECT ON public.admin_action_requests TO authenticated;
GRANT INSERT ON public.security_audit_logs_immutable TO authenticated;

COMMENT ON TABLE public.security_audit_logs_immutable IS 'Immutable audit logs with blockchain-style hash chain for tamper detection';
COMMENT ON TABLE public.admin_action_requests IS 'Two-person approval system for critical admin actions';
COMMENT ON TABLE public.user_field_encryption_keys IS 'Field-level encryption keys for sensitive data (SSN, bank details)';
