-- Create app_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL DEFAULT 'user'::public.app_role,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
DO $$ BEGIN
    -- Users can view their own roles
    CREATE POLICY "Users can view their own roles" 
    ON public.user_roles 
    FOR SELECT 
    USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Only admins can assign roles
    CREATE POLICY "Only admins can assign roles" 
    ON public.user_roles 
    FOR INSERT 
    WITH CHECK (auth.role() = 'service_role'::text OR EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    ));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    VALUES (target_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Successfully granted admin role to user %', target_user_id;
END $$;