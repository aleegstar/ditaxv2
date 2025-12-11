-- Clean up conflicting RLS policies for uploaded_documents table
-- Remove duplicate and conflicting SELECT policies

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can select their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can read their own documents" ON uploaded_documents;

-- Keep the main policies that are working correctly:
-- "Users can view their own documents" (with status = 'active' filter)
-- "Admins can view all documents" 
-- "Users can insert their own documents"
-- "Users can update their own documents"
-- "Users can delete their own documents"
-- "Admins can upload documents"

-- Ensure the main user SELECT policy is correct
DROP POLICY IF EXISTS "Users can view their own documents" ON uploaded_documents;
CREATE POLICY "Users can view their own documents" 
ON uploaded_documents 
FOR SELECT 
USING (auth.uid() = user_id AND status = 'active');

-- Log the cleanup
INSERT INTO security_audit_logs (action, success, resource) 
VALUES ('RLS_POLICY_CLEANUP', true, 'uploaded_documents');