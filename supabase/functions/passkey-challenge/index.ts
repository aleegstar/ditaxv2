import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach(b => binary += String.fromCharCode(b))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate cryptographically secure challenge (32 bytes)
    const challengeBytes = new Uint8Array(32)
    crypto.getRandomValues(challengeBytes)
    const challenge = arrayBufferToBase64Url(challengeBytes.buffer)

    // Cleanup any expired challenges & purge prior challenges for this email
    // to avoid stale/replay reuse.
    await supabase
      .from('passkey_challenges')
      .delete()
      .or(`expires_at.lt.${new Date().toISOString()},email.eq.${email.toLowerCase()}`)

    const { error: insertError } = await supabase
      .from('passkey_challenges')
      .insert({
        email: email.toLowerCase(),
        challenge,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })

    if (insertError) {
      console.error('Failed to store challenge:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create challenge' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ challenge }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('passkey-challenge error', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
