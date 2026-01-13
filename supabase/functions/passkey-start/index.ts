import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase project URL for the redirect function
const SUPABASE_URL = "https://gqbhilftduwxjszznnzy.supabase.co";

/**
 * passkey-start Edge Function - Despia Passkey Authentication Flow
 * 
 * Generates URL for passkey authentication that goes through a Supabase redirect.
 * This is necessary because Despia's oauth:// command only opens an In-App Tab
 * for EXTERNAL domains. Since app.ditax.ch is the same domain as the WebView,
 * we redirect through supabase.co first.
 * 
 * Flow:
 * 1. App calls this function with email + deeplink_scheme
 * 2. This returns URL to passkey-redirect Edge Function (supabase.co = external!)
 * 3. App opens URL with despia('oauth://?url=...') → In-App Tab opens
 * 4. passkey-redirect does 302 to https://app.ditax.ch/webauthn-auth
 * 5. User authenticates with Passkey on /webauthn-auth
 * 6. WebAuthnAuth.tsx redirects to {scheme}://oauth/auth?tokens
 * 7. Native app intercepts deeplink, closes browser, navigates to /auth?tokens
 * 8. Auth.tsx calls setSession() with the tokens
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, deeplink_scheme } = await req.json();

    console.log('🔐 passkey-start: Generating Passkey Redirect URL', { email, deeplink_scheme });

    if (!deeplink_scheme) {
      return new Response(
        JSON.stringify({ error: 'deeplink_scheme is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build URL to passkey-redirect Edge Function (external domain!)
    // This function will do a 302 redirect to app.ditax.ch/webauthn-auth
    const params = new URLSearchParams({
      target: 'https://app.ditax.ch/webauthn-auth',
      callback_scheme: deeplink_scheme,
    });
    
    if (email) {
      params.set('email', email);
    }
    
    // URL goes to Supabase (external domain) which redirects to app.ditax.ch
    const passkeyRedirectUrl = `${SUPABASE_URL}/functions/v1/passkey-redirect?${params.toString()}`;

    console.log('✅ passkey-start: Generated Redirect URL', { 
      passkeyRedirectUrl,
      email: email || '(none)',
      deeplink_scheme 
    });

    return new Response(
      JSON.stringify({ url: passkeyRedirectUrl }),
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
