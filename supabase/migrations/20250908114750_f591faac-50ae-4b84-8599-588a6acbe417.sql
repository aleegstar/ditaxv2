-- Add admin role for sandrograber.ch@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles 
WHERE email = 'sandrograber.ch@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = profiles.id AND role = 'admin'::app_role
);