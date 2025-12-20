import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, Loader2, ArrowLeft } from 'lucide-react';
import { useEnhancedWebAuthn } from '@/hooks/use-enhanced-webauthn';

interface PasskeyRegistrationProps {
  onRegistrationSuccess?: () => void;
  onCancel?: () => void;
}

export const PasskeyRegistration: React.FC<PasskeyRegistrationProps> = ({
  onRegistrationSuccess,
  onCancel,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { isSupported, isLoading, registerPasskey } = useEnhancedWebAuthn();

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      return;
    }

    try {
      await registerPasskey(deviceName.trim());
      setDeviceName('');
      setIsOpen(false);
      onRegistrationSuccess?.();
    } catch (error) {
      // Error is already handled in the hook
      console.error('Passkey registration error:', error);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setDeviceName('');
    onCancel?.();
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Fingerprint & Passkey
          </CardTitle>
          <CardDescription>
            Fingerprint-Anmeldung wird auf diesem Gerät nicht unterstützt.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Fingerprint className="h-5 w-5" />
          Fingerprint einrichten
        </CardTitle>
        <CardDescription>
          Fügen Sie einen Fingerprint/Passkey für schnelle und sichere Anmeldung hinzu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOpen ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(true)}
            className="w-full"
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            Neuen Fingerprint erstellen
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Gerätename</Label>
              <Input
                id="device-name"
                placeholder="z.B. Mein iPhone, Laptop, etc."
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRegister();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleRegister}
                disabled={isLoading || !deviceName.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Erstelle...' : 'Fingerprint erstellen'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setDeviceName('');
                }}
                disabled={isLoading}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
