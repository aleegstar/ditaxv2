import React, { useState } from 'react';
import { Shield, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-zinc-400" />
            Zwei-Faktor-Authentifizierung
          </h2>
          <p className="text-sm text-zinc-400">Fügen Sie eine zusätzliche Sicherheitsebene zu Ihrem Konto hinzu.</p>
        </div>

        {/* Alert Box */}
        {factors.length === 0 ? (
          <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/[0.03] p-4 flex items-start gap-4">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="py-0.5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                MFA ist nicht aktiviert. Ihre Kontosicherheit kann durch die Aktivierung der Zwei-Faktor-Authentifizierung verbessert werden.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 flex items-start gap-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="py-0.5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                MFA ist aktiv. Ihr Konto ist zusätzlich durch Zwei-Faktor-Authentifizierung geschützt.
              </p>
            </div>
          </div>
        )}

        {/* Authenticator Apps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-zinc-300">Authentifikator-Apps</span>
            <button 
              onClick={() => setShowEnrollment(true)}
              disabled={isLoading}
              className="px-4 py-1.5 rounded-full bg-[#1D64FF] text-white text-xs font-semibold hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Hinzufügen
            </button>
          </div>

          {factors.length > 0 ? (
            <div className="space-y-3">
              {factors.map((factor) => (
                <div 
                  key={factor.id}
                  className="bg-white/[0.02] backdrop-blur-[12px] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] p-4 rounded-xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-sm font-medium text-zinc-200">
                        {factor.friendly_name || 'Authenticator App'}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        TOTP • {factor.status === 'verified' ? 'Verifiziert' : 'Nicht verifiziert'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={factor.status === 'verified' ? 'default' : 'secondary'} 
                      className={factor.status === 'verified' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs' 
                        : 'bg-zinc-800 text-zinc-400 border-white/5 text-xs'
                      }
                    >
                      {factor.status === 'verified' ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button 
                          className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0A0C10] border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-zinc-100">MFA-Gerät entfernen</AlertDialogTitle>
                          <AlertDialogDescription className="text-zinc-400">
                            Sind Sie sicher, dass Sie dieses MFA-Gerät entfernen möchten? 
                            Dies reduziert die Sicherheit Ihres Kontos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/[0.02] border-white/10 text-zinc-300 hover:bg-white/[0.05]">
                            Abbrechen
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveFactor(factor.id)}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
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
            /* Empty State */
            <div className="bg-white/[0.02] backdrop-blur-[12px] border border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-900/80 flex items-center justify-center text-zinc-600 mb-4 border border-white/5 shadow-inner">
                <Shield className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-medium text-zinc-200">Keine Authentifikator-Apps konfiguriert</h3>
              <p className="text-xs text-zinc-500 mt-1.5">Fügen Sie eine App hinzu, um MFA zu aktivieren</p>
            </div>
          )}
        </div>
      </section>

      {showEnrollment && (
        <MfaEnrollmentFlow
          onComplete={handleEnrollmentComplete}
          onCancel={() => setShowEnrollment(false)}
        />
      )}
    </>
  );
};
