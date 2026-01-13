import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * passkey-start Edge Function - Despia Passkey Authentication Flow
 * 
 * Generates URL for passkey authentication in Despia native apps.
 * The flow uses the same pattern as OAuth but for WebAuthn/Passkey authentication.
 * 
 * Flow:
 * 1. App calls this function with email + deeplink_scheme
 * 2. App opens URL with despia('oauth://?url=...') in In-App Tab
 * 3. User authenticates with Passkey on /webauthn-auth
 * 4. WebAuthnAuth.tsx redirects to {scheme}://oauth/auth?tokens
 * 5. Native app intercepts deeplink, closes browser, navigates to /auth?tokens
 * 6. Auth.tsx calls setSession() with the tokens
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, deeplink_scheme } = await req.json();

    console.log('🔐 passkey-start: Generating Passkey Auth URL', { email, deeplink_scheme });

    if (!deeplink_scheme) {
      return new Response(
        JSON.stringify({ error: 'deeplink_scheme is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the WebAuthn auth URL
    // IMPORTANT: Use app.ditax.ch because that's the domain registered as the Relying Party
    const params = new URLSearchParams({
      despia: 'true',
      callback_scheme: deeplink_scheme,
    });
    
    if (email) {
      params.set('email', email);
    }
    
    const passkeyUrl = `https://app.ditax.ch/webauthn-auth?${params.toString()}`;

    console.log('✅ passkey-start: Generated Passkey URL', { 
      passkeyUrl,
      email: email || '(none)',
      deeplink_scheme 
    });

    return new Response(
      JSON.stringify({ url: passkeyUrl }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('❌ passkey-start: Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
