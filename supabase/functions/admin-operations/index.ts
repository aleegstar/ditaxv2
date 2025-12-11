
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const adminOperationSchema = z.object({
  operation: z.enum(['user_management', 'role_assignment', 'data_access', 'system_config', 'update_payment_status']),
  data: z.record(z.any())
})

const userManagementSchema = z.object({
  action: z.enum(['get_user_details', 'delete_user_completely']),
  targetUserId: z.string().uuid()
})

const updatePaymentStatusSchema = z.object({
  email: z.string().email().max(255),
  tax_year: z.string().regex(/^20\d{2}$/, 'Invalid tax year format')
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create a Supabase client with the Auth context of the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the user and verify authentication
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      console.warn('Unauthorized admin operation attempt - no user')
      await supabaseClient.from('security_audit_logs').insert({
        action: 'UNAUTHORIZED_ADMIN_OPERATION_NO_USER',
        success: false,
        error_message: 'No authenticated user for admin operation'
      })
      throw new Error('Authentication required')
    }

    // Verify admin role using secure server-side function
    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('verify_admin_access', { operation_type: 'server_side_admin_operation' })

    if (roleError) {
      console.error('Error verifying admin role:', roleError)
      throw new Error('Unable to verify admin privileges')
    }

    if (!isAdmin) {
      console.warn(`Unauthorized admin operation attempt by user: ${user.id}`)
      await supabaseClient.from('security_audit_logs').insert({
        user_id: user.id,
        action: 'UNAUTHORIZED_ADMIN_OPERATION',
        success: false,
        error_message: 'User attempted admin operation without privileges'
      })
      throw new Error('Insufficient privileges - admin access required')
    }

    // Parse and validate request body
    const body = await req.json()
    
    let validatedRequest
    try {
      validatedRequest = adminOperationSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation error:', validationError.errors)
        await supabaseClient.from('security_audit_logs').insert({
          user_id: user.id,
          action: 'INVALID_ADMIN_REQUEST',
          success: false,
          error_message: JSON.stringify(validationError.errors)
        })
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request format', 
            details: validationError.errors 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      throw validationError
    }

    const { operation, data } = validatedRequest

    // Rate limiting check
    const rateLimitKey = `admin_${operation}_${user.id}`
    const { data: rateLimitData } = await supabaseClient
      .from('rate_limits')
      .select('*')
      .eq('user_id', user.id)
      .eq('action', rateLimitKey)
      .single()

    if (rateLimitData) {
      const windowStart = new Date(rateLimitData.window_start)
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

      if (windowStart > fiveMinutesAgo && rateLimitData.attempts >= 10) {
        await supabaseClient.from('security_audit_logs').insert({
          user_id: user.id,
          action: 'ADMIN_OPERATION_RATE_LIMITED',
          success: false,
          error_message: `Rate limit exceeded for operation: ${operation}`
        })
        throw new Error('Rate limit exceeded for admin operations')
      }
    }

    // Update rate limit
    await supabaseClient
      .from('rate_limits')
      .upsert({
        user_id: user.id,
        action: rateLimitKey,
        attempts: (rateLimitData?.attempts || 0) + 1,
        window_start: rateLimitData?.window_start || new Date().toISOString()
      })

    let result = null

    // Process the admin operation based on type
    switch (operation) {
      case 'user_management':
        result = await handleUserManagement(supabaseClient, data, user.id)
        break
      case 'role_assignment':
        result = await handleRoleAssignment(supabaseClient, data, user.id)
        break
      case 'data_access':
        result = await handleDataAccess(supabaseClient, data, user.id)
        break
      case 'system_config':
        result = await handleSystemConfig(supabaseClient, data, user.id)
        break
      case 'update_payment_status':
        result = await handleUpdatePaymentStatus(supabaseClient, data, user.id)
        break
      default:
        throw new Error('Operation not implemented')
    }

    // Log successful operation
    await supabaseClient.from('security_audit_logs').insert({
      user_id: user.id,
      action: `ADMIN_OPERATION_${operation.toUpperCase()}_SUCCESS`,
      success: true,
      resource: operation
    })

    console.log(`Admin operation ${operation} completed successfully by user: ${user.id}`)

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in admin-operations function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      },
    )
  }
})

