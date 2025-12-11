-- Make sandrograber.ch@gmail.com an admin
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Find the user by email
    SELECT id INTO target_user_id 
    FROM public.profiles 
    WHERE email = 'sandrograber.ch@gmail.com';
    
    -- Check if user exists
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email sandrograber.ch@gmail.com not found';
    END IF;
    
    -- Insert admin role (or do nothing if already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Successfully granted admin role to user %', target_user_id;
END $$;