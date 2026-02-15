import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * auth-apple-callback Edge Function
 * 
 * Receives Apple's form_post with id_token, verifies it,
 * creates/finds Supabase user, generates session, and redirects.
 * 
 * Native flow: Returns HTML with deeplink redirect
 * Web flow: HTTP 302 redirect to APP_URL
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Apple sends POST with application/x-www-form-urlencoded
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const formData = await req.formData();
    const idToken = formData.get('id_token') as string;
    const code = formData.get('code') as string;
    const state = formData.get('state') as string;
    const userStr = formData.get('user') as string | null;

    console.log('[auth-apple-callback] Received callback', { 
      hasIdToken: !!idToken, 
      hasCode: !!code, 
      state,
      hasUser: !!userStr 
    });

    if (!idToken) {
      return errorResponse('Missing id_token from Apple');
    }

    // Detect native flow: state contains pipe separator (UUID|scheme)
    const isNative = state?.includes('|') ?? false;
    const deeplinkScheme = isNative ? state.split('|')[1] : null;

    console.log('[auth-apple-callback] Flow type:', { isNative, deeplinkScheme });

    // 1. Verify id_token with Apple's JWKS public keys
    const JWKS = jose.createRemoteJWKSet(
      new URL('https://appleid.apple.com/auth/keys')
    );

    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: Deno.env.get('APPLE_CLIENT_ID') || 'com.ditax.web',
    });

    console.log('[auth-apple-callback] Token verified', { 
      sub: payload.sub, 
      email: payload.email 
    });

    const appleUserId = payload.sub as string;
    const email = payload.email as string;
    
    // Parse user info (only sent on first login)
    let firstName = '';
    let lastName = '';
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        firstName = userData?.name?.firstName || '';
        lastName = userData?.name?.lastName || '';
        console.log('[auth-apple-callback] User info from Apple:', { firstName, lastName });
      } catch (e: any) {
        console.warn('[auth-apple-callback] Could not parse user data:', e.message);
      }
    }

    if (!email) {
      return errorResponse('No email in Apple id_token');
    }

    // 2. Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const supabasePublic = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 3. Find or create Supabase user
    let userId: string;

    // First try to find existing user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
      console.log('[auth-apple-callback] Found existing user:', userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          provider: 'apple',
          apple_sub: appleUserId,
        },
      });

      if (createError) {
        console.error('[auth-apple-callback] Error creating user:', createError);
        return errorResponse('Failed to create user: ' + createError.message);
      }

      userId = newUser.user.id;
      console.log('[auth-apple-callback] Created new user:', userId);
    }

    // 4. Generate session via magiclink + verifyOtp
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      console.error('[auth-apple-callback] Error generating link:', linkError);
      return errorResponse('Failed to generate session link');
    }

    // Extract OTP from the link properties
    const otp = linkData.properties?.hashed_token;
    if (!otp) {
      console.error('[auth-apple-callback] No hashed_token in link data');
      return errorResponse('Failed to extract OTP from link');
    }

    // Verify OTP to get actual session tokens
    const { data: sessionData, error: otpError } = await supabasePublic.auth.verifyOtp({
      type: 'email',
      token_hash: otp,
    });

    if (otpError || !sessionData?.session) {
      console.error('[auth-apple-callback] Error verifying OTP:', otpError);
      return errorResponse('Failed to create session');
    }

    const accessToken = sessionData.session.access_token;
    const refreshToken = sessionData.session.refresh_token;

    console.log('[auth-apple-callback] Session created successfully for user:', userId);

    // 5. Redirect based on flow type
    const appUrl = Deno.env.get('APP_URL') || 'https://app.ditax.ch';

    if (isNative && deeplinkScheme) {
      // Native: HTML page with deeplink redirect
      const deeplink = `${deeplinkScheme}://oauth/auth?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
      
      console.log('[auth-apple-callback] Native redirect to deeplink');
      
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${deeplink}">
  <title>Anmeldung erfolgreich</title>
</head>
<body>
  <p>Anmeldung erfolgreich. Du wirst weitergeleitet...</p>
  <script>
    window.location.href = "${deeplink}";
  </script>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } else {
      // Web: HTTP 302 redirect
      const redirectUrl = `${appUrl}/auth?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
      
      console.log('[auth-apple-callback] Web redirect to:', redirectUrl);
      
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }

  } catch (error: any) {
    console.error('[auth-apple-callback] Unexpected error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
});

function errorResponse(message: string) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Fehler</title></head>
<body>
  <h1>Anmeldung fehlgeschlagen</h1>
  <p>${message}</p>
  <p><a href="https://app.ditax.ch/auth">Zurück zur Anmeldung</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
