import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Lock, CheckCircle } from 'lucide-react';
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
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600" />
          Erweiterte Sicherheitseinstellungen
        </h2>
        <p className="text-xs text-amber-700">Erhöhe deine Sicherheit durch Deaktivierung von E-Mail-Codes.</p>
      </div>

      {showWarning ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-red-700">Wichtige Sicherheitswarnung</h4>
              <div className="text-sm text-red-600 space-y-2">
                <p><strong>Du bist dabei, E-Mail-Codes zu deaktivieren!</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Du kannst dich nur noch mit deinen Fingerprints anmelden</li>
                  <li>Wenn du alle Fingerprints verlierst, kannst du nicht mehr auf dein Konto zugreifen</li>
                  <li>Stelle sicher, dass du mindestens 2 Fingerprints eingerichtet hast</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleToggleOtp(true)}
              disabled={loading}
              className="flex-1 h-9 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors disabled:opacity-50 border border-red-200"
            >
              Ja, OTP deaktivieren
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="flex-1 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-amber-900">OTP-Codes deaktivieren</div>
              <div className="text-xs text-amber-700">Nur Fingerprint-Anmeldung</div>
            </div>
            <Switch
              checked={otpDisabled}
              onCheckedChange={handleToggleOtp}
              disabled={loading || (passkeyCount === 0 && !otpDisabled)}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          {otpDisabled && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">
                  Maximale Sicherheit aktiv - Nur Fingerprint-Anmeldung möglich
                </span>
              </div>
            </div>
          )}

          {passkeyCount === 0 && (
            <div className="rounded-lg bg-amber-100 border border-amber-200 p-3 flex gap-3 items-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">Richte mindestens einen Fingerprint ein, um OTP deaktivieren zu können.</p>
            </div>
          )}

          <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside pl-1">
            <li>Bei Verlust aller Fingerprints wird OTP automatisch reaktiviert</li>
            <li>Administratoren können im Notfall Zugang wiederherstellen</li>
          </ul>
        </div>
      )}
    </section>
  );
};
