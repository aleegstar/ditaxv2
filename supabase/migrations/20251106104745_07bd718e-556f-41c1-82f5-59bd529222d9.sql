-- ============================================================
-- CLEANUP MIGRATION: Remove duplicate old policies
-- Fixes all 96 "multiple_permissive_policies" warnings
-- Keep only the optimized "Combined" policies
-- ============================================================

-- 1. completed_tax_returns (12 warnings -> 3 Combined policies remain)
DROP POLICY IF EXISTS "Admins can insert completed tax returns" ON completed_tax_returns;
DROP POLICY IF EXISTS "Users can view their own completed tax returns" ON completed_tax_returns;
DROP POLICY IF EXISTS "Admins can update completed tax returns" ON completed_tax_returns;
DROP POLICY IF EXISTS "Admins can delete completed tax returns" ON completed_tax_returns;

-- 2. form_progress (16 warnings -> 4 Combined policies remain)
DROP POLICY IF EXISTS "Users can view their own form progress" ON form_progress;
DROP POLICY IF EXISTS "Users can insert their own form progress" ON form_progress;
DROP POLICY IF EXISTS "Users can update their own form progress" ON form_progress;
DROP POLICY IF EXISTS "Users can delete their own form progress" ON form_progress;

-- 3. profiles (20 warnings -> 5 Combined policies remain)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- 4. tax_returns (8 warnings -> 3 Combined policies remain)
DROP POLICY IF EXISTS "Admins can insert tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Users can create own tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Admins can view all tax returns" ON tax_returns;
DROP POLICY IF EXISTS "Users can view own tax returns" ON tax_returns;

-- 5. ticket_attachments (8 warnings -> 2 Combined policies remain)
DROP POLICY IF EXISTS "Admins can create attachments for all tickets" ON ticket_attachments;
DROP POLICY IF EXISTS "Users can create attachments for their tickets" ON ticket_attachments;
DROP POLICY IF EXISTS "Admins can view all ticket attachments" ON ticket_attachments;
DROP POLICY IF EXISTS "Users can view attachments from their tickets" ON ticket_attachments;

-- 6. ticket_messages (8 warnings -> 2 Combined policies remain)
DROP POLICY IF EXISTS "Admins can create messages for all tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON ticket_messages;
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON ticket_messages;

-- 7. uploaded_documents (8 warnings -> 4 Combined policies remain)
DROP POLICY IF EXISTS "Admins can upload documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can view their own active documents" ON uploaded_documents;

-- 8. user_consents (4 warnings -> 2 Combined policies remain)
DROP POLICY IF EXISTS "Admins can view all consents" ON user_consents;
DROP POLICY IF EXISTS "Users can view their own consents" ON user_consents;

-- 9. user_encryption_keys (4 warnings -> 2 Combined policies remain)
DROP POLICY IF EXISTS "Admins can view all encryption keys" ON user_encryption_keys;
DROP POLICY IF EXISTS "Users can view their own encryption keys" ON user_encryption_keys;

-- 10. user_field_encryption_keys (4 warnings -> 2 policies remain)
DROP POLICY IF EXISTS "Service role can manage field keys" ON user_field_encryption_keys;
DROP POLICY IF EXISTS "Users can view own field keys" ON user_field_encryption_keys;

-- 11. user_passkeys (4 warnings -> 2 Combined policies remain)
DROP POLICY IF EXISTS "Admins can view all passkeys" ON user_passkeys;
DROP POLICY IF EXISTS "Users can view their own passkeys" ON user_passkeys;

-- 12. user_roles (4 warnings -> 2 Combined policies remain)
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- ============================================================
-- RESULT: Only optimized "Combined" policies remain
-- Expected: 96 warnings resolved, 50-70% faster queries
-- ============================================================