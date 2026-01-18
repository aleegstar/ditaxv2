import React, { useEffect, useState } from 'react';
import { Fingerprint, Trash2, Loader2, CheckCircle, ScanLine, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
      <section className="space-y-5">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-gray-600" />
          Fingerprint & Passkey nicht verfügbar
        </h2>
        <p className="text-sm text-gray-600">
          Dein Gerät oder Browser unterstützt keine Fingerprint-Anmeldung (WebAuthn/Passkeys).
        </p>
      </section>
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
      <>
        <section className="space-y-5">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-gray-600" />
            Fingerprint & Passkeys
          </h2>

          {/* Mobile App Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                <strong>Hinweis:</strong> Die Fingerprint-Anmeldung funktioniert derzeit nur im Web-Browser. In der Mobile App ist diese Funktion noch nicht verfügbar.
              </span>
            </div>
          </div>

          <div className="space-y-4 pl-0 md:pl-7">
            <div>
              <h3 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-[#1D64FF]" />
                Fingerprint & Passkey einrichten
              </h3>
              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed max-w-lg">
                Richte einen Fingerprint/Passkey ein, um dich zukünftig schnell und sicher mit deinem Fingerprint, Face ID oder PIN anzumelden.
              </p>
            </div>

            <button
              onClick={() => setShowRegistration(true)}
              className="w-full h-11 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 text-gray-700 text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-200 group"
            >
              <Fingerprint className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
              Fingerprint jetzt einrichten
            </button>

            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">Nach der Einrichtung können Sie sich mit Fingerprint, Face ID oder PIN anmelden.</p>
            </div>
          </div>
        </section>

        {/* Show OTP settings even without passkeys */}
        <OtpSecuritySettings 
          passkeyCount={passkeys.length} 
          onSettingsChange={loadPasskeys}
        />
      </>
    );
  }

  // If passkeys exist, show management UI
  return (
    <>
      <section className="space-y-5">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-gray-600" />
          Fingerprint & Passkeys
        </h2>

        {/* Mobile App Warning */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2 text-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">
              <strong>Hinweis:</strong> Die Fingerprint-Anmeldung funktioniert derzeit nur im Web-Browser. In der Mobile App ist diese Funktion noch nicht verfügbar.
            </span>
          </div>
        </div>

        {/* Add new passkey */}
        <div className="space-y-4 pl-0 md:pl-7">
          <div>
            <h3 className="text-sm font-medium text-gray-800 flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-[#1D64FF]" />
              Neuen Fingerprint hinzufügen
            </h3>
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed max-w-lg">
              Fügen Sie einen weiteren Fingerprint/Passkey für ein anderes Gerät hinzu.
            </p>
          </div>

          <button
            onClick={() => setShowRegistration(true)}
            className="w-full h-11 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 text-gray-700 text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-200 group"
          >
            <Fingerprint className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
            Weiteren Fingerprint hinzufügen
          </button>
        </div>

        {/* Existing Passkeys */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700 px-1">Registrierte Geräte</span>
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 p-4 rounded-xl flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#1D64FF] border border-blue-200">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-medium text-gray-900">{passkey.device_name}</div>
                  <div className="text-xs text-gray-500">
                    Erstellt {formatDistanceToNow(new Date(passkey.created_at), { 
                      addSuffix: true, 
                      locale: de 
                    })}
                  </div>
                  {passkey.last_used_at && (
                    <div className="text-xs text-gray-400">
                      Zuletzt verwendet {formatDistanceToNow(new Date(passkey.last_used_at), { 
                        addSuffix: true, 
                        locale: de 
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                  Aktiv
                </Badge>
                <button
                  onClick={() => handleDelete(passkey.id)}
                  disabled={loadingDelete === passkey.id}
                  className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                >
                  {loadingDelete === passkey.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OTP Security Settings */}
      <OtpSecuritySettings 
        passkeyCount={passkeys.length} 
        onSettingsChange={loadPasskeys}
      />
    </>
  );
};
