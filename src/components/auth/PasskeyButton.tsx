
import React from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2 } from 'lucide-react';
import { useWebAuthn } from '@/hooks/use-webauthn';

interface PasskeyButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export const PasskeyButton: React.FC<PasskeyButtonProps> = ({
  onSuccess,
  className,
}) => {
  const { isSupported, isLoading, authenticateWithPasskey } = useWebAuthn();

  const handlePasskeyAuth = async () => {
    try {
      await authenticateWithPasskey();
      onSuccess?.();
    } catch (error) {
      // Error is already handled in the hook
      console.error('Passkey authentication error:', error);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handlePasskeyAuth}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Fingerprint className="mr-2 h-4 w-4" />
      )}
      {isLoading ? 'Authentifizierung...' : 'Mit Fingerprint anmelden'}
    </Button>
  );
};
