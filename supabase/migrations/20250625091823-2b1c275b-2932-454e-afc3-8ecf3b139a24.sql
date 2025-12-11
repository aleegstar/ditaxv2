
-- Phase 1: Datenbank-Reparatur
-- Sandro Graber die korrekte Admin-Rolle zuweisen
INSERT INTO user_roles (user_id, role) 
VALUES ('3bc9ac39-126e-42c6-95b0-9546aeaad903', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Entferne falsche Admin-Rolle vom anderen User falls vorhanden
DELETE FROM user_roles 
WHERE user_id = '604af39e-79eb-4921-89e4-23ffffc39ff9' 
AND role = 'admin';

-- Stelle sicher, dass alle User ohne explizite Rolle die Standard-User-Rolle haben
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
