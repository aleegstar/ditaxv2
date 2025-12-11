-- Create function for complete user deletion including storage cleanup
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_files jsonb := '[]'::jsonb;
  storage_files record;
  result jsonb;
BEGIN
  -- Only allow admins to perform this operation
  IF NOT verify_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log the deletion attempt
  INSERT INTO security_audit_logs (
    user_id, 
    action, 
    success, 
    resource,
    error_message
  ) VALUES (
    auth.uid(),
    'USER_DELETION_STARTED',
    true,
    target_user_id::text,
    'Complete user deletion initiated'
  );

  -- Get all file paths from various tables for this user
  FOR storage_files IN 
    SELECT file_path, 'documents' as bucket_name 
    FROM uploaded_documents 
    WHERE user_id = target_user_id
    UNION ALL
    SELECT file_path, 'tax-documents' as bucket_name 
    FROM completed_tax_returns 
    WHERE user_id = target_user_id
    UNION ALL
    SELECT file_path, 'chat-attachments' as bucket_name 
    FROM chat_attachments 
    WHERE uploaded_by = target_user_id
    UNION ALL
    SELECT file_path, 'ticket-attachments' as bucket_name 
    FROM ticket_attachments 
    WHERE uploaded_by = target_user_id
    UNION ALL
    SELECT avatar_url as file_path, 'avatars' as bucket_name 
    FROM profiles 
    WHERE id = target_user_id AND avatar_url IS NOT NULL
  LOOP
    -- Storage file deletion will be handled by the edge function
    deleted_files := deleted_files || jsonb_build_object(
      'bucket', storage_files.bucket_name,
      'path', storage_files.file_path
    );
  END LOOP;

  -- Delete the user profile (CASCADE will handle all related records)
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Check if profile was actually deleted
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found or could not be deleted: %', target_user_id;
  END IF;

  -- Log successful deletion
  INSERT INTO security_audit_logs (
    user_id, 
    action, 
    success, 
    resource,
    error_message
  ) VALUES (
    auth.uid(),
    'USER_DELETION_COMPLETED',
    true,
    target_user_id::text,
    'User profile and related data deleted successfully'
  );

  -- Return information about what was deleted
  result := jsonb_build_object(
    'user_id', target_user_id,
    'deleted_at', now(),
    'deleted_by', auth.uid(),
    'storage_files_to_delete', deleted_files
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO security_audit_logs (
    user_id, 
    action, 
    success, 
    resource,
    error_message
  ) VALUES (
    auth.uid(),
    'USER_DELETION_FAILED',
    false,
    target_user_id::text,
    SQLERRM
  );
  
  RAISE;
END;
$$;