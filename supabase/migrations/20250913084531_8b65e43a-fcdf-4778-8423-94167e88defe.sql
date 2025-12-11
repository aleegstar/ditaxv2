-- Fix remaining security warnings: Function Search Path Mutable

-- Update existing functions to have immutable search paths
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  first_name_val TEXT;
  last_name_val TEXT;
  email_val TEXT;
BEGIN
  first_name_val := COALESCE(new.raw_user_meta_data->>'first_name', '');
  last_name_val := COALESCE(new.raw_user_meta_data->>'last_name', '');
  email_val := COALESCE(new.email, '');
  
  INSERT INTO public.profiles (id, first_name, last_name, email, updated_at)
  VALUES (new.id, first_name_val, last_name_val, email_val, now());
  
  RETURN new;
EXCEPTION WHEN others THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the update_updated_at_column function to have immutable search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;