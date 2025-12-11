
-- Phase 2: E-Mail-Spalte zur profiles Tabelle hinzufügen
ALTER TABLE public.profiles 
ADD COLUMN email text;

-- Phase 3: handle_new_user Funktion aktualisieren, um E-Mail zu speichern
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
$$;

-- Phase 4: Migration - E-Mail-Adressen für bestehende Benutzer aus auth.users kopieren
-- Dies wird über eine sichere Methode gemacht, die keine Admin-Rechte im Frontend benötigt
UPDATE public.profiles 
SET email = COALESCE(
  (SELECT email FROM auth.users WHERE auth.users.id = profiles.id),
  'no-email@placeholder.com'
)
WHERE email IS NULL OR email = '';
