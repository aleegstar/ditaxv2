-- =====================================================
-- RLS Security Hardening Migration
-- Fixes 3 critical security gaps identified in audit
-- =====================================================

-- 1. Block anonymous access to profiles table
-- Risk: HIGH - Contains PII (emails, phones, addresses, DOB)
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 2. Restrict account_deletion_feedback access to admins only
-- Risk: MEDIUM - Contains deleted user emails
CREATE POLICY "Only admins can view deletion feedback"
ON public.account_deletion_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Restrict user_roles visibility to prevent admin enumeration
-- Risk: MEDIUM - Could allow attackers to identify admin accounts
-- Users can only see their own role, admins can see all
CREATE POLICY "Users can view own role or admins can view all"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin'::public.app_role)
);