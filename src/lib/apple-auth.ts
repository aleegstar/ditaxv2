/**
 * Apple OAuth Helper - Direct Apple Sign In (bypassing Supabase OAuth)
 * 
 * Uses Apple's authorization endpoint directly with response_mode=form_post.
 * Apple POSTs the result to our auth-apple-callback Edge Function,
 * which verifies the token and redirects back via deeplink.
 * 
 * Based on Despia Apple OAuth documentation.
 */

// Apple's public Client ID (Service ID) - this is a publishable value
const APPLE_CLIENT_ID = 'com.ditax.web';

const APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
const EDGE_FUNCTION_URL = 'https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/auth-apple-callback';

/**
 * Generate a random state string for CSRF protection
 */
const generateState = (): string => {
  return crypto.randomUUID();
};

/**
 * Build the Apple OAuth URL
 * 
 * @param isNative - Whether this is a native Despia flow
 * @param deeplinkScheme - The deeplink scheme (e.g., 'ditax') for native flows
 * @returns The full Apple OAuth URL to open in the browser
 */
export const getAppleOAuthUrl = (isNative: boolean, deeplinkScheme?: string): string => {
  // Encode deeplink scheme in state for native flows
  // Format: uuid|scheme (e.g., "abc-123|ditax")
  const stateBase = generateState();
  const state = isNative && deeplinkScheme 
    ? `${stateBase}|${deeplinkScheme}` 
    : stateBase;

  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    redirect_uri: EDGE_FUNCTION_URL,
    state,
  });

  return `${APPLE_AUTH_URL}?${params.toString()}`;
};
