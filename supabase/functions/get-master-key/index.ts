
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      throw new Error('AUTHENTICATION_REQUIRED')
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

    // Get the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      console.error('No user found from token')
      throw new Error('AUTHENTICATION_REQUIRED')
    }

    // CRITICAL SECURITY FIX: Verify admin role using secure function
    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('verify_admin_role')

    if (roleError) {
      console.error('Error verifying admin role:', roleError)
      throw new Error('ACCESS_DENIED')
    }

    if (!isAdmin) {
      console.warn(`Unauthorized master key access attempt by user: ${user.id}`)
      // Log security incident
      await supabaseClient.from('security_audit_logs').insert({
        user_id: user.id,
        action: 'UNAUTHORIZED_MASTER_KEY_ACCESS',
        resource: 'master_key',
        success: false,
        error_message: 'User attempted to access master key without admin privileges'
      })
      
      throw new Error('ACCESS_DENIED')
    }

    // Get master key from environment (this would be set as a Supabase secret)
    const masterKey = Deno.env.get('DOCUMENT_MASTER_KEY')
    if (!masterKey) {
      console.error('❌ DOCUMENT_MASTER_KEY environment variable not set')
      // Log security incident
      await supabaseClient.from('security_audit_logs').insert({
        user_id: user.id,
        action: 'MASTER_KEY_CONFIG_ERROR',
        resource: 'master_key',
        success: false,
        error_message: 'Master key not configured in environment'
      })
      throw new Error('SERVICE_UNAVAILABLE')
    }
    
    console.log('✅ Master key successfully retrieved from environment')

     // Log successful access (without exposing sensitive data)
    await supabaseClient.from('security_audit_logs').insert({
      user_id: user.id,
      action: 'MASTER_KEY_ACCESS_GRANTED',
      resource: 'document_master_key',
      success: true
    })

    console.log(`Master key access granted for admin user: ${user.id}`)

    return new Response(
      JSON.stringify({ masterKey }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'INTERNAL_ERROR'
    console.error('Error in get-master-key function:', error)
    
    // Return generic error messages to client
    const errorMap: Record<string, { message: string, status: number }> = {
      'AUTHENTICATION_REQUIRED': { message: 'Authentication required', status: 401 },
      'ACCESS_DENIED': { message: 'Access denied', status: 403 },
      'SERVICE_UNAVAILABLE': { message: 'Service temporarily unavailable', status: 503 },
      'INTERNAL_ERROR': { message: 'An error occurred', status: 500 }
    }
    
    const errorResponse = errorMap[errorMessage] || errorMap['INTERNAL_ERROR']
    
    return new Response(
      JSON.stringify({ error: errorResponse.message, code: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorResponse.status,
      },
    )
  }
})
