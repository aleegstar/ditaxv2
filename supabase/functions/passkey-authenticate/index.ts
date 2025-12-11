
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
    console.log('🚀 Passkey authentication request started')
    const requestBody = await req.json()
    console.log('📋 Request body received:', JSON.stringify(requestBody, null, 2))
    
    const { credentialId, challenge, signature, email } = requestBody

    if (!credentialId || !challenge || !signature || !email) {
      console.log('❌ Missing required parameters:', { credentialId: !!credentialId, challenge: !!challenge, signature: !!signature, email: !!email })
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key for authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔧 Environment check:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey 
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Testing RPC function with params:', {
      p_credential_id: credentialId,
      p_challenge: challenge.substring(0, 20) + '...',
      p_signature: signature.substring(0, 20) + '...'
    })

    const { data: verificationResult, error: verificationError } = await supabaseServiceRole
      .rpc('verify_passkey_authentication', {
        p_credential_id: credentialId,
        p_challenge: challenge,
        p_signature: signature
      })

    console.log('📤 RPC Response:', {
      data: verificationResult,
      error: verificationError,
      dataType: typeof verificationResult,
      isArray: Array.isArray(verificationResult),
      length: verificationResult?.length
    })

    if (verificationError) {
      console.error('❌ RPC Error:', verificationError)
      return new Response(
        JSON.stringify({ 
          error: 'Passkey verification failed',
          details: verificationError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!verificationResult || !Array.isArray(verificationResult) || verificationResult.length === 0) {
      console.error('❌ No verification result returned')
      return new Response(
        JSON.stringify({ 
          error: 'Passkey verification failed',
          details: 'No verification result returned from database'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userResult = verificationResult[0]
    console.log('👤 User result:', userResult)

    if (!userResult.success) {
      console.error('❌ Passkey verification failed:', userResult.error_message)
      return new Response(
        JSON.stringify({ 
          error: 'Passkey authentication failed',
          details: userResult.error_message || 'Unknown verification error'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!userResult.user_id || !userResult.email) {
      console.error('❌ Missing user information in result:', userResult)
      return new Response(
        JSON.stringify({ 
          error: 'Passkey authentication failed',
          details: 'User information incomplete'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔐 Creating session for user:', userResult.user_id)
    
    try {
      // New simplified approach: Generate access token directly using Admin API
      console.log('🎯 Using direct token generation approach...')
      
      // Generate a strong temporary password that meets Supabase requirements
      const strongPassword = generateStrongPassword()
      console.log('🔑 Generated strong password for temporary use')
      
      // Update user with temporary password
      const { error: updateError } = await supabaseServiceRole.auth.admin.updateUserById(
        userResult.user_id,
        { password: strongPassword }
      )
      
      if (updateError) {
        console.error('❌ Failed to update user password:', updateError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create authentication session',
            details: `Password update failed: ${updateError.message}`
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      console.log('✅ Password updated successfully')
      
      // Now sign in with the temporary password using a regular client
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
      if (!anonKey) {
        console.error('❌ Missing SUPABASE_ANON_KEY')
        return new Response(
          JSON.stringify({ 
            error: 'Server configuration error',
            details: 'Missing anonymous key'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      const regularClient = createClient(supabaseUrl, anonKey)
      const { data: signInData, error: signInError } = await regularClient.auth.signInWithPassword({
        email: userResult.email,
        password: strongPassword
      })
      
      if (signInError || !signInData.session) {
        console.error('❌ Failed to sign in with temporary password:', signInError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create authentication session',
            details: `Sign in failed: ${signInError?.message || 'No session created'}`
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      console.log('✅ Session created successfully:', {
        hasAccessToken: !!signInData.session.access_token,
        hasRefreshToken: !!signInData.session.refresh_token,
        userId: signInData.session.user.id
      })

      // Optionally remove the temporary password (set to null) for security
      setTimeout(async () => {
        try {
          await supabaseServiceRole.auth.admin.updateUserById(
            userResult.user_id,
            { password: undefined }
          )
          console.log('🗑️ Temporary password cleared')
        } catch (cleanupError) {
          console.log('⚠️ Password cleanup failed (non-critical):', cleanupError)
        }
      }, 1000)

      console.log('✅ Passkey authentication successful for user:', userResult.user_id)

      return new Response(
        JSON.stringify({
          success: true,
          session: {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            user: {
              id: signInData.session.user.id,
              email: signInData.session.user.email
            }
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (authError) {
      console.error('💥 Authentication error:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication process failed',
          details: (authError as Error).message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('💥 Unexpected error in passkey authentication:', error)
    console.error('Error stack:', (error as Error).stack)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: (error as Error).message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to generate a strong password that meets Supabase requirements
function generateStrongPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  // Ensure we have at least one character from each required category
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill the rest with random characters from all categories
  const allChars = uppercase + lowercase + numbers + symbols
  for (let i = 4; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password to randomize the order
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
