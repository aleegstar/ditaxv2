import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * passkey-redirect Edge Function
 * 
 * This function performs a simple HTTP 302 redirect to the WebAuthn auth page.
 * It exists because Despia's oauth:// command only opens an In-App Tab for EXTERNAL domains.
 * Since app.ditax.ch is the same domain as the WebView, we need this redirect via supabase.co.
 * 
 * Flow:
 * 1. Auth.tsx calls passkey-start → returns URL to this function (supabase.co)
 * 2. despia('oauth://?url=https://supabase.co/...') opens In-App Tab (external domain!)
 * 3. This function redirects to https://app.ditax.ch/webauthn-auth
 * 4. WebAuthn runs in In-App Tab on correct RP ID domain
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get('target');
    const email = url.searchParams.get('email');
    const callbackScheme = url.searchParams.get('callback_scheme');

    console.log('🔄 passkey-redirect: Incoming request', { target, email, callbackScheme });

    if (!target) {
      console.error('❌ passkey-redirect: Missing target parameter');
      return new Response('Missing target parameter', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Build final WebAuthn URL with all parameters
    const params = new URLSearchParams({
      despia: 'true',
      callback_scheme: callbackScheme || 'ditax',
    });
    if (email) {
      params.set('email', email);
    }

    const redirectUrl = `${target}?${params.toString()}`;

    console.log('✅ passkey-redirect: Redirecting to', redirectUrl);

    // 302 Redirect to the actual WebAuthn page
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        ...corsHeaders,
      }
    });

  } catch (error: unknown) {
    console.error('❌ passkey-redirect: Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(errorMessage, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
