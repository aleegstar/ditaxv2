-- Fix search_path for calculate_audit_log_hash function
-- This function was detected as having a mutable search_path

DROP FUNCTION IF EXISTS public.calculate_audit_log_hash(uuid, timestamp with time zone, text, text, text);

CREATE OR REPLACE FUNCTION public.calculate_audit_log_hash(
  p_id uuid, 
  p_created_at timestamp with time zone, 
  p_action text, 
  p_resource text, 
  p_previous_hash text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
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