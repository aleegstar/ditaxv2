import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteRequest {
  reason?: string;
  additional_feedback?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header in delete-user-account request')
      throw new Error('AUTHENTICATION_REQUIRED')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Validate token format
    if (!token || token.length < 20) {
      console.error('Invalid token format')
      throw new Error('AUTHENTICATION_REQUIRED')
    }
    
    const { data: user, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user.user) {
      console.error('Authentication failed:', userError?.message)
      throw new Error('AUTHENTICATION_REQUIRED')
    }

    const userId = user.user.id
    const userEmail = user.user.email || 'unknown@email.com'
    
    // Validate userId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      console.error('Invalid user ID format')
      throw new Error('INVALID_REQUEST')
    }

    // Parse request body for feedback
    let feedbackData: DeleteRequest = {}
    try {
      const body = await req.text()
      if (body) {
        feedbackData = JSON.parse(body)
      }
    } catch (parseError) {
      console.log('No feedback data provided or invalid JSON')
    }
    
    console.log(`Starting account deletion for user: ${userId}`)

    // Store deletion feedback if provided
    if (feedbackData.reason) {
      try {
        const { error: feedbackError } = await supabaseAdmin
          .from('account_deletion_feedback')
          .insert({
            user_email: userEmail,
            reason: feedbackData.reason,
            additional_feedback: feedbackData.additional_feedback || null,
            deleted_user_id: userId
          })

        if (feedbackError) {
          console.error('Failed to store deletion feedback:', feedbackError)
          // Continue with deletion even if feedback storage fails
        } else {
          console.log('Deletion feedback stored successfully')
        }
      } catch (feedbackStoreError) {
        console.error('Error storing feedback:', feedbackStoreError)
        // Continue with deletion
      }
    }

    // Log the deletion attempt
    await supabaseAdmin.from('security_audit_logs').insert({
      user_id: userId,
      action: 'USER_ACCOUNT_DELETION_STARTED',
      success: true,
      resource: 'account_deletion',
      error_message: `User initiated complete account deletion. Reason: ${feedbackData.reason || 'Not provided'}`
    })

    // Get all storage files for this user before deletion
    const { data: documents } = await supabaseAdmin
      .from('uploaded_documents')
      .select('file_path')
      .eq('user_id', userId)

    const { data: taxReturns } = await supabaseAdmin
      .from('completed_tax_returns')
      .select('file_path')
      .eq('user_id', userId)

    const { data: chatAttachments } = await supabaseAdmin
      .from('chat_attachments')
      .select('file_path')
      .eq('uploaded_by', userId)

    const { data: ticketAttachments } = await supabaseAdmin
      .from('ticket_attachments')
      .select('file_path')
      .eq('uploaded_by', userId)

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    // Collect all file paths
    const filesToDelete = []
    
    if (documents) {
      filesToDelete.push(...documents.map(d => ({ bucket: 'documents', path: d.file_path })))
    }
    
    if (taxReturns) {
      filesToDelete.push(...taxReturns.map(t => ({ bucket: 'completed-tax-returns', path: t.file_path })))
    }
    
    if (chatAttachments) {
      filesToDelete.push(...chatAttachments.map(c => ({ bucket: 'Chat Attachments', path: c.file_path })))
    }
    
    if (ticketAttachments) {
      filesToDelete.push(...ticketAttachments.map(t => ({ bucket: 'ticket-attachments', path: t.file_path })))
    }
    
    if (profile?.avatar_url) {
      filesToDelete.push({ bucket: 'avatars', path: profile.avatar_url })
    }

    // Delete storage files
    for (const file of filesToDelete) {
      try {
        const { error: deleteError } = await supabaseAdmin.storage
          .from(file.bucket)
          .remove([file.path])
        
        if (deleteError) {
          console.error(`Failed to delete file ${file.path} from ${file.bucket}:`, deleteError)
        } else {
          console.log(`Deleted file: ${file.path} from ${file.bucket}`)
        }
      } catch (error) {
        console.error(`Error deleting file ${file.path}:`, error)
      }
    }

    // Delete user profile and related data (CASCADE will handle related records)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      console.error(`Failed to delete profile for ${userId}:`, profileDeleteError)
      throw new Error('DELETION_FAILED')
    }

    console.log(`Deleted profile and related data for user: ${userId}`)

    // Delete security audit logs for this user to avoid foreign key constraint
    const { error: auditLogsDeleteError } = await supabaseAdmin
      .from('security_audit_logs')
      .delete()
      .eq('user_id', userId)

    if (auditLogsDeleteError) {
      console.error(`Failed to delete audit logs for ${userId}:`, auditLogsDeleteError)
      // Continue anyway - this is not critical
    } else {
      console.log(`Deleted audit logs for user: ${userId}`)
    }

    // Delete the Auth user (this must be done last)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error(`Failed to delete auth user ${userId}:`, authDeleteError)
      
      // Even if auth deletion fails, profile and data are deleted
      // Log success for the data deletion part
      await supabaseAdmin.from('security_audit_logs').insert({
        user_id: null,
        action: 'USER_DATA_DELETION_COMPLETED',
        success: true,
        resource: 'account_deletion',
        error_message: `User data deleted but auth deletion failed for: ${userId}`
      })

      // Return partial success - data is deleted even if auth failed
      return new Response(
        JSON.stringify({
          success: true,
          partial: true,
          message: 'Account data deleted. Please sign out.',
          deleted_files: filesToDelete.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Deleted auth user: ${userId}`)

    // Log successful deletion (using service role since user is deleted)
    await supabaseAdmin.from('security_audit_logs').insert({
      user_id: null, // User no longer exists
      action: 'USER_ACCOUNT_DELETION_COMPLETED',
      success: true,
      resource: 'account_deletion',
      error_message: `Complete account deletion successful for user ID: ${userId}`
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account completely deleted',
        deleted_files: filesToDelete.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Account deletion error:', error)
    
    // Type-safe error code extraction
    const errorCode = error instanceof Error ? error.message : 'INTERNAL_ERROR'
    
    // Return generic error messages to client, log details server-side
    const errorMap: Record<string, { message: string, status: number }> = {
      'AUTHENTICATION_REQUIRED': { message: 'Authentication required', status: 401 },
      'INVALID_REQUEST': { message: 'Invalid request', status: 400 },
      'DELETION_FAILED': { message: 'Account deletion failed', status: 500 },
      'INTERNAL_ERROR': { message: 'An error occurred', status: 500 }
    }
    
    const errorResponse = errorMap[errorCode] || errorMap['INTERNAL_ERROR']
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorResponse.message,
        code: errorCode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorResponse.status
      }
    )
  }
})
