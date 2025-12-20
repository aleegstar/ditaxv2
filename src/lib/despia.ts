/**
 * Despia SDK Helper Functions
 * Centralized utilities for Despia native app integration
 */

// Deeplink scheme configured in Despia Dashboard
export const DEEPLINK_SCHEME = "ditax";

// Supabase configuration
export const SUPABASE_URL = "https://gqbhilftduwxjszznnzy.supabase.co";

/**
 * Check if running in Despia native environment
 */
export const isDespiaNative = (): boolean => {
  if (typeof window !== 'undefined' && typeof (window as any).despia !== 'undefined') {
    return true;
  }
  return typeof navigator !== 'undefined' && 
         navigator.userAgent.toLowerCase().includes('despia');
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
  if (typeof (window as any).despia === 'function') {
    const encodedUrl = encodeURIComponent(oauthUrl);
    console.log('🔗 Triggering Despia OAuth with URL:', oauthUrl);
    (window as any).despia(`oauth://?url=${encodedUrl}`);
  } else {
    console.error('Despia function not available');
  }
};
