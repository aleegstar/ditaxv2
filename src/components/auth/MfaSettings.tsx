import React, { useState } from 'react';
import { Shield, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMfa } from '@/hooks/useMfa';
import { MfaEnrollmentFlow } from './MfaEnrollmentFlow';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MfaSettings: React.FC = () => {
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [factorToRemove, setFactorToRemove] = useState<{ id: string; name: string } | null>(null);
  const [removalCode, setRemovalCode] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const { factors, isLoading, unenrollFactor, loadFactors } = useMfa();

  const handleRemoveFactorWithMfa = async () => {
    if (!factorToRemove || removalCode.length !== 6) return;
    
    setIsRemoving(true);
    try {
      // First, create a challenge and verify to reach AAL2
      const challenge = await supabase.auth.mfa.challenge({ factorId: factorToRemove.id });
      if (challenge.error) throw challenge.error;
      
      const verify = await supabase.auth.mfa.verify({
        factorId: factorToRemove.id,
        challengeId: challenge.data.id,
        code: removalCode
      });
      if (verify.error) throw verify.error;
      
      // Now we have AAL2 and can unenroll
      await unenrollFactor(factorToRemove.id);
      setFactorToRemove(null);
      setRemovalCode('');
    } catch (error) {
      console.error('Error removing MFA factor:', error);
      toast.error('Ungültiger Code. Bitte versuchen Sie es erneut.');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleEnrollmentComplete = () => {
    setShowEnrollment(false);
    loadFactors();
  };

  return (
    <>
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            Zwei-Faktor-Authentifizierung
          </h2>
          <p className="text-sm text-gray-600">Fügen Sie eine zusätzliche Sicherheitsebene zu Ihrem Konto hinzu.</p>
        </div>

        {/* Alert Box */}
        {factors.filter(f => f.status === 'verified').length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="py-0.5">
              <p className="text-sm text-gray-700 leading-relaxed">
                MFA ist nicht aktiviert. Ihre Kontosicherheit kann durch die Aktivierung der Zwei-Faktor-Authentifizierung verbessert werden.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="py-0.5">
              <p className="text-sm text-gray-700 leading-relaxed">
                MFA ist aktiv. Ihr Konto ist zusätzlich durch Zwei-Faktor-Authentifizierung geschützt.
              </p>
            </div>
          </div>
        )}

        {/* Authenticator Apps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-gray-700">Authentifikator-Apps</span>
            <button 
              onClick={() => setShowEnrollment(true)}
              disabled={isLoading}
              className="px-4 py-1.5 rounded-full bg-[#1D64FF] text-white text-xs font-semibold hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Hinzufügen
            </button>
          </div>

          {factors.filter(f => f.status === 'verified').length > 0 ? (
            <div className="space-y-2">
              {factors.filter(f => f.status === 'verified').map((factor) => (
                <div 
                  key={factor.id}
                  className="bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 p-4 rounded-xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-sm font-medium text-gray-900">
                        {factor.friendly_name || 'Authenticator App'}
                      </div>
                      <div className="text-xs text-gray-500">
                        TOTP • Verifiziert
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="default"
                      className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                    >
                      Aktiv
                    </Badge>
                  
                    <button 
                      onClick={() => setFactorToRemove({ id: factor.id, name: factor.friendly_name || 'Authenticator App' })}
                      className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3 border border-gray-200">
                <Shield className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Keine Authentifikator-Apps konfiguriert</h3>
              <p className="text-xs text-gray-500 mt-1">Fügen Sie eine App hinzu, um MFA zu aktivieren</p>
            </div>
          )}
        </div>
      </section>

      {/* MFA Code Dialog for Removal */}
      <Dialog open={!!factorToRemove} onOpenChange={(open) => !open && setFactorToRemove(null)}>
        <DialogContent className="bg-white border-gray-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">MFA-Gerät entfernen</DialogTitle>
            <DialogDescription className="text-gray-600">
              Geben Sie zur Bestätigung den 6-stelligen Code aus Ihrer Authenticator-App ein, um "{factorToRemove?.name}" zu entfernen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="removal-code" className="text-gray-700">Authenticator-Code</Label>
              <Input
                id="removal-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={removalCode}
                onChange={(e) => setRemovalCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono border-gray-300"
                autoComplete="one-time-code"
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                Dies reduziert die Sicherheit Ihres Kontos.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFactorToRemove(null);
                setRemovalCode('');
              }}
              className="border-gray-200"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleRemoveFactorWithMfa}
              disabled={removalCode.length !== 6 || isRemoving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRemoving ? 'Wird entfernt...' : 'Entfernen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showEnrollment && (
        <MfaEnrollmentFlow
          onComplete={handleEnrollmentComplete}
          onCancel={() => setShowEnrollment(false)}
        />
      )}
    </>
  );
};
