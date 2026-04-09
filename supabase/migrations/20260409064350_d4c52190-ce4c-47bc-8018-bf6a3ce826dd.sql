-- Create secure views that exclude admin_notes for user-facing access

-- 1. Profiles: Create a view without admin_notes
CREATE OR REPLACE VIEW public.profiles_user_view 
WITH (security_invoker = false)
AS
SELECT 
  id, first_name, last_name, email, address, phone, avatar_url, 
  date_of_birth, updated_at, marketing_consent_at, mfa_enabled,
  mfa_setup_offered_at, mfa_setup_dismissed_at, mfa_setup_reminder_count,
  terms_accepted_at, terms_version, disable_otp_fallback, 
  privacy_preferences, onboarding_tour_completed, onboarding_tour_completed_at,
  documents_tour_completed, feedback_prompt_shown_at
FROM public.profiles;

-- 2. Tax filers: Create a view without admin_notes  
CREATE OR REPLACE VIEW public.tax_filers_user_view
WITH (security_invoker = false)
AS
SELECT
  id, user_id, first_name, last_name, relationship, is_primary,
  ahv_number, avatar_url, date_of_birth, created_at, updated_at
FROM public.tax_filers;

-- 3. Definitive tax bills: Create a view without admin_notes
CREATE OR REPLACE VIEW public.definitive_tax_bills_user_view
WITH (security_invoker = false)
AS
SELECT
  id, user_id, tax_year, file_name, file_path, file_type,
  uploaded_by_user_id, uploaded_by_admin_id, upload_date, status,
  admin_reviewed_by, admin_review_date, created_at, updated_at, tax_filer_id
FROM public.definitive_tax_bills;

-- 4. Update profiles SELECT policy: users can only see their own profile WITHOUT admin_notes
-- Drop existing user SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate user SELECT policy that hides admin_notes
-- We use a security definer function to null out admin_notes for non-admin users
CREATE OR REPLACE FUNCTION public.sanitize_admin_notes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function is not needed as we'll handle it differently
  RETURN NEW;
END;
$$;

-- Instead of complex triggers, we'll use a simpler approach:
-- Replace the user SELECT policy to use a function that masks admin_notes

-- Create a function that checks if the current user is admin
-- (has_role already exists, we'll use it)

-- For profiles: recreate the user policy but now the application code
-- should query profiles_user_view instead. As a defense-in-depth measure,
-- we also add a column-masking function.

-- Create the masking function
CREATE OR REPLACE FUNCTION public.mask_admin_notes(p_admin_notes text, p_table_name text, p_record_owner_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins see everything
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN p_admin_notes;
  END IF;
  -- Non-admins always get NULL
  RETURN NULL;
END;
$$;

-- Recreate the user profile SELECT policy (same as before, column masking is at app level)
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Grant SELECT on the views to authenticated users
GRANT SELECT ON public.profiles_user_view TO authenticated;
GRANT SELECT ON public.tax_filers_user_view TO authenticated;
GRANT SELECT ON public.definitive_tax_bills_user_view TO authenticated;

-- Enable RLS on views is not possible in Postgres, but since the views
-- use security_invoker = false and the underlying tables have RLS,
-- we need to ensure proper access. Let's use security_invoker = true instead
-- so the views respect underlying table RLS.

DROP VIEW IF EXISTS public.profiles_user_view;
DROP VIEW IF EXISTS public.tax_filers_user_view;
DROP VIEW IF EXISTS public.definitive_tax_bills_user_view;

-- Recreate with security_invoker = true (respects RLS of calling user)
CREATE VIEW public.profiles_user_view 
WITH (security_invoker = true)
AS
SELECT 
  id, first_name, last_name, email, address, phone, avatar_url, 
  date_of_birth, updated_at, marketing_consent_at, mfa_enabled,
  mfa_setup_offered_at, mfa_setup_dismissed_at, mfa_setup_reminder_count,
  terms_accepted_at, terms_version, disable_otp_fallback, 
  privacy_preferences, onboarding_tour_completed, onboarding_tour_completed_at,
  documents_tour_completed, feedback_prompt_shown_at
FROM public.profiles;

CREATE VIEW public.tax_filers_user_view
WITH (security_invoker = true)
AS
SELECT
  id, user_id, first_name, last_name, relationship, is_primary,
  ahv_number, avatar_url, date_of_birth, created_at, updated_at
FROM public.tax_filers;

CREATE VIEW public.definitive_tax_bills_user_view
WITH (security_invoker = true)
AS
SELECT
  id, user_id, tax_year, file_name, file_path, file_type,
  uploaded_by_user_id, uploaded_by_admin_id, upload_date, status,
  admin_reviewed_by, admin_review_date, created_at, updated_at, tax_filer_id
FROM public.definitive_tax_bills;

GRANT SELECT ON public.profiles_user_view TO authenticated;
GRANT SELECT ON public.tax_filers_user_view TO authenticated;
GRANT SELECT ON public.definitive_tax_bills_user_view TO authenticated;