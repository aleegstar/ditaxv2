-- Function to update tax_returns when completed tax return is uploaded
CREATE OR REPLACE FUNCTION public.update_tax_return_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the corresponding tax_returns record
  UPDATE public.tax_returns
  SET 
    status = 'completed',
    workflow_step = 'completed',
    updated_at = now()
  WHERE user_id = NEW.user_id 
    AND tax_year = NEW.tax_year;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after insert on completed_tax_returns
CREATE TRIGGER on_completed_tax_return_uploaded
  AFTER INSERT ON public.completed_tax_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tax_return_on_completion();