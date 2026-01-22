-- Add unique constraint to prevent duplicate user/role combinations
-- First, remove any existing duplicates (keeping one of each)
DELETE FROM user_roles a
USING user_roles b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.role = b.role;

-- Now add the unique constraint
ALTER TABLE user_roles 
ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);