
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEnhancedWebAuthn } from '@/hooks/use-enhanced-webauthn';

interface OtpSecuritySettingsProps {
  passkeyCount: number;
  onSettingsChange?: () => void;
}

export const OtpSecuritySettings: React.FC<OtpSecuritySettingsProps> = ({ 
  passkeyCount,
  onSettingsChange 
}) => {
  const [otpDisabled, setOtpDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const { isSupported } = useEnhancedWebAuthn();

  useEffect(() => {
    loadOtpSettings();
  }, []);

  const loadOtpSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('disable_otp_fallback')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setOtpDisabled(data?.disable_otp_fallback || false);
    } catch (error) {
      console.error('Error loading OTP settings:', error);
    }
  };

  const handleToggleOtp = async (disabled: boolean) => {
    if (disabled && passkeyCount === 0) {
      toast({
        title: 'Fingerprint erforderlich',
        description: 'Du musst mindestens einen Fingerprint einrichten, bevor du OTP deaktivieren kannst.',
        variant: 'destructive',
      });
      return;
    }

    if (disabled && !showWarning) {
      setShowWarning(true);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ disable_otp_fallback: disabled })
        .eq('id', user.id);

      if (error) throw error;

      setOtpDisabled(disabled);
      setShowWarning(false);
      onSettingsChange?.();

      toast({
        title: disabled ? 'OTP-Codes deaktiviert' : 'OTP-Codes aktiviert',
        description: disabled 
          ? 'Du kannst dich nur noch mit deinen Fingerprints anmelden.'
          : 'OTP-Codes sind wieder als Anmelde-Option verfügbar.',
      });
    } catch (error: any) {
      console.error('Error updating OTP settings:', error);
      toast({
        title: 'Fehler',
        description: 'Einstellungen konnten nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Shield className="h-5 w-5" />
          Erweiterte Sicherheitseinstellungen
        </CardTitle>
        <CardDescription>
          Erhöhe deine Sicherheit durch Deaktivierung von E-Mail-Codes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showWarning ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-red-800">Wichtige Sicherheitswarnung</h4>
                <div className="text-sm text-red-700 space-y-2">
                  <p><strong>Du bist dabei, E-Mail-Codes zu deaktivieren!</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Du kannst dich nur noch mit deinen Fingerprints anmelden</li>
                    <li>Wenn du alle Fingerprints verlierst, kannst du nicht mehr auf dein Konto zugreifen</li>
                    <li>Stelle sicher, dass du mindestens 2 Fingerprints eingerichtet hast</li>
                    <li>Notiere dir deine E-Mail-Adresse für den Notfall</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleToggleOtp(true)}
                disabled={loading}
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                Ja, OTP-Codes deaktivieren
              </Button>
              <Button
                onClick={() => setShowWarning(false)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium text-gray-800">
                  OTP-Codes deaktivieren (Nur Fingerprint-Anmeldung)
                </h3>
                <p className="text-sm text-gray-600">
                  Maximale Sicherheit durch Ausschluss von E-Mail-Codes
                </p>
              </div>
              <Switch
                checked={otpDisabled}
                onCheckedChange={handleToggleOtp}
                disabled={loading || (passkeyCount === 0 && !otpDisabled)}
              />
            </div>

            {otpDisabled && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Maximale Sicherheit aktiv - Nur Fingerprint-Anmeldung möglich
                  </span>
                </div>
              </div>
            )}

            {passkeyCount === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    Richte mindestens einen Fingerprint ein, um OTP deaktivieren zu können.
                  </span>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              <p>• Bei Verlust aller Fingerprints wird OTP automatisch reaktiviert</p>
              <p>• Administratoren können im Notfall Zugang wiederherstellen</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
