import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

/**
 * Returns an HTML page that redirects via JS + meta refresh.
 * Required because Response.redirect() doesn't work with custom URL schemes.
 */
function htmlRedirect(url: string): Response {
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}"></head><body><script>window.location.href="${url}";</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

function redirectWithError(error: string, state: string | null): Response {
  let deeplinkScheme: string | null = null;
  if (state && state.includes('|')) {
    deeplinkScheme = state.split('|')[1];
  }

  const APP_URL = Deno.env.get('APP_URL') || 'https://app.ditax.ch';

  if (deeplinkScheme) {
    return htmlRedirect(`${deeplinkScheme}://oauth/auth?error=${encodeURIComponent(error)}`);
  } else {
    return htmlRedirect(`${APP_URL}/auth?error=${encodeURIComponent(error)}`);
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const idToken = formData.get('id_token') as string;
    const state = formData.get('state') as string;
    const userStr = formData.get('user') as string | null;

    console.log('🍎 auth-apple-callback: Received callback', {
      hasIdToken: !!idToken,
      state,
      hasUser: !!userStr,
    });

    if (!idToken) {
      console.error('❌ No id_token received');
      return redirectWithError('no_id_token', state);
    }

    // Parse state to detect native flow ("uuid|scheme")
    let deeplinkScheme: string | null = null;
    if (state && state.includes('|')) {
      deeplinkScheme = state.split('|')[1];
      console.log('🔗 Native flow detected, scheme:', deeplinkScheme);
    }

    // === Step 1: Verify id_token with Apple JWKS ===
    const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID');
    if (!APPLE_CLIENT_ID) {
      console.error('❌ APPLE_CLIENT_ID not configured');
      return redirectWithError('server_config', state);
    }

    const JWKS = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URL));

    let payload: jose.JWTPayload;
    try {
      const { payload: verifiedPayload } = await jose.jwtVerify(idToken, JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: APPLE_CLIENT_ID,
      });
      payload = verifiedPayload;
      console.log('✅ id_token verified');
    } catch (verifyError) {
      console.error('❌ id_token verification failed:', verifyError);
      return redirectWithError('token_invalid', state);
    }

    const appleUserId = payload.sub as string;
    const email = payload.email as string | undefined;
    const emailVerified = payload.email_verified as boolean | undefined;

    // Parse user info (only sent on first sign-in)
    let firstName = '';
    let lastName = '';
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        firstName = userData?.name?.firstName || '';
        lastName = userData?.name?.lastName || '';
      } catch {
        console.log('⚠️ Could not parse user data');
      }
    }

    if (!email) {
      console.error('❌ No email in id_token');
      return redirectWithError('no_email', state);
    }

    // === Step 2: Find or create Supabase user ===
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Targeted user lookup by email (instead of loading all users)
    console.log('👤 Looking up user by email:', email);
    const { data: usersResponse, error: lookupError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Use REST API for filtered lookup since SDK doesn't support email filter
    const lookupRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1&filter=${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
      }
    );

    let userId: string;
    let existingUser = null;

    if (lookupRes.ok) {
      const lookupData = await lookupRes.json();
      const users = lookupData.users || lookupData;
      existingUser = Array.isArray(users)
        ? users.find((u: any) => u.email === email)
        : null;
    }

    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ Found existing user:', userId);

      await supabaseAdmin.auth.admin.updateUser(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          provider: 'apple',
          apple_sub: appleUserId,
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
        },
        email_confirm: true,
      });
    } else {
      console.log('👤 Creating new user for:', email);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          provider: 'apple',
          apple_sub: appleUserId,
          first_name: firstName,
          last_name: lastName,
          email_verified: emailVerified,
        },
      });

      if (createError) {
        console.error('❌ Failed to create user:', createError);
        return redirectWithError('user_creation_failed', state);
      }

      userId = newUser.user!.id;
      console.log('✅ Created new user:', userId);
    }

    // === Step 3: Generate session tokens ===
    console.log('🔑 Generating session tokens...');

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      console.error('❌ Failed to generate magic link:', linkError);
      return redirectWithError('session_generation_failed', state);
    }

    const linkUrl = new URL(linkData.properties.action_link);
    const tokenHash = linkUrl.searchParams.get('token') ||
                      linkUrl.hash?.replace('#', '') ||
                      linkData.properties.hashed_token;

    if (!tokenHash) {
      console.error('❌ No token hash in magic link');
      return redirectWithError('session_generation_failed', state);
    }

    const { data: sessionData, error: otpError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });

    if (otpError || !sessionData.session) {
      console.error('❌ Failed to verify OTP:', otpError);
      return redirectWithError('session_verification_failed', state);
    }

    const accessToken = sessionData.session.access_token;
    const refreshToken = sessionData.session.refresh_token;
    console.log('✅ Session tokens generated');

    // === Step 4: Redirect with tokens (HTML redirect for deeplink support) ===
    const APP_URL = Deno.env.get('APP_URL') || 'https://app.ditax.ch';

    if (deeplinkScheme) {
      const params = new URLSearchParams();
      params.set('access_token', accessToken);
      params.set('refresh_token', refreshToken);
      const redirectUrl = `${deeplinkScheme}://oauth/auth?${params.toString()}`;
      console.log('🔗 Redirecting to deeplink');
      return htmlRedirect(redirectUrl);
    } else {
      const redirectUrl = `${APP_URL}/auth?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
      console.log('🌐 Redirecting to web');
      return htmlRedirect(redirectUrl);
    }

  } catch (error: unknown) {
    console.error('❌ Unexpected error:', error);
    return redirectWithError('unknown', '');
  }
});
