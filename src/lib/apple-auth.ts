/**
 * Apple Sign In via Apple JS SDK
 * 
 * On iOS (Despia), Apple Sign In should use the native Apple JS SDK
 * which triggers a Face ID / Touch ID dialog directly.
 * On Android, it falls back to the oauth:// protocol.
 * 
 * Flow:
 * 1. AppleID.auth.signIn() -> native dialog
 * 2. User authenticates with Face ID
 * 3. Apple returns id_token + authorization code
 * 4. We send id_token to Supabase signInWithIdToken()
 * 5. Session is created
 */

import { isDespiaIOS } from '@/lib/despia';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            code: string;
          };
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}

/**
 * Check if Apple JS SDK should be used for this platform
 * iOS (Despia) -> Apple JS SDK (native Face ID dialog)
 * Android -> oauth:// protocol  
 * Web -> Apple JS SDK (browser dialog)
 */
export const shouldUseAppleJSSDK = (): boolean => {
  // On iOS or web, use Apple JS SDK
  // On Android Despia, use oauth:// instead
  const isIOS = isDespiaIOS();
  const isWeb = !isDespiaIOS() && typeof navigator !== 'undefined' && !navigator.userAgent.toLowerCase().includes('despia');
  
  return isIOS || isWeb;
};

/**
 * Check if Apple JS SDK is loaded
 */
export const isAppleSDKLoaded = (): boolean => {
  return typeof window !== 'undefined' && !!window.AppleID;
};

/**
 * Sign in with Apple using the JS SDK
 * Returns the Supabase session on success
 */
export const signInWithAppleSDK = async (): Promise<{ success: boolean; error?: string }> => {
  if (!isAppleSDKLoaded()) {
    console.error('❌ Apple JS SDK not loaded');
    return { success: false, error: 'Apple SDK nicht geladen' };
  }

  try {
    // Initialize Apple JS SDK
    window.AppleID!.auth.init({
      clientId: 'ch.ditax.auth', // Apple Services ID - must be configured in Apple Developer Console
      scope: 'name email',
      redirectURI: 'https://app.ditax.ch/auth', // Not actually used with usePopup: true
      usePopup: true,
    });

    console.log('🍎 Starting Apple Sign In via JS SDK...');
    
    // Trigger native dialog (Face ID on iOS, popup on web)
    const response = await window.AppleID!.auth.signIn();
    
    console.log('🍎 Apple response received', {
      hasIdToken: !!response.authorization?.id_token,
      hasCode: !!response.authorization?.code,
      hasUser: !!response.user,
    });

    if (!response.authorization?.id_token) {
      return { success: false, error: 'Kein ID-Token von Apple erhalten' };
    }

    // Use Supabase's built-in signInWithIdToken for Apple
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: response.authorization.id_token,
    });

    if (error) {
      console.error('❌ Supabase signInWithIdToken error:', error);
      return { success: false, error: error.message };
    }

    if (data.session) {
      console.log('✅ Apple Sign In successful via JS SDK!');
      return { success: true };
    }

    return { success: false, error: 'Keine Session erstellt' };
  } catch (err: any) {
    // User cancelled the dialog
    if (err?.error === 'popup_closed_by_user' || err?.error === 'user_cancelled_authorize') {
      console.log('🍎 Apple Sign In cancelled by user');
      return { success: false, error: 'cancelled' };
    }
    
    console.error('❌ Apple Sign In error:', err);
    return { success: false, error: err?.message || 'Apple-Anmeldung fehlgeschlagen' };
  }
};
