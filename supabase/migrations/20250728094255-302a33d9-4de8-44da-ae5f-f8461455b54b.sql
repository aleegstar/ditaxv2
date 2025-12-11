-- Fix admin access to uploaded_documents - ensure admins can see all documents regardless of status
DROP POLICY IF EXISTS "Admins can view all documents" ON public.uploaded_documents;

-- Create updated admin policy for viewing all documents
CREATE POLICY "Admins can view all documents" 
  ON public.uploaded_documents 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also ensure admins can see documents with any status by updating the user policy to not conflict
DROP POLICY IF EXISTS "Users can view their own documents" ON public.uploaded_documents;

-- Recreate user policy to be more specific and not interfere with admin access
CREATE POLICY "Users can view their own active documents" 
  ON public.uploaded_documents 
  FOR SELECT 
  USING (auth.uid() = user_id AND status = 'active'::text);