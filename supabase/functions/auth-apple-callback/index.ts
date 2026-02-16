import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://app.ditax.ch';

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const formData = await req.formData();
    const idToken = formData.get('id_token') as string;
    const state = formData.get('state') as string;
    const userStr = formData.get('user') as string | null;

    // Detect native flow: state contains pipe separator (UUID|scheme)
    const isNative = state?.includes('|') ?? false;
    const deeplinkScheme = isNative ? state.split('|')[1] : null;

    console.log('[auth-apple-callback] Received callback', { hasIdToken: !!idToken, state, isNative });

    if (!idToken) {
      return redirectWithError(appUrl, 'Missing id_token from Apple', isNative, deeplinkScheme);
    }

    // 1. Verify id_token with Apple's JWKS
    const JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: Deno.env.get('APPLE_CLIENT_ID') || 'com.ditax.web',
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
      } catch (_e) { /* ignore */ }
    }

    if (!email) {
      return redirectWithError(appUrl, 'No email in Apple id_token', isNative, deeplinkScheme);
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

    // 3. createUser-first pattern
    let userId: string;

    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
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
      if (createError.message?.includes('already been registered')) {
        // User exists – find them
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (!existingUser) {
          return redirectWithError(appUrl, 'User not found after create conflict', isNative, deeplinkScheme);
        }
        userId = existingUser.id;
        console.log('[auth-apple-callback] Existing user:', userId);
      } else {
        console.error('[auth-apple-callback] createUser error:', createError);
        return redirectWithError(appUrl, 'Failed to create user: ' + createError.message, isNative, deeplinkScheme);
      }
    } else {
      userId = createData.user.id;
      console.log('[auth-apple-callback] New user:', userId);
    }

    // 4. Generate session via magiclink + verifyOtp
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      return redirectWithError(appUrl, 'Failed to generate session link', isNative, deeplinkScheme);
    }

    const otp = linkData.properties?.hashed_token;
    if (!otp) {
      return redirectWithError(appUrl, 'Failed to extract OTP from link', isNative, deeplinkScheme);
    }

    const { data: sessionData, error: otpError } = await supabasePublic.auth.verifyOtp({
      type: 'email',
      token_hash: otp,
    });

    if (otpError || !sessionData?.session) {
      return redirectWithError(appUrl, 'Failed to create session', isNative, deeplinkScheme);
    }

    const accessToken = sessionData.session.access_token;
    const refreshToken = sessionData.session.refresh_token;

    console.log('[auth-apple-callback] Session created for user:', userId);

    // 5. Redirect
    if (isNative && deeplinkScheme) {
      // Native: 302 redirect to deeplink
      const params = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${deeplinkScheme}://oauth/auth?${params.toString()}` },
      });
    } else {
      // Web: 302 redirect
      const redirectUrl = `${appUrl}/auth?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

  } catch (error: any) {
    console.error('[auth-apple-callback] Unexpected error:', error);
    return redirectWithError(appUrl, error.message || 'Internal server error', false, null);
  }
});

function redirectWithError(appUrl: string, error: string, isNative: boolean, deeplinkScheme: string | null): Response {
  const encoded = encodeURIComponent(error);
  if (isNative && deeplinkScheme) {
    return new Response(null, { status: 302, headers: { 'Location': `${deeplinkScheme}://oauth/auth?error=${encoded}` } });
  }
  return new Response(null, { status: 302, headers: { 'Location': `${appUrl}/auth?error=${encoded}` } });
}
