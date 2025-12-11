import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { useEnhancedWebAuthn } from '@/hooks/use-enhanced-webauthn';
import { PasskeyRegistration } from './PasskeyRegistration';
import { OtpSecuritySettings } from './OtpSecuritySettings';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface PasskeyCredential {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}

export const PasskeyManager: React.FC = () => {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const { isSupported, getUserPasskeys, deletePasskey } = useEnhancedWebAuthn();

  const loadPasskeys = async () => {
    try {
      const data = await getUserPasskeys();
      setPasskeys(data);
    } catch (error) {
      console.error('Failed to load passkeys:', error);
    }
  };

  useEffect(() => {
    if (isSupported) {
      loadPasskeys();
    }
  }, [isSupported]);

  const handleDelete = async (passkeyId: string) => {
    setLoadingDelete(passkeyId);
    try {
      await deletePasskey(passkeyId);
      await loadPasskeys();
    } catch (error) {
      console.error('Failed to delete passkey:', error);
    } finally {
      setLoadingDelete(null);
    }
  };

  const handleRegistrationSuccess = () => {
    setShowRegistration(false);
    loadPasskeys();
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-muted-foreground" />
            Fingerprint & Passkey nicht verfügbar
          </CardTitle>
          <CardDescription>
            Ihr Gerät oder Browser unterstützt keine Fingerprint-Anmeldung (WebAuthn/Passkeys).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (showRegistration) {
    return (
      <PasskeyRegistration 
        onRegistrationSuccess={handleRegistrationSuccess}
        onCancel={() => setShowRegistration(false)}
      />
    );
  }

  // If no passkeys exist, show setup-style UI
  if (passkeys.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Fingerprint & Passkey einrichten
            </CardTitle>
            <CardDescription>
              Richte einen Fingerprint/Passkey ein, um dich zukünftig schnell und sicher mit deinem Fingerprint, Face ID oder PIN anzumelden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowRegistration(true)}
              className="w-full h-12 text-sm sm:text-base"
              variant="outline"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Fingerprint jetzt einrichten
            </Button>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                Nach der Einrichtung können Sie sich mit Fingerprint, Face ID oder PIN anmelden
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Show OTP settings even without passkeys */}
        <OtpSecuritySettings 
          passkeyCount={passkeys.length} 
          onSettingsChange={loadPasskeys}
        />
      </div>
    );
  }

  // If passkeys exist, show management UI
  return (
    <div className="space-y-6">
      {/* Add New Passkey Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Neuen Fingerprint & Passkey hinzufügen
          </CardTitle>
          <CardDescription>
            Fügen Sie einen weiteren Fingerprint/Passkey für ein anderes Gerät hinzu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowRegistration(true)}
            variant="outline"
            className="w-full h-12 text-sm sm:text-base"
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            Weiteren Fingerprint hinzufügen
          </Button>
        </CardContent>
      </Card>

      {/* OTP Security Settings */}
      <OtpSecuritySettings 
        passkeyCount={passkeys.length} 
        onSettingsChange={loadPasskeys}
      />

      {/* Existing Passkeys Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Meine Fingerprints & Passkeys
          </CardTitle>
          <CardDescription>
            Verwalte deine registrierten Fingerprints/Passkeys für verschiedene Geräte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3"
              >
                <div className="flex items-start sm:items-center gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                    <Fingerprint className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base break-words">{passkey.device_name}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Erstellt {formatDistanceToNow(new Date(passkey.created_at), { 
                        addSuffix: true, 
                        locale: de 
                      })}
                    </div>
                    {passkey.last_used_at && (
                      <div className="text-xs text-muted-foreground">
                        Zuletzt verwendet {formatDistanceToNow(new Date(passkey.last_used_at), { 
                          addSuffix: true, 
                          locale: de 
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <Badge variant="secondary" className="text-xs">Aktiv</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(passkey.id)}
                    disabled={loadingDelete === passkey.id}
                    className="h-8 w-8 p-0"
                  >
                    {loadingDelete === passkey.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