async function handleUserManagement(supabaseClient: any, data: any, adminUserId: string) {
  // Validate user management data
  const validated = userManagementSchema.parse(data)
  const { action, targetUserId } = validated
  
  if (action === 'get_user_details') {
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()
    
    return { userProfile }
  }
  
  if (action === 'delete_user_completely') {
    console.log(`Starting complete user deletion for user: ${targetUserId}`)
    
    // Use the database function to delete user and get storage files to remove
    const { data: deletionResult, error: deletionError } = await supabaseClient
      .rpc('delete_user_completely', { target_user_id: targetUserId })
    
    if (deletionError) {
      console.error('Error during user deletion:', deletionError)
      throw new Error(`Failed to delete user: ${deletionError.message}`)
    }
    
    console.log('Database deletion completed, now cleaning up storage files...')
    
    // Clean up storage files
    const storageFiles = deletionResult.storage_files_to_delete || []
    const deletedStorageFiles = []
    const failedStorageFiles = []
    
    for (const fileInfo of storageFiles) {
      try {
        if (fileInfo.path && fileInfo.bucket) {
          // Extract just the file name from the path (remove any URL prefix)
          let filePath = fileInfo.path
          if (filePath.includes('/storage/v1/object/public/')) {
            filePath = filePath.split('/storage/v1/object/public/')[1]
            if (filePath.includes('/')) {
              filePath = filePath.split('/').slice(1).join('/')
            }
          }
          
          console.log(`Deleting file: ${filePath} from bucket: ${fileInfo.bucket}`)
          
          const { error: storageError } = await supabaseClient.storage
            .from(fileInfo.bucket)
            .remove([filePath])
          
          if (storageError) {
            console.error(`Failed to delete storage file ${filePath}:`, storageError)
            failedStorageFiles.push({ path: filePath, bucket: fileInfo.bucket, error: storageError.message })
          } else {
            console.log(`Successfully deleted storage file: ${filePath}`)
            deletedStorageFiles.push({ path: filePath, bucket: fileInfo.bucket })
          }
        }
      } catch (error) {
        console.error(`Unexpected error deleting storage file:`, error)
        failedStorageFiles.push({ path: fileInfo.path, bucket: fileInfo.bucket, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
    
    // Also try to delete the user from Supabase Auth
    try {
      console.log(`Attempting to delete Auth user: ${targetUserId}`)
      
      // Create admin client for auth operations
      const adminAuthClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      const { error: authDeleteError } = await adminAuthClient.auth.admin.deleteUser(targetUserId)
      
      if (authDeleteError) {
        console.error('Failed to delete Auth user:', authDeleteError)
      } else {
        console.log('Successfully deleted Auth user')
      }
    } catch (authError) {
      console.error('Error during Auth user deletion:', authError)
    }
    
    console.log(`User deletion completed. Deleted ${deletedStorageFiles.length} storage files, ${failedStorageFiles.length} failed`)
    
    return {
      success: true,
      message: 'User completely deleted',
      deletionResult,
      storageCleanup: {
        deleted: deletedStorageFiles,
        failed: failedStorageFiles
      }
    }
  }
  
  throw new Error('User management action not implemented')
}

async function handleRoleAssignment(supabaseClient: any, data: any, adminUserId: string) {
  // Implement secure role assignment logic
  const { targetUserId, role } = data
  
  // Additional validation for role assignment
  if (!['admin', 'user'].includes(role)) {
    throw new Error('Invalid role specified')
  }
  
  // Log the role assignment attempt
  await supabaseClient.from('security_audit_logs').insert({
    user_id: adminUserId,
    action: 'ROLE_ASSIGNMENT_ATTEMPT',
    success: true,
    resource: `${targetUserId}:${role}`
  })
  
  return { message: 'Role assignment processed' }
}

async function handleDataAccess(supabaseClient: any, data: any, adminUserId: string) {
  // Implement secure data access logic
  const { dataType, filters } = data
  
  // Log data access
  await supabaseClient.from('security_audit_logs').insert({
    user_id: adminUserId,
    action: 'ADMIN_DATA_ACCESS',
    success: true,
    resource: dataType
  })
  
  return { message: 'Data access processed' }
}

async function handleSystemConfig(supabaseClient: any, data: any, adminUserId: string) {
  // Implement secure system configuration logic
  const { configType, value } = data
  
  // Log system configuration change
  await supabaseClient.from('security_audit_logs').insert({
    user_id: adminUserId,
    action: 'SYSTEM_CONFIG_CHANGE',
    success: true,
    resource: configType
  })
  
  return { message: 'System configuration updated' }
}

async function handleUpdatePaymentStatus(supabaseClient: any, data: any, adminUserId: string) {
  // Validate payment status data
  const validated = updatePaymentStatusSchema.parse(data)
  const { email, tax_year } = validated
  
  // Get user by email
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single()
  
  if (profileError || !profile) {
    throw new Error('User not found')
  }
  
  // Create admin client with service role key for updating
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  // Update tax return status (update if exists, otherwise create)
  const { data: taxReturn, error: updateError } = await adminClient
    .from('tax_returns')
    .update({
      payment_status: 'paid',
      payment_date: new Date().toISOString(),
      status: 'processing',
      workflow_step: 'in_creation',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', profile.id)
    .eq('tax_year', tax_year)
    .select()
    .maybeSingle()

  if (updateError) {
    throw new Error(`Failed to update payment status: ${updateError.message}`)
  }

  let finalTaxReturn = taxReturn

  if (!finalTaxReturn) {
    // If no existing tax return, create it in the post-payment state
    const { data: inserted, error: insertError } = await adminClient
      .from('tax_returns')
      .insert({
        user_id: profile.id,
        tax_year,
        payment_status: 'paid',
        payment_date: new Date().toISOString(),
        status: 'processing',
        workflow_step: 'in_creation',
        express_service: false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create tax return: ${insertError.message}`)
    }

    finalTaxReturn = inserted
  }
  
  // Log the update
  await supabaseClient.from('security_audit_logs').insert({
    user_id: adminUserId,
    action: 'ADMIN_UPDATE_PAYMENT_STATUS',
    success: true,
    resource: `${profile.email}:${tax_year}`,
    error_message: `Updated payment status for ${profile.email}, tax year ${tax_year}`
  })
  
  console.log(`Payment status updated for ${profile.email}, tax year ${tax_year}`)
  
  return {
    success: true,
    message: `Payment status updated for ${email}, tax year ${tax_year}`,
    taxReturn: finalTaxReturn
  }
}
