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
  return `${DEEPLINK_SCHEME}://${path}${queryString ? `?${queryString}` : ''}`;
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
 * Trigger Despia Easy OAuth flow
 * Uses the new format: oauth://?url=ENCODED_URL
 */
export const triggerDespiaOAuth = (oauthUrl: string): void => {
  const encodedUrl = encodeURIComponent(oauthUrl);
  const command = `oauth://?url=${encodedUrl}`;
  
  console.log('🔗 Triggering Despia OAuth with URL:', oauthUrl);
  console.log('🔗 Encoded command:', command);
  
  // Try despia-native package first
  if (typeof despia === 'function') {
    console.log('📱 Using despia-native package');
    try {
      despia(command);
      console.log('✅ despia-native called successfully');
      return;
    } catch (e) {
      console.error('❌ despia-native call failed:', e);
    }
  }
  
  // Fallback to window.despia
  if (typeof (window as any).despia === 'function') {
    console.log('📱 Using window.despia fallback');
    try {
      (window as any).despia(command);
      console.log('✅ window.despia called successfully');
      return;
    } catch (e) {
      console.error('❌ window.despia call failed:', e);
    }
  }
  
  console.error('❌ Despia SDK not available - neither despia-native nor window.despia found');
  console.log('🔍 typeof despia:', typeof despia);
  console.log('🔍 typeof window.despia:', typeof (window as any).despia);
  
  // As a last resort, try to open the URL directly (won't work in WebView but better than nothing)
  console.log('🔗 Attempting direct window.location redirect as fallback...');
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
  
  // Use the Easy OAuth mechanism to open in system browser
  triggerDespiaOAuth(authUrl);
};

/**
 * Trigger Despia Passkey Registration via System Browser
 * Opens the passkey registration page in the system browser (not WebView)
 * which allows full access to the device's keychain for passkey creation
 */
export const triggerDespiaPasskeyRegistration = (): void => {
  const registerUrl = `${window.location.origin}/passkey-register?despia=true`;
  
  console.log('🔐 Opening Passkey Registration in System Browser:', registerUrl);
  
  // Use the Easy OAuth mechanism to open in system browser
  triggerDespiaOAuth(registerUrl);
};
