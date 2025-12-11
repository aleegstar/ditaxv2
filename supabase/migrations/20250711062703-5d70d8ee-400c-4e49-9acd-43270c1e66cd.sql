
-- First, let's add the payment columns to profiles table if they don't exist
-- (Skip if they already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'payment_status') THEN
        ALTER TABLE public.profiles ADD COLUMN payment_status TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'payment_date') THEN
        ALTER TABLE public.profiles ADD COLUMN payment_date TIMESTAMPTZ;
    END IF;
END $$;

-- Create a stored procedure for payment updates (webhook-safe)
CREATE OR REPLACE FUNCTION public.update_payment_status(
    target_user_id UUID,
    new_payment_status TEXT,
    new_payment_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_role TEXT;
BEGIN
    -- Get the current role
    current_role := current_setting('role', true);
    
    -- Only allow service_role, backend role, or admin users to call this function
    IF current_role != 'service_role' AND 
       NOT has_role(auth.uid(), 'admin'::app_role) AND
       current_role != 'backend' THEN
        RAISE EXCEPTION 'Unauthorized to update payment status';
    END IF;
    
    -- Update the payment information
    UPDATE public.profiles 
    SET 
        payment_status = new_payment_status,
        payment_date = COALESCE(new_payment_date, now()),
        updated_at = now()
    WHERE id = target_user_id;
    
    RETURN FOUND;
END;
$$;

-- Create restrictive UPDATE policies for profiles table
-- Remove existing broad update policies that might conflict
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Policy for regular profile updates (excluding payment fields)
CREATE POLICY "Users can update own profile except payment fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    -- Ensure payment fields are not being modified in regular updates
    (OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status) AND
    (OLD.payment_date IS NOT DISTINCT FROM NEW.payment_date)
);

-- Policy for payment field updates (service_role, backend, or admin only)
CREATE POLICY "Restricted payment fields update"
ON public.profiles FOR UPDATE
USING (
    -- Allow service_role, backend role, or admin users
    current_setting('role', true) = 'service_role' OR
    current_setting('role', true) = 'backend' OR
    has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
    current_setting('role', true) = 'service_role' OR
    current_setting('role', true) = 'backend' OR
    has_role(auth.uid(), 'admin'::app_role)
);

-- Also create similar policies for tax_returns table since it already has payment fields
CREATE POLICY "Restricted tax_returns payment update"
ON public.tax_returns FOR UPDATE
USING (
    -- Users can update their own records for non-payment fields
    (auth.uid() = user_id AND 
     OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status AND
     OLD.payment_date IS NOT DISTINCT FROM NEW.payment_date) OR
    -- Or service_role/backend/admin can update payment fields
    current_setting('role', true) = 'service_role' OR
    current_setting('role', true) = 'backend' OR
    has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
    (auth.uid() = user_id AND 
     OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status AND
     OLD.payment_date IS NOT DISTINCT FROM NEW.payment_date) OR
    current_setting('role', true) = 'service_role' OR
    current_setting('role', true) = 'backend' OR
    has_role(auth.uid(), 'admin'::app_role)
);
