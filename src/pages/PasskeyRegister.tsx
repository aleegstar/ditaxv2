import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Fingerprint, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildDeeplinkUrl, DEEPLINK_SCHEME } from '@/lib/despia';
import ditaxLogo from '@/assets/ditax-logo-new.png';

/**
 * Dedicated page for Passkey registration via System Browser (Despia)
 * This page is opened in the system browser to allow full access to the keychain
 */
const PasskeyRegister: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isDespia = searchParams.get('despia') === 'true';
  
  const [status, setStatus] = useState<'checking' | 'ready' | 'registering' | 'success' | 'error'>('checking');
  const [deviceName, setDeviceName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  // Check WebAuthn support
  const isWebAuthnSupported = typeof window !== 'undefined' && 
    window.PublicKeyCredential !== undefined &&
    typeof navigator.credentials !== 'undefined' &&
    typeof navigator.credentials.create === 'function';

  // Check user session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
          console.error('❌ No valid session for passkey registration');
          setStatus('error');
          setErrorMessage('Sie müssen angemeldet sein, um einen Fingerprint zu registrieren.');
          return;
        }

        setUser(session.user);
        
        if (!isWebAuthnSupported) {
          setStatus('error');
          setErrorMessage('Fingerprint-Registrierung wird auf diesem Gerät nicht unterstützt.');
          return;
        }

        setStatus('ready');
      } catch (err) {
        console.error('❌ Session check error:', err);
        setStatus('error');
        setErrorMessage('Fehler beim Überprüfen der Anmeldung.');
      }
    };

    checkSession();
  }, [isWebAuthnSupported]);

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

  const handleRegister = async () => {
    if (!deviceName.trim() || !user) return;

    setStatus('registering');

    try {
      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

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
          { alg: -7, type: 'public-key' },   // ES256
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

      console.log('🔐 Creating passkey credential...');
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Fingerprint-Registrierung wurde abgebrochen.');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKeyBytes = new Uint8Array(response.getPublicKey()!);

      // Store in Supabase
      const { error } = await supabase
        .from('user_passkeys')
        .insert({
          user_id: user.id,
          credential_id: arrayBufferToBase64Url(credential.rawId),
          public_key: arrayBufferToBase64Url(publicKeyBytes.buffer),
          device_name: deviceName.trim(),
        });

      if (error) throw error;

      console.log('✅ Passkey registered successfully');
      setStatus('success');

      // Redirect back to app after short delay
      setTimeout(() => {
        if (isDespia) {
          // Redirect via deeplink
          const deeplink = buildDeeplinkUrl('passkey-registered', { status: 'success' });
          console.log('🔗 Redirecting to app:', deeplink);
          window.location.href = deeplink;
        } else {
          navigate('/profile');
        }
      }, 1500);

    } catch (error: any) {
      console.error('❌ Passkey registration error:', error);
      setStatus('error');
      
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Fingerprint-Registrierung wurde abgebrochen oder nicht erlaubt.');
      } else if (error.name === 'InvalidStateError') {
        setErrorMessage('Dieser Fingerprint ist bereits registriert.');
      } else {
        setErrorMessage(error.message || 'Unbekannter Fehler bei der Registrierung.');
      }
    }
  };

  const handleBack = () => {
    if (isDespia) {
      const deeplink = buildDeeplinkUrl('passkey-registered', { status: 'cancelled' });
      window.location.href = deeplink;
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <img 
        src={ditaxLogo} 
        alt="DiTax" 
        className="h-10 mb-8"
      />

      {/* Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-6">
        {status === 'checking' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Session wird überprüft...</p>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Fingerprint className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Fingerprint einrichten</h1>
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              Geben Sie einen Namen für dieses Gerät ein und bestätigen Sie mit Ihrem Fingerprint, Face ID oder PIN.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Gerätename</Label>
                <Input
                  id="device-name"
                  placeholder="z.B. Mein iPhone, Laptop, etc."
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && deviceName.trim()) {
                      handleRegister();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleRegister}
                disabled={!deviceName.trim()}
                className="w-full"
              >
                <Fingerprint className="mr-2 h-4 w-4" />
                Fingerprint registrieren
              </Button>

              <Button variant="outline" onClick={handleBack} className="w-full">
                Abbrechen
              </Button>
            </div>
          </>
        )}

        {status === 'registering' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-foreground font-medium">Fingerprint wird registriert...</p>
            <p className="text-muted-foreground text-sm text-center">
              Bitte bestätigen Sie mit Ihrem Fingerprint, Face ID oder PIN.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-foreground font-medium">Fingerprint erfolgreich registriert!</p>
            <p className="text-muted-foreground text-sm text-center">
              Sie werden zur App weitergeleitet...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-foreground font-medium">Registrierung fehlgeschlagen</p>
            <p className="text-muted-foreground text-sm text-center">{errorMessage}</p>
            <Button onClick={handleBack} className="mt-4">
              Zurück zur App
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasskeyRegister;
