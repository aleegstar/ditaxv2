-- Fix the trigger function to use 'success' status instead of 'completed'
-- This resolves the tax_returns_status_check constraint violation

CREATE OR REPLACE FUNCTION public.update_tax_return_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the corresponding tax_returns record
  -- Use 'success' status (allowed by constraint) instead of 'completed'
  UPDATE public.tax_returns
  SET 
    status = 'success',
    workflow_step = 'completed',
    updated_at = now()
  WHERE user_id = NEW.user_id 
    AND tax_year = NEW.tax_year;
  
  RETURN NEW;
END;
$function$;