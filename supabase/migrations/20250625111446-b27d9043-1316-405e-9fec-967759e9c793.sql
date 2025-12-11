
-- Entferne Admin-Rolle von alee.gstar@gmail.com (User ID: 3bc9ac39-126e-42c6-95b0-9546aeaad903)
DELETE FROM user_roles 
WHERE user_id = '3bc9ac39-126e-42c6-95b0-9546aeaad903' 
AND role = 'admin';

-- Stelle sicher, dass alee.gstar@gmail.com die Standard-User-Rolle hat
INSERT INTO user_roles (user_id, role)
VALUES ('3bc9ac39-126e-42c6-95b0-9546aeaad903', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Finde die User-ID für sandrograber.ch@gmail.com und weise Admin-Rolle zu
-- Erst schauen wir nach der User-ID in der profiles Tabelle
WITH admin_user AS (
  SELECT id FROM profiles 
  WHERE email = 'sandrograber.ch@gmail.com'
  LIMIT 1
)
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM admin_user
ON CONFLICT (user_id, role) DO NOTHING;

-- Falls der Admin-User noch nicht in profiles ist, müssen wir ihn aus auth.users suchen
-- Das ist ein Fallback falls die Email nicht in profiles steht
INSERT INTO user_roles (user_id, role)
SELECT au.id, 'admin'::app_role
FROM auth.users au
WHERE au.email = 'sandrograber.ch@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = au.id AND ur.role = 'admin'
)
ON CONFLICT (user_id, role) DO NOTHING;
