-- Create CASCADE delete function for tax years
CREATE OR REPLACE FUNCTION delete_tax_year_cascade(
  p_user_id UUID,
  p_tax_year TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the caller is either the user themselves or service_role
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: You can only delete your own tax year data';
  END IF;
  
  -- Delete in correct order to avoid foreign key violations
  
  -- 1. Delete support tickets for completed returns
  DELETE FROM support_tickets 
  WHERE user_id = p_user_id 
  AND completed_tax_return_id IN (
    SELECT id FROM completed_tax_returns 
    WHERE user_id = p_user_id AND tax_year = p_tax_year
  );
  
  -- 2. Delete completed tax returns
  DELETE FROM completed_tax_returns 
  WHERE user_id = p_user_id 
  AND tax_year = p_tax_year;
  
  -- 3. Delete definitive tax bills
  DELETE FROM definitive_tax_bills 
  WHERE user_id = p_user_id 
  AND tax_year = p_tax_year;
  
  -- 4. Delete uploaded documents
  DELETE FROM uploaded_documents 
  WHERE user_id = p_user_id 
  AND tax_year = p_tax_year;
  
  -- 5. Delete form chat history
  DELETE FROM form_chat_history 
  WHERE user_id = p_user_id 
  AND tax_year = p_tax_year;
  
  -- 6. Delete form data
  DELETE FROM form_data 
  WHERE user_id = p_user_id 
  AND tax_year = p_tax_year;
  
  -- 7. Delete form progress
  DELETE FROM form_progress 
  WHERE user_id = p_user_id 
  AND tax_year = p_tax_year;
  
  -- 8. Finally delete the tax return itself
  DELETE FROM tax_returns 
  WHERE user_id = p_user_id 
  AND tax_year = p_tax_year;
  
  -- Log the deletion for audit purposes
  INSERT INTO security_audit_logs (
    user_id,
    action,
    success,
    resource,
    error_message
  ) VALUES (
    p_user_id,
    'TAX_YEAR_CASCADE_DELETE',
    true,
    'tax_year_' || p_tax_year,
    'Successfully deleted all data for tax year ' || p_tax_year
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_tax_year_cascade(UUID, TEXT) TO authenticated;

-- Add RLS policy to allow users to delete their own tax returns
DROP POLICY IF EXISTS "Users can delete their own tax years" ON tax_returns;
CREATE POLICY "Users can delete their own tax years"
ON tax_returns
FOR DELETE
USING (auth.uid() = user_id);