import React, { useEffect, useState } from 'react';
import { Fingerprint, Trash2, Loader2, CheckCircle, ScanLine, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEnhancedWebAuthn } from '@/hooks/use-enhanced-webauthn';
import { PasskeyRegistration } from './PasskeyRegistration';
import { OtpSecuritySettings } from './OtpSecuritySettings';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { isDespiaNative, triggerDespiaPasskeyRegistration } from '@/lib/despia';

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
  const isDespia = isDespiaNative();

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

  const handleDespiaRegister = () => {
    console.log('🔐 Opening passkey registration in system browser...');
    triggerDespiaPasskeyRegistration();
  };

  if (!isSupported && !isDespia) {
    return (
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-zinc-400" />
          Fingerprint & Passkey nicht verfügbar
        </h2>
        <p className="text-sm text-zinc-400">
          Ihr Gerät oder Browser unterstützt keine Fingerprint-Anmeldung (WebAuthn/Passkeys).
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
        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-zinc-400" />
            Fingerprint & Passkeys
          </h2>

          <div className="space-y-5 pl-0 md:pl-7">
            <div>
              <h3 className="text-[15px] font-medium text-zinc-200 flex items-center gap-2.5">
                <ScanLine className="w-4 h-4 text-[#1D64FF]" />
                Fingerprint & Passkey einrichten
              </h3>
              <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed max-w-lg">
                Richte einen Fingerprint/Passkey ein, um dich zukünftig schnell und sicher mit deinem Fingerprint, Face ID oder PIN anzumelden.
              </p>
            </div>

            {isDespia ? (
              <button
                onClick={handleDespiaRegister}
                className="w-full h-11 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-zinc-200 text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-200 group"
              >
                <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                Im Browser registrieren
              </button>
            ) : (
              <button
                onClick={() => setShowRegistration(true)}
                className="w-full h-11 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-zinc-200 text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-200 group"
              >
                <Fingerprint className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                Fingerprint jetzt einrichten
              </button>
            )}

            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500 leading-relaxed">Nach der Einrichtung können Sie sich mit Fingerprint, Face ID oder PIN anmelden.</p>
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
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-zinc-400" />
          Fingerprint & Passkeys
        </h2>

        {/* Add new passkey */}
        <div className="space-y-5 pl-0 md:pl-7">
          <div>
            <h3 className="text-[15px] font-medium text-zinc-200 flex items-center gap-2.5">
              <ScanLine className="w-4 h-4 text-[#1D64FF]" />
              Neuen Fingerprint hinzufügen
            </h3>
            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed max-w-lg">
              Fügen Sie einen weiteren Fingerprint/Passkey für ein anderes Gerät hinzu.
            </p>
          </div>

          {isDespia ? (
            <button
              onClick={handleDespiaRegister}
              className="w-full h-11 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-zinc-200 text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-200 group"
            >
              <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              Im Browser hinzufügen
            </button>
          ) : (
            <button
              onClick={() => setShowRegistration(true)}
              className="w-full h-11 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-zinc-200 text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-200 group"
            >
              <Fingerprint className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              Weiteren Fingerprint hinzufügen
            </button>
          )}
        </div>

        {/* Existing Passkeys */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-zinc-300 px-1">Registrierte Geräte</span>
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="bg-white/[0.02] backdrop-blur-[12px] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] p-4 rounded-xl flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-lg bg-[#1D64FF]/10 flex items-center justify-center text-[#1D64FF] border border-[#1D64FF]/20">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-medium text-zinc-200">{passkey.device_name}</div>
                  <div className="text-[11px] text-zinc-500">
                    Erstellt {formatDistanceToNow(new Date(passkey.created_at), { 
                      addSuffix: true, 
                      locale: de 
                    })}
                  </div>
                  {passkey.last_used_at && (
                    <div className="text-[11px] text-zinc-600">
                      Zuletzt verwendet {formatDistanceToNow(new Date(passkey.last_used_at), { 
                        addSuffix: true, 
                        locale: de 
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                  Aktiv
                </Badge>
                <button
                  onClick={() => handleDelete(passkey.id)}
                  disabled={loadingDelete === passkey.id}
                  className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
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
