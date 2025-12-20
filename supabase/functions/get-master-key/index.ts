/**
 * @deprecated This edge function has been deprecated for security reasons.
 * 
 * SECURITY FIX: Master encryption keys should NEVER be transmitted to clients.
 * 
 * Instead of retrieving the master key, use the admin-decrypt-document edge function
 * which performs server-side decryption without exposing the master key.
 * 
 * Migration: Replace calls to get-master-key with admin-decrypt-document
 * - Old: Get master key -> derive user key -> decrypt on client
 * - New: Call admin-decrypt-document -> receive decrypted document
 */

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

    // Log the deprecated usage attempt
    await supabaseClient.from('security_audit_logs').insert({
      user_id: user.id,
      action: 'DEPRECATED_MASTER_KEY_ACCESS_ATTEMPT',
      resource: 'get-master-key',
      success: false,
      error_message: 'This endpoint has been deprecated. Use admin-decrypt-document instead.'
    })

    console.warn(`⚠️ DEPRECATED: User ${user.id} attempted to access get-master-key endpoint`)
    
    // Return deprecation error instead of the master key
    return new Response(
      JSON.stringify({ 
        error: 'This endpoint has been deprecated for security reasons. Master keys should not be transmitted to clients. Use admin-decrypt-document for server-side decryption.',
        code: 'ENDPOINT_DEPRECATED',
        migration: 'Use supabase.functions.invoke("admin-decrypt-document", { body: { documentId } }) instead'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 410, // Gone - indicates resource is no longer available
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'INTERNAL_ERROR'
    console.error('Error in get-master-key function:', error)
    
    // Return generic error messages to client
    const errorMap: Record<string, { message: string, status: number }> = {
      'AUTHENTICATION_REQUIRED': { message: 'Authentication required', status: 401 },
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
