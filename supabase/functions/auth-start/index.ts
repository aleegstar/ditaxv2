import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * auth-start Edge Function - Despia Easy OAuth Flow
 * 
 * Generates OAuth URL for Despia native apps.
 * The redirect goes to /native-callback which then redirects to a deeplink
 * to close the ASWebAuthenticationSession/Chrome Custom Tab.
 * 
 * Flow:
 * 1. App calls this function with provider + deeplink_scheme
 * 2. App opens URL with despia('oauth://?url=...')
 * 3. User authenticates with Google/Apple
 * 4. Supabase redirects to /native-callback#access_token=xxx
 * 5. NativeCallback redirects to {scheme}://oauth/auth?tokens
 * 6. Native app intercepts deeplink, closes browser, navigates to /auth?tokens
 * 7. Auth.tsx calls setSession() with the tokens
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, deeplink_scheme } = await req.json();

    console.log('🔗 auth-start: Generating OAuth URL', { provider, deeplink_scheme });

    if (!provider || !['google', 'apple'].includes(provider)) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Must be "google" or "apple".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deeplink_scheme) {
      return new Response(
        JSON.stringify({ error: 'deeplink_scheme is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseUrl) {
      console.error('❌ auth-start: SUPABASE_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL: Redirect to /native-callback (NOT /auth)
    // NativeCallback.tsx will parse tokens and redirect to deeplink to close the browser session
    // Using app.ditax.ch as the production URL
    const redirectUrl = `https://app.ditax.ch/native-callback?deeplink_scheme=${encodeURIComponent(deeplink_scheme)}`;

    // Build OAuth URL using Supabase's authorize endpoint
    // Let Supabase handle state parameter internally with flow_type=implicit
    const params = new URLSearchParams({
      provider,
      redirect_to: redirectUrl,
      scopes: 'openid email profile',
      flow_type: 'implicit',
    });

    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;

    console.log('✅ auth-start: Generated OAuth URL', { 
      oauthUrl, 
      redirectUrl,
      provider,
      deeplink_scheme 
    });

    return new Response(
      JSON.stringify({ url: oauthUrl }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('❌ auth-start: Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
