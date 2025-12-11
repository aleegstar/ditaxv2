
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
    const { email } = await req.json()
    console.log('🔍 Checking passkeys for email:', email)

    if (!email) {
      console.log('❌ No email provided')
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if passkeys exist for this email using the corrected function
    console.log('📡 Calling check_passkeys_for_email function...')
    const { data: passkeyCheck, error } = await supabase
      .rpc('check_passkeys_for_email', { p_email: email })

    if (error) {
      console.error('❌ RPC Error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to check passkeys',
          details: error.message,
          has_passkeys: false,
          passkey_count: 0
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ RPC Response:', passkeyCheck)

    // Get the first result or default values
    const result = passkeyCheck?.[0] || { 
      has_passkeys: false, 
      passkey_count: 0,
      user_id: null,
      email: email
    }

    console.log('📤 Returning result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        has_passkeys: false,
        passkey_count: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
