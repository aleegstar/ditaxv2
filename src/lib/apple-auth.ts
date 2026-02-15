/**
 * Apple Auth Helper for iOS Despia native flow
 * 
 * On iOS, ASWebAuthenticationSession has isolated storage,
 * so the standard Supabase OAuth flow doesn't work.
 * Instead, we build a direct Apple OAuth URL with form_post
 * that sends the id_token to our auth-apple-callback Edge Function.
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

// Apple Service ID (publishable, safe to hardcode)
const APPLE_CLIENT_ID = 'com.ditax.web';

const SUPABASE_URL = 'https://gqbhilftduwxjszznnzy.supabase.co';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/auth-apple-callback`;

/**
 * Build direct Apple OAuth URL for iOS native flow
 * Uses response_mode: form_post (required by Apple for name/email scopes)
 * 
 * @param isNative - Whether running in native app context
 * @param deeplinkScheme - The app's deeplink scheme (e.g., "ditax")
 * @returns The Apple authorization URL
 */
export const getAppleOAuthUrl = (isNative: boolean, deeplinkScheme: string): string => {
  // State contains UUID + deeplink scheme separated by pipe for native detection
  const state = isNative ? `${uuidv4()}|${deeplinkScheme}` : uuidv4();

  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    redirect_uri: REDIRECT_URI,
    state,
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
};

/**
 * Set Supabase session from Apple auth tokens
 * Reuses the existing token handling in Auth.tsx useEffect
 */
export const setAppleSession = async (accessToken: string, refreshToken: string) => {
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error('Failed to set Apple session:', error);
    throw error;
  }

  return data;
};
