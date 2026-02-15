import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

/**
 * auth-apple-callback Edge Function
 * 
 * Receives Apple's form_post callback with id_token, code, state, and user data.
 * Verifies the id_token using Apple's JWKS public keys, creates/finds the Supabase
 * user, generates session tokens, and redirects back to the app.
 * 
 * Flow:
 * 1. Apple POSTs form data after user authenticates
 * 2. Parse state to determine if native (contains deeplink scheme)
 * 3. Verify id_token with Apple JWKS
 * 4. Create or find Supabase user via Admin API
 * 5. Generate session via magic link + OTP verification
 * 6. Redirect with tokens (deeplink for native, URL for web)
 */

const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

serve(async (req) => {
  // Apple sends a POST with form data
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const idToken = formData.get('id_token') as string;
    const code = formData.get('code') as string;
    const state = formData.get('state') as string;
    const userStr = formData.get('user') as string | null;

    console.log('🍎 auth-apple-callback: Received callback', {
      hasIdToken: !!idToken,
      hasCode: !!code,
      state,
      hasUser: !!userStr,
    });

    if (!idToken) {
      console.error('❌ No id_token received');
      return redirectWithError('no_id_token', state);
    }

    // Parse state to detect native flow
    // Format: "uuid|scheme" for native, "uuid" for web
    let deeplinkScheme: string | null = null;
    if (state && state.includes('|')) {
      deeplinkScheme = state.split('|')[1];
      console.log('🔗 Native flow detected, scheme:', deeplinkScheme);
    }

    // === Step 1: Verify id_token with Apple JWKS ===
    console.log('🔐 Verifying id_token with Apple JWKS...');
    
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
      console.log('✅ id_token verified successfully');
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
        console.log('👤 User info from Apple:', { firstName, lastName });
      } catch {
        console.log('⚠️ Could not parse user data');
      }
    }

    if (!email) {
      console.error('❌ No email in id_token');
      return redirectWithError('no_email', state);
    }

    // === Step 2: Create or find Supabase user ===
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('👤 Looking up user by email:', email);

    // Try to find existing user
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    let userId: string;
    
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ Found existing user:', userId);
      
      // Update user metadata with Apple provider info
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
      // Create new user
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
    
    // Generate a magic link to get a valid token
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      console.error('❌ Failed to generate magic link:', linkError);
      return redirectWithError('session_generation_failed', state);
    }

    // Extract the token hash from the link
    const linkUrl = new URL(linkData.properties.action_link);
    const tokenHash = linkUrl.searchParams.get('token') || 
                      linkUrl.hash?.replace('#', '') ||
                      linkData.properties.hashed_token;

    if (!tokenHash) {
      console.error('❌ No token hash in magic link');
      return redirectWithError('session_generation_failed', state);
    }

    // Verify the OTP to get actual session tokens
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

    console.log('✅ Session tokens generated successfully');

    // === Step 4: Redirect with tokens ===
    const APP_URL = Deno.env.get('APP_URL') || 'https://app.ditax.ch';

    if (deeplinkScheme) {
      // Native flow: redirect to deeplink
      const deeplinkParams = new URLSearchParams();
      deeplinkParams.set('access_token', accessToken);
      deeplinkParams.set('refresh_token', refreshToken);
      const redirectUrl = `${deeplinkScheme}://oauth/auth?${deeplinkParams.toString()}`;
      console.log('🔗 Redirecting to deeplink:', redirectUrl);
      return Response.redirect(redirectUrl, 302);
    } else {
      // Web flow: redirect to app with tokens
      const redirectUrl = `${APP_URL}/auth?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
      console.log('🌐 Redirecting to web:', redirectUrl);
      return Response.redirect(redirectUrl, 302);
    }

  } catch (error: unknown) {
    console.error('❌ auth-apple-callback: Unexpected error:', error);
    return redirectWithError('unknown', '');
  }
});

/**
 * Helper to redirect back with an error
 */
function redirectWithError(error: string, state: string | null): Response {
  let deeplinkScheme: string | null = null;
  if (state && state.includes('|')) {
    deeplinkScheme = state.split('|')[1];
  }

  const APP_URL = Deno.env.get('APP_URL') || 'https://app.ditax.ch';

  if (deeplinkScheme) {
    const redirectUrl = `${deeplinkScheme}://oauth/auth?error=${encodeURIComponent(error)}`;
    return Response.redirect(redirectUrl, 302);
  } else {
    const redirectUrl = `${APP_URL}/auth?error=${encodeURIComponent(error)}`;
    return Response.redirect(redirectUrl, 302);
  }
}
