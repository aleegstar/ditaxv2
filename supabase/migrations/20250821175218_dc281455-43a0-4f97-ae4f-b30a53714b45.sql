
-- Fix mutable search_path security warnings for all affected functions
-- This prevents schema injection attacks in SECURITY DEFINER functions

ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

ALTER FUNCTION public.delete_tax_year_data(uuid, text) SET search_path = '';

ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = '';

ALTER FUNCTION public.verify_admin_role() SET search_path = '';

ALTER FUNCTION public.track_user_session() SET search_path = '';

ALTER FUNCTION public.get_current_user_role() SET search_path = '';

ALTER FUNCTION public.update_form_progress_updated_at() SET search_path = '';

ALTER FUNCTION public.prevent_role_escalation() SET search_path = '';

ALTER FUNCTION public.verify_admin_access(text) SET search_path = '';

ALTER FUNCTION public.validate_user_session() SET search_path = '';

ALTER FUNCTION public.get_all_profiles_for_admin() SET search_path = '';

ALTER FUNCTION public.get_single_profile_for_admin(uuid) SET search_path = '';
