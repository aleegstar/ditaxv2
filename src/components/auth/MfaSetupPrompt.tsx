import React from 'react';
import { Shield, X, Clock, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMfaPrompt } from '@/hooks/useMfaPrompt';

interface MfaSetupPromptProps {
  userId: string;
  onSetupNow: () => void;
  onClose: () => void;
}

export const MfaSetupPrompt: React.FC<MfaSetupPromptProps> = ({
  userId,
  onSetupNow,
  onClose
}) => {
  const { dismissMfaPrompt } = useMfaPrompt(userId);

  const handleSetupNow = async () => {
    await dismissMfaPrompt(false);
    onSetupNow();
  };

  const handleLater = async () => {
    await dismissMfaPrompt(false);
    onClose();
  };

  const handleNever = async () => {
    await dismissMfaPrompt(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto bg-background border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Mehr Sicherheit für Ihr Konto?</CardTitle>
            <CardDescription className="mt-2">
              Aktivieren Sie die Zwei-Faktor-Authentifizierung (2FA) für zusätzlichen Schutz
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <span>Schutz vor unbefugtem Zugriff</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <span>Sicherer Login mit Authentifikator-App</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <span>Einfache Einrichtung in 2 Minuten</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleSetupNow}
              className="w-full"
              size="lg"
            >
              <Shield className="w-4 h-4 mr-2" />
              Jetzt einrichten
            </Button>
            
            <Button 
              onClick={handleLater}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Clock className="w-4 h-4 mr-2" />
              Später erinnern
            </Button>
            
            <Button 
              onClick={handleNever}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              size="sm"
            >
              <Ban className="w-4 h-4 mr-2" />
              Nicht mehr fragen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};