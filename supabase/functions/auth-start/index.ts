import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * PKCE helper functions
 * Generate code_verifier and code_challenge for proper PKCE flow.
 * The code_verifier is passed through the redirect URL so NativeCallback
 * can use it to exchange the code for tokens.
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let str = '';
  for (const byte of buffer) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * auth-start Edge Function - Despia Easy OAuth Flow (PKCE)
 * 
 * Generates OAuth URL with proper PKCE parameters for Despia native apps.
 * The code_verifier is embedded in the redirect URL so NativeCallback
 * can exchange the code without needing client-side storage.
 * 
 * Flow:
 * 1. Generate code_verifier + code_challenge
 * 2. Build OAuth URL with code_challenge
 * 3. Include code_verifier in redirect_to URL
 * 4. After auth, Supabase redirects to /native-callback?code=xxx&cv=yyy
 * 5. NativeCallback exchanges code+code_verifier for tokens
 * 6. NativeCallback deeplinks tokens back to app
 */
serve(async (req) => {
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

    // Generate PKCE code_verifier and code_challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    console.log('🔐 auth-start: Generated PKCE challenge', { 
      codeVerifierLength: codeVerifier.length,
      codeChallengeLength: codeChallenge.length 
    });

    // Include code_verifier in redirect URL so NativeCallback can use it
    // The trailing slash ensures Supabase correctly appends query params
    const redirectUrl = `https://app.ditax.ch/native-callback/${encodeURIComponent(deeplink_scheme)}/?cv=${encodeURIComponent(codeVerifier)}`;

    // Build OAuth URL with proper PKCE parameters
    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUrl)}&scope=${encodeURIComponent('openid email profile')}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;

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
