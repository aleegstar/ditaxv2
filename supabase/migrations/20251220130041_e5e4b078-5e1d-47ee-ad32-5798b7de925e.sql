-- Fix search_path for get_storage_policies function to prevent schema injection attacks
-- This function was missed in the previous security hardening migration

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_storage_policies(TEXT);

-- Recreate with proper search_path = '' (empty string for security)
CREATE OR REPLACE FUNCTION public.get_storage_policies(p_bucket_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result JSON;
BEGIN
    -- Use fully schema-qualified references for security
    SELECT json_agg(row_to_json(p))
    INTO result
    FROM storage.objects p
    WHERE p.bucket_id = p_bucket_id
    LIMIT 10;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Also fix any other SECURITY DEFINER functions that may have mutable search_path
-- Check and fix set_retention_date function
CREATE OR REPLACE FUNCTION public.set_retention_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.processing_stage = 'processed' AND NEW.retention_until IS NULL THEN
    NEW.retention_until := NEW.processed_at + INTERVAL '90 days';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;