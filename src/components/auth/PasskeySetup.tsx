
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, Plus, CheckCircle } from 'lucide-react';
import { useWebAuthn } from '@/hooks/use-webauthn';
import { PasskeyRegistration } from './PasskeyRegistration';

interface PasskeySetupProps {
  onSetupComplete?: () => void;
  className?: string;
}

export const PasskeySetup: React.FC<PasskeySetupProps> = ({
  onSetupComplete,
  className,
}) => {
  const [showRegistration, setShowRegistration] = useState(false);
  const { isSupported } = useWebAuthn();

  const handleRegistrationSuccess = () => {
    setShowRegistration(false);
    onSetupComplete?.();
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-muted-foreground" />
            Fingerprint & Passkey nicht verfügbar
          </CardTitle>
          <CardDescription>
            Dein Gerät oder Browser unterstützt keine Fingerprint-Anmeldung (WebAuthn/Passkeys).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (showRegistration) {
    return (
      <div className={className}>
        <PasskeyRegistration 
          onRegistrationSuccess={handleRegistrationSuccess}
          onCancel={() => setShowRegistration(false)}
        />
      </div>
    );
  }

  return (
    <Card className={className}>
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
          className="w-full"
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
  );
};
