-- CRITICAL SECURITY FIXES
-- Phase 1: Fix Rate Limiting Bypass and User Roles Management

-- 1. Fix Rate Limits Table Security
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "System can update rate limits" ON public.rate_limits;

-- Create restrictive rate limits policies
CREATE POLICY "Service role can update rate limits" ON public.rate_limits
  FOR UPDATE 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Secure User Roles Management  
-- Add missing INSERT policy to prevent unauthorized role creation
CREATE POLICY "Only admins can assign roles" ON public.user_roles
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Add missing UPDATE policy to prevent role modifications
CREATE POLICY "Only admins can modify roles" ON public.user_roles
  FOR UPDATE 
  USING (
    auth.role() = 'service_role' OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    auth.role() = 'service_role' OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Restrict System Operations
-- Drop overly permissive notification policy
DROP POLICY IF EXISTS "System can create notifications" ON public.user_notifications;

-- Create restrictive notification policy - only service role or through triggers
CREATE POLICY "Service role can create notifications" ON public.user_notifications
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- 4. Secure User Sessions
-- Drop overly permissive session insert policy  
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_sessions;

-- Create restrictive session policy - users can only create their own sessions
CREATE POLICY "Users can create their own sessions" ON public.user_sessions
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.uid() = user_id
  );

-- 5. Additional Security: Prevent direct role escalation at database level
-- Create additional constraint to prevent self-role assignment for admin role
CREATE OR REPLACE FUNCTION public.prevent_admin_self_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from giving themselves admin role directly
  IF NEW.role = 'admin'::app_role AND NEW.user_id = auth.uid() AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Users cannot assign admin role to themselves'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the trigger to user_roles table
DROP TRIGGER IF EXISTS prevent_admin_self_assignment_trigger ON public.user_roles;
CREATE TRIGGER prevent_admin_self_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_self_assignment();

-- 6. Audit logging for security events
-- Ensure security audit logs can only be inserted by service role or edge functions
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_logs;
CREATE POLICY "Service role and edge functions can insert audit logs" ON public.security_audit_logs
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.jwt() ->> 'iss' = 'supabase'
  );

-- 7. Tighten email notifications security
DROP POLICY IF EXISTS "System can insert email notifications" ON public.email_notifications;
CREATE POLICY "Service role can insert email notifications" ON public.email_notifications
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');