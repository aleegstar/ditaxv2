import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * auth-start Edge Function
 * 
 * Generates OAuth URL for Despia Easy OAuth flow.
 * Returns a URL that can be used with despia('oauth://...') to start authentication.
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

    // Build redirect URL with deeplink_scheme for NativeCallback to use
    const redirectUrl = `https://app.ditax.ch/native-callback?deeplink_scheme=${encodeURIComponent(deeplink_scheme)}`;

    // Build OAuth URL using Supabase's authorize endpoint
    const params = new URLSearchParams({
      provider,
      redirect_to: redirectUrl,
    });

    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;

    console.log('✅ auth-start: Generated OAuth URL', { oauthUrl, redirectUrl });

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
