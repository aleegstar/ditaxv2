-- Enhanced security for profiles table with PII protection

-- Create audit logging for profile access
CREATE TABLE IF NOT EXISTS public.profile_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_profile_id UUID NOT NULL,
  accessed_by_user_id UUID NOT NULL,
  access_type TEXT NOT NULL, -- 'view', 'update', 'admin_view'
  accessed_fields TEXT[], -- track which fields were accessed
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view access logs
CREATE POLICY "Admins can view all profile access logs"
ON public.profile_access_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert access logs
CREATE POLICY "Service role can insert access logs"
ON public.profile_access_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR (auth.jwt() ->> 'iss') = 'supabase');

-- Create a secure function to get masked profile data for admins
-- This provides data masking for sensitive fields unless explicitly needed
CREATE OR REPLACE FUNCTION public.get_profile_with_access_log(
  p_profile_id UUID,
  p_include_sensitive_fields BOOLEAN DEFAULT false
)
RETURNS TABLE(
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  admin_notes TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  is_own_profile BOOLEAN;
  accessed_fields TEXT[];
BEGIN
  -- Check if user is admin
  is_admin := has_role(auth.uid(), 'admin'::app_role);
  is_own_profile := (auth.uid() = p_profile_id);
  
  -- Only admins or the profile owner can access
  IF NOT (is_admin OR is_own_profile) THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;
  
  -- Track which fields are being accessed
  accessed_fields := ARRAY['id', 'first_name', 'last_name', 'avatar_url', 'updated_at'];
  
  IF p_include_sensitive_fields THEN
    accessed_fields := accessed_fields || ARRAY['email', 'phone', 'address', 'date_of_birth', 'admin_notes'];
  END IF;
  
  -- Log the access
  INSERT INTO public.profile_access_logs (
    accessed_profile_id,
    accessed_by_user_id,
    access_type,
    accessed_fields
  ) VALUES (
    p_profile_id,
    auth.uid(),
    CASE 
      WHEN is_admin AND p_include_sensitive_fields THEN 'admin_view_full'
      WHEN is_admin THEN 'admin_view_basic'
      ELSE 'user_view_own'
    END,
    accessed_fields
  );
  
  -- Return profile data with conditional masking
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    CASE 
      WHEN p_include_sensitive_fields OR is_own_profile THEN p.email
      ELSE SUBSTRING(p.email FROM 1 FOR 2) || '***@' || SUBSTRING(p.email FROM POSITION('@' IN p.email) + 1)
    END AS email,
    CASE 
      WHEN p_include_sensitive_fields OR is_own_profile THEN p.phone
      ELSE '***' || RIGHT(p.phone, 4)
    END AS phone,
    CASE 
      WHEN p_include_sensitive_fields OR is_own_profile THEN p.address
      ELSE '*** (masked)'
    END AS address,
    CASE 
      WHEN p_include_sensitive_fields OR is_own_profile THEN p.date_of_birth
      ELSE NULL
    END AS date_of_birth,
    CASE 
      WHEN is_admin AND p_include_sensitive_fields THEN p.admin_notes
      ELSE NULL
    END AS admin_notes,
    p.avatar_url,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = p_profile_id;
END;
$$;

-- Create function to detect suspicious profile access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_profile_access()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suspicious_count INTEGER;
  admin_user_id UUID;
BEGIN
  -- Check for excessive profile access by a single admin in short time
  SELECT accessed_by_user_id, COUNT(*) INTO admin_user_id, suspicious_count
  FROM public.profile_access_logs
  WHERE access_type LIKE 'admin_view%'
    AND created_at > NOW() - INTERVAL '5 minutes'
  GROUP BY accessed_by_user_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  IF suspicious_count >= 50 THEN
    INSERT INTO public.security_audit_logs (
      user_id,
      action,
      success,
      resource,
      error_message
    ) VALUES (
      admin_user_id,
      'SUSPICIOUS_PROFILE_ACCESS_PATTERN',
      false,
      'profiles',
      format('Excessive profile access detected: %s profiles accessed in 5 minutes', suspicious_count)
    );
  END IF;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE public.profile_access_logs IS 'Audit log for all profile data access. Used to detect unauthorized or suspicious access patterns to customer PII.';
COMMENT ON FUNCTION public.get_profile_with_access_log IS 'Securely retrieves profile data with automatic access logging and optional field masking for sensitive PII. Use p_include_sensitive_fields=true only when necessary.';
COMMENT ON FUNCTION public.detect_suspicious_profile_access IS 'Monitors profile access patterns and raises security alerts for potential data exfiltration attempts.';
