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
 */
export const isDespiaNative = (): boolean => {
  // Check 1: despia-native package function available
  if (typeof despia === 'function') {
    console.log('✅ Despia detected via despia-native package');
    return true;
  }
  // Check 2: window.despia injected by native app
  if (typeof window !== 'undefined' && typeof (window as any).despia === 'function') {
    console.log('✅ Despia detected via window.despia');
    return true;
  }
  // Check 3: UserAgent fallback
  const hasUserAgent = typeof navigator !== 'undefined' && 
         navigator.userAgent.toLowerCase().includes('despia');
  if (hasUserAgent) {
    console.log('✅ Despia detected via UserAgent');
  }
  return hasUserAgent;
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
  console.log('🔗 Triggering Despia OAuth with URL:', oauthUrl);
  console.log('🔗 Encoded command:', `oauth://?url=${encodedUrl}`);
  
  // Try despia-native package first
  if (typeof despia === 'function') {
    console.log('📱 Using despia-native package');
    despia(`oauth://?url=${encodedUrl}`);
    return;
  }
  
  // Fallback to window.despia
  if (typeof (window as any).despia === 'function') {
    console.log('📱 Using window.despia fallback');
    (window as any).despia(`oauth://?url=${encodedUrl}`);
    return;
  }
  
  console.error('❌ Despia SDK not available - neither despia-native nor window.despia found');
  throw new Error('Despia SDK not available');
};
