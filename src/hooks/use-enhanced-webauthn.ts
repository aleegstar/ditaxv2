import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { debug } from '@/utils/debug';

interface PasskeyCredential {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}

interface PasskeyCheckResult {
  has_passkeys: boolean;
  passkey_count: number;
}

export function useEnhancedWebAuthn() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if WebAuthn is supported
  const isSupported = useCallback(() => {
    return typeof window !== 'undefined' && 
           window.PublicKeyCredential !== undefined &&
           typeof navigator.credentials !== 'undefined' &&
           typeof navigator.credentials.create === 'function';
  }, []);

  // Generate random bytes for challenge
  const generateChallenge = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array;
  };

  // Convert ArrayBuffer to base64url
  const arrayBufferToBase64Url = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  // Check if passkeys exist for an email (public function)
  const checkPasskeysForEmail = useCallback(async (email: string): Promise<PasskeyCheckResult> => {
    try {
      debug.log('🔍 Checking passkeys for email:', email);
      
      const { data, error } = await supabase.functions.invoke('check-passkeys', {
        body: { email }
      });

      if (error) {
        debug.error('❌ Error checking passkeys:', error);
        return { has_passkeys: false, passkey_count: 0 };
      }

      debug.log('✅ Passkey check result:', data);
      return data || { has_passkeys: false, passkey_count: 0 };
    } catch (error) {
      debug.error('❌ Exception checking passkeys:', error);
      return { has_passkeys: false, passkey_count: 0 };
    }
  }, []);

  // Register a new passkey (requires authentication)
  const registerPasskey = useCallback(async (deviceName: string = 'Unknown Device') => {
    if (!isSupported()) {
      throw new Error('WebAuthn is not supported on this device');
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const challenge = generateChallenge();
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'DiTax',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.email || 'user@example.com',
          displayName: user.email || 'User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'direct',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKeyBytes = new Uint8Array(response.getPublicKey()!);
      
      // Store the credential in Supabase
      const { error } = await supabase
        .from('user_passkeys')
        .insert({
          user_id: user.id,
          credential_id: arrayBufferToBase64Url(credential.rawId),
          public_key: arrayBufferToBase64Url(publicKeyBytes.buffer),
          device_name: deviceName,
        });

      if (error) throw error;

      toast({
        title: 'Passkey erstellt',
        description: 'Ihr Passkey wurde erfolgreich registriert.',
      });

      return true;
    } catch (error: any) {
      console.error('Passkey registration failed:', error);
      toast({
        title: 'Registrierung fehlgeschlagen',
        description: error.message || 'Passkey konnte nicht erstellt werden.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, toast]);

  // Authenticate with passkey using Edge Function
  const authenticateWithPasskey = useCallback(async (email: string) => {
    if (!isSupported()) {
      throw new Error('WebAuthn wird auf diesem Gerät nicht unterstützt');
    }

    setIsLoading(true);
    try {
      debug.log('🚀 Starting passkey authentication for:', email);
      
      const challenge = generateChallenge();
      
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: 'required',
      };

      debug.log('🔐 Requesting credentials from browser...');
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Fingerprint-Authentifizierung wurde vom Benutzer abgebrochen');
      }

      const credentialId = arrayBufferToBase64Url(credential.rawId);
      const response = credential.response as AuthenticatorAssertionResponse;
      const signature = arrayBufferToBase64Url(response.signature);
      const authenticatorData = arrayBufferToBase64Url(response.authenticatorData);
      const clientDataJSON = arrayBufferToBase64Url(response.clientDataJSON);
      
      debug.log('🔑 Credential obtained, calling Edge Function...');
      debug.log('📊 Authentication data prepared:', {
        credentialId: credentialId.substring(0, 10) + '...',
        challengeLength: challenge.length,
        signatureLength: signature.length,
        hasAuthenticatorData: !!authenticatorData,
        hasClientDataJSON: !!clientDataJSON
      });

      // Call the enhanced passkey authentication Edge Function with full crypto data
      const { data, error } = await supabase.functions.invoke('passkey-authenticate', {
        body: {
          credentialId,
          challenge: arrayBufferToBase64Url(challenge.buffer),
          signature,
          authenticatorData,
          clientDataJSON,
          email
        }
      });

      debug.log('📡 Edge Function response:', { 
        hasData: !!data, 
        success: data?.success,
        hasSession: !!data?.session,
        error: error 
      });

      if (error) {
        debug.error('❌ Edge Function error:', error);
        
        // Enhanced error handling with more specific messages
        if (error.message?.includes('Server configuration error')) {
          throw new Error('Server-Konfigurationsfehler - bitte kontaktieren Sie den Support');
        } else if (error.message?.includes('Missing required parameters')) {
          throw new Error('Ungültige Authentifizierungsdaten - bitte versuchen Sie es erneut');
        } else if (error.message?.includes('User not found')) {
          throw new Error('Benutzer nicht gefunden - ist Ihr Fingerprint für dieses Konto registriert?');
        } else if (error.message?.includes('Passkey not found')) {
          throw new Error('Fingerprint nicht gefunden - bitte registrieren Sie einen neuen Fingerprint');
        } else if (error.message?.includes('Failed to create')) {
          throw new Error('Session konnte nicht erstellt werden - bitte versuchen Sie es erneut');
        } else if (error.message?.includes('non-2xx status code')) {
          throw new Error('Server-Fehler bei der Authentifizierung - bitte versuchen Sie es später erneut');
        } else if (error.message?.includes('Password update failed') || error.message?.includes('Sign in failed')) {
          throw new Error('Authentifizierung fehlgeschlagen - bitte versuchen Sie es erneut');
        }
        
        throw new Error(`Fingerprint-Authentifizierung fehlgeschlagen: ${error.message || 'Unbekannter Server-Fehler'}`);
      }

      if (!data?.success) {
        debug.error('❌ Authentication failed:', data);
        
        const errorDetails = data?.details || data?.error || 'Unbekannter Fehler';
        
        if (errorDetails.includes('not found')) {
          throw new Error('Fingerprint nicht in der Datenbank gefunden - bitte registrieren Sie einen neuen');
        } else if (errorDetails.includes('inactive')) {
          throw new Error('Fingerprint ist deaktiviert - bitte kontaktieren Sie den Support');
        } else if (errorDetails.includes('User information incomplete')) {
          throw new Error('Benutzerinformationen unvollständig - bitte kontaktieren Sie den Support');
        } else if (errorDetails.includes('verification failed')) {
          throw new Error('Fingerprint-Verifikation fehlgeschlagen - bitte versuchen Sie es erneut');
        }
        
        throw new Error(`Fingerprint-Authentifizierung fehlgeschlagen: ${errorDetails}`);
      }

      debug.log('✅ Passkey authentication successful, setting session...');

      if (!data.session?.access_token) {
        debug.error('❌ No access token in response:', data);
        throw new Error('Keine gültigen Authentifizierungstoken erhalten - bitte versuchen Sie es erneut');
      }

      // Set the session in Supabase with enhanced error handling
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token || data.session.access_token
      });

      if (sessionError) {
        debug.error('❌ Session setup failed:', sessionError);
        
        if (sessionError.message?.includes('Invalid JWT')) {
          throw new Error('Ungültige Authentifizierungstoken - bitte versuchen Sie es erneut');
        } else if (sessionError.message?.includes('expired')) {
          throw new Error('Authentifizierungstoken abgelaufen - bitte versuchen Sie es erneut');
        }
        
        throw new Error(`Session konnte nicht eingerichtet werden: ${sessionError.message}`);
      }

      // Verify the session was actually set
      const { data: verifySession } = await supabase.auth.getSession();
      if (!verifySession.session) {
        debug.error('❌ Session verification failed after setting');
        throw new Error('Session konnte nicht verifiziert werden - bitte versuchen Sie es erneut');
      }

      debug.log('🎉 Complete passkey authentication successful');
      
      toast({
        title: 'Anmeldung erfolgreich',
        description: 'Sie wurden erfolgreich mit Ihrem Fingerprint angemeldet.',
      });

      return { success: true };
      
    } catch (error: any) {
      debug.error('❌ Passkey authentication failed:', error);
      
      // Don't show toast for user-cancelled operations
      if (error.message?.includes('abgebrochen') || error.name === 'NotAllowedError') {
        throw error;
      }
      
      toast({
        title: 'Fingerprint-Anmeldung fehlgeschlagen',
        description: error.message || 'Unbekannter Fehler bei der Fingerprint-Authentifizierung.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, toast]);

  // Get user's passkeys (requires authentication)
  const getUserPasskeys = useCallback(async (): Promise<PasskeyCredential[]> => {
    const { data, error } = await supabase
      .from('user_passkeys')
      .select('id, device_name, created_at, last_used_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }, []);

  // Enhanced deletePasskey with automatic OTP reactivation
  const deletePasskey = useCallback(async (passkeyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, deactivate the passkey
    const { error } = await supabase
      .from('user_passkeys')
      .update({ is_active: false })
      .eq('id', passkeyId);

    if (error) throw error;

    // Check if this was the last active passkey
    const { data: remainingPasskeys, error: countError } = await supabase
      .from('user_passkeys')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (countError) throw countError;

    // If no passkeys remain, automatically re-enable OTP
    if (remainingPasskeys && remainingPasskeys.length === 0) {
      const { error: otpResetError } = await supabase
        .from('profiles')
        .update({ disable_otp_fallback: false })
        .eq('id', user.id);

      if (otpResetError) {
        console.error('Failed to re-enable OTP:', otpResetError);
      } else {
        toast({
          title: 'Letzter Fingerprint entfernt',
          description: 'E-Mail-Codes wurden automatisch wieder aktiviert, da keine Fingerprints mehr vorhanden sind.',
        });
        return;
      }
    }

    toast({
      title: 'Passkey entfernt',
      description: 'Der Passkey wurde erfolgreich deaktiviert.',
    });
  }, [toast]);

  return {
    isSupported: isSupported(),
    isLoading,
    registerPasskey,
    authenticateWithPasskey,
    getUserPasskeys,
    deletePasskey,
    checkPasskeysForEmail,
  };
}
