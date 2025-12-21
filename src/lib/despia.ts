/**
 * Despia SDK Helper Functions
 * Centralized utilities for Despia native app integration
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
  
  console.log('🔍 Despia detection:', {
    userAgent: navigator?.userAgent,
    includesDespia: isDespia
  });
  
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
 * Trigger Despia Easy OAuth flow
 * 
 * According to Despia documentation:
 * - Android: Use window.location.href - Despia automatically opens OAuth URLs in external browser
 * - iOS: Use window.open with _blank to open in in-app browser
 * 
 * No special protocol needed - Despia intercepts standard navigation for OAuth
 */
export const triggerDespiaOAuth = (oauthUrl: string): void => {
  console.log('🔗 Triggering Despia OAuth with URL:', oauthUrl);
  
  if (isDespiaIOS()) {
    // iOS: Use window.open to open in in-app browser
    console.log('📱 iOS: Opening OAuth in in-app browser via window.open');
    window.open(oauthUrl, '_blank');
    return;
  }
  
  if (isDespiaAndroid()) {
    // Android: Use window.location.href - Despia opens external OAuth links in system browser
    console.log('📱 Android: Redirecting to OAuth (Despia opens in external browser)');
    window.location.href = oauthUrl;
    return;
  }
  
  // Fallback for unknown Despia platform - try window.location.href
  console.log('📱 Unknown Despia platform: Using window.location.href fallback');
  window.location.href = oauthUrl;
};

/**
 * Trigger Despia Passkey Authentication via System Browser
 * Opens the WebAuthn auth page in the system browser (not WebView)
 * which allows full access to the device's keychain for passkey auth
 */
export const triggerDespiaPasskeyAuth = (email: string): void => {
  // Build the WebAuthn auth URL with email parameter
  // The native-callback page will handle the redirect back to the app
  const authUrl = `${window.location.origin}/webauthn-auth?email=${encodeURIComponent(email)}&despia=true`;
  
  console.log('🔐 Triggering Despia Passkey Auth via System Browser:', authUrl);
  
  // Use the same mechanism as OAuth to open in system browser
  triggerDespiaOAuth(authUrl);
};
