/**
 * Despia SDK Helper Functions
 * Centralized utilities for Despia native app integration
 * 
 * Deeplink Format: {scheme}://oauth/{path}?params
 * - scheme: Your app's deeplink scheme (e.g., ditax)
 * - oauth/: Required prefix - tells native code to close browser session
 * - path: Where to navigate in your app (e.g., auth)
 * - params: Query params passed to that page
 * 
 * Example: ditax://oauth/auth?access_token=xxx
 * -> Closes ASWebAuthenticationSession/Chrome Custom Tab
 * -> Navigates WebView to /auth?access_token=xxx
 */
import despia from 'despia-native';

// Deeplink scheme configured in Despia Dashboard
export const DEEPLINK_SCHEME = "ditax";

// Supabase configuration
export const SUPABASE_URL = "https://gqbhilftduwxjszznnzy.supabase.co";

/**
 * Check if running in Despia native environment
 * IMPORTANT: Only use UserAgent check - the despia-native package is always available,
 * even in browsers, so checking for it would give false positives
 */
export const isDespiaNative = (): boolean => {
  const isDespia = typeof navigator !== 'undefined' && 
         navigator.userAgent.toLowerCase().includes('despia');
  
  // Only log in development to reduce noise
  if (isDespia) {
    console.log('📱 Despia native detected');
  }
  
  return isDespia;
};

/**
 * Build a deeplink URL for native app navigation
 */
export const buildDeeplinkUrl = (path: string, params: Record<string, string>): string => {
  const queryString = new URLSearchParams(params).toString();
  return `${DEEPLINK_SCHEME}://oauth/${path}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Build OAuth URL for Despia Easy OAuth flow
 * Uses Implicit Grant (response_type: token) as per Despia docs
 */
export const buildOAuthUrl = (provider: 'google' | 'apple', redirectTo: string): string => {
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    response_type: 'token',
    scope: 'openid email profile',
  });
  
  return `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
};

/**
 * Detect if running on iOS in Despia
 */
export const isDespiaIOS = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return isDespiaNative() && (ua.includes('iphone') || ua.includes('ipad'));
};

/**
 * Detect if running on Android in Despia
 */
export const isDespiaAndroid = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return isDespiaNative() && ua.includes('android');
};

/**
 * Trigger Despia Easy OAuth flow using the oauth:// protocol
 * 
 * According to Despia documentation:
 * Uses despia('oauth://?url=...') to open OAuth in secure browser session
 * (ASWebAuthenticationSession on iOS, Chrome Custom Tabs on Android)
 * 
 * @returns true if despia() was called successfully, false otherwise
 */
export const triggerDespiaOAuth = (oauthUrl: string): boolean => {
  console.log('🔗 triggerDespiaOAuth called');
  console.log('📱 User Agent:', navigator.userAgent);
  console.log('🔗 OAuth URL:', oauthUrl);
  
  // Use Despia SDK oauth:// protocol to open in secure browser session
  const despiaCommand = `oauth://?url=${encodeURIComponent(oauthUrl)}`;
  console.log('📱 Despia command:', despiaCommand);
  
  try {
    despia(despiaCommand);
    console.log('✅ despia() called successfully');
    return true;
  } catch (error) {
    console.error('❌ despia() call failed:', error);
    return false;
  }
};

/**
 * Trigger Despia Passkey Authentication via System Browser
 * Opens the WebAuthn auth page in the system browser (not WebView)
 * which allows full access to the device's keychain for passkey auth
 */
export const triggerDespiaPasskeyAuth = (email?: string): void => {
  // Build the WebAuthn auth URL with optional email parameter
  // The WebAuthn page will handle email input if not provided
  const params = new URLSearchParams({ despia: 'true' });
  if (email) {
    params.set('email', email);
  }
  
  const authUrl = `https://app.ditax.ch/webauthn-auth?${params.toString()}`;
  
  console.log('🔐 Triggering Despia Passkey Auth via System Browser:', authUrl);
  
  // Use the same mechanism as OAuth to open in system browser
  triggerDespiaOAuth(authUrl);
};
