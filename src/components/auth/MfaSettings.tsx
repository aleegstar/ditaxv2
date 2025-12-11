import React, { useState } from 'react';
import { Shield, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMfa } from '@/hooks/useMfa';
import { MfaEnrollmentFlow } from './MfaEnrollmentFlow';

export const MfaSettings: React.FC = () => {
  const [showEnrollment, setShowEnrollment] = useState(false);
  const { factors, isLoading, unenrollFactor, loadFactors } = useMfa();

  const handleRemoveFactor = async (factorId: string) => {
    try {
      await unenrollFactor(factorId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEnrollmentComplete = () => {
    setShowEnrollment(false);
    loadFactors();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Zwei-Faktor-Authentifizierung
          </CardTitle>
          <CardDescription>
            Fügen Sie eine zusätzliche Sicherheitsebene zu Ihrem Konto hinzu
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 md:space-y-6">
          {factors.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="text-sm">
                MFA ist nicht aktiviert. Ihre Kontosicherheit kann durch die Aktivierung der Zwei-Faktor-Authentifizierung verbessert werden.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
              <AlertDescription className="text-green-800 text-sm">
                MFA ist aktiv. Ihr Konto ist zusätzlich durch Zwei-Faktor-Authentifizierung geschützt.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h4 className="font-medium text-base">Authentifikator-Apps</h4>
              <Button 
                onClick={() => setShowEnrollment(true)}
                size="sm"
                disabled={isLoading}
                className="bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-10 text-sm font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[8px] w-full sm:w-auto"
                style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Hinzufügen
              </Button>
            </div>

            {factors.length > 0 ? (
              <div className="space-y-3">
                {factors.map((factor) => (
                  <div 
                    key={factor.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1">
                      <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base break-words">
                          {factor.friendly_name || 'Authenticator App'}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          TOTP • {factor.status === 'verified' ? 'Verifiziert' : 'Nicht verifiziert'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <Badge variant={factor.status === 'verified' ? 'default' : 'secondary'} className="text-xs">
                        {factor.status === 'verified' ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={isLoading}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>MFA-Gerät entfernen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sind Sie sicher, dass Sie dieses MFA-Gerät entfernen möchten? 
                              Dies reduziert die Sicherheit Ihres Kontos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveFactor(factor.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Entfernen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm sm:text-base">Keine Authentifikator-Apps konfiguriert</p>
                <p className="text-xs sm:text-sm mt-1">Fügen Sie eine App hinzu, um MFA zu aktivieren</p>
              </div>
            )}
          </div>

          {factors.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Backup-Optionen</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Stellen Sie sicher, dass Sie Zugriff auf Backup-Codes haben, falls Sie Ihr primäres MFA-Gerät verlieren.
              </p>
              <Button variant="outline" size="sm" disabled>
                Backup-Codes anzeigen (Coming Soon)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showEnrollment && (
        <MfaEnrollmentFlow
          onComplete={handleEnrollmentComplete}
          onCancel={() => setShowEnrollment(false)}
        />
      )}
    </>
  );
};