-- ============================================================================
-- AIKIDO PENTEST PREP — Phase 4: Lock down anon + SECURITY DEFINER exposure
-- ============================================================================
-- 1) Revoke ALL anon access on public schema (no public-facing tables exist;
--    docs/legal content lives in src/, so anon never needs DB SELECT).
-- 2) Revoke EXECUTE from anon on all public functions.
-- 3) Explicitly revoke EXECUTE from `authenticated` on admin-only SECURITY
--    DEFINER functions to satisfy lint 0029 and prevent any signed-in
--    misuse.
-- ----------------------------------------------------------------------------

-- 1. Tables / sequences: kill anon entirely
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Make sure future tables don't grant anon either
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- 2. Admin-only SECURITY DEFINER functions — revoke from authenticated.
--    They are invoked exclusively from edge functions running with the
--    service_role, never directly by signed-in users.
REVOKE EXECUTE ON FUNCTION public.approve_admin_action(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_data_retention_policies() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_security_hardening() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_admin_role_by_email(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_auth_user_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_user_completely(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_all_profiles_for_admin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_single_profile_for_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_data() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_security_logs() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_security_anomalies() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_suspicious_profile_access() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_old_admin_requests() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_admin_operation_secure(text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_stripe_event(text, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_stripe_event_processed(text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_stripe_event_failed(text, text) FROM authenticated;

-- 3. Re-grant anon access ONLY where explicitly required.
--    Currently: none. The frontend's anon key is used solely for
--    `supabase.auth.*` flows and edge-function invocations, both of which
--    work without table-level grants.
--
--    If a future feature needs unauthenticated SELECT, add an explicit
--    `GRANT SELECT ON public.<table> TO anon;` here with a comment.

-- 4. Defensive: ensure service_role still has full access to everything
--    (it always should, but reaffirm after the bulk revoke).
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;