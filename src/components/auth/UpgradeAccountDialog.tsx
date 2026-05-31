import { useState } from 'react';
import { Loader2, Mail, ShieldCheck, Monitor } from 'lucide-react';
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
} from '@/components/ui/app-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { upgradeAnonymousToEmail } from '@/services/AnonymousAuthService';

interface UpgradeAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the user cannot dismiss — only "verknüpfen" closes the dialog. */
  hardBlock?: boolean;
  /** Reason shown above the input ("Damit du auch am PC weiterarbeiten kannst…"). */
  reason?: string;
  onUpgraded?: () => void;
}

export const UpgradeAccountDialog = ({
  open,
  onOpenChange,
  hardBlock = false,
  reason,
  onUpgraded,
}: UpgradeAccountDialogProps) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      await upgradeAnonymousToEmail(email);
      setSent(true);
      toast.success('Bestätigungslink versendet', {
        description: 'Schau in dein E-Mail-Postfach und klicke den Link, um dein Konto zu sichern.',
      });
      onUpgraded?.();
    } catch (err: any) {
      toast.error(err?.message || 'E-Mail konnte nicht verknüpft werden');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (hardBlock && !sent) return; // not dismissible until upgraded
        onOpenChange(next);
      }}
    >
      <AppDialogContent
        size="default"
        hideCloseButton={hardBlock && !sent}
        onInteractOutside={(e) => {
          if (hardBlock && !sent) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (hardBlock && !sent) e.preventDefault();
        }}
      >
        <AppDialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-primary" strokeWidth={1.75} />
          </div>
          <AppDialogTitle className="text-center">
            {sent ? 'E-Mail unterwegs' : 'Sichere deinen Fortschritt'}
          </AppDialogTitle>
          <AppDialogDescription className="text-center">
            {sent
              ? 'Klicke den Link in deinem Postfach, um dein Konto endgültig zu aktivieren. Du kannst die App in der Zwischenzeit weiterverwenden.'
              : reason ||
                'Verknüpfe eine E-Mail, damit dein Konto auf weitere Geräte (z.B. PC) verfügbar ist und nicht verloren geht.'}
          </AppDialogDescription>
        </AppDialogHeader>

        {!sent && (
          <>
            <ul className="space-y-2 mb-5 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Monitor className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" strokeWidth={1.75} />
                <span>Zugriff am PC und auf anderen Geräten</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" strokeWidth={1.75} />
                <span>Fortschritt geht bei App-Deinstallation nicht verloren</span>
              </li>
            </ul>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="deine@email.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-11 rounded-2xl text-sm"
                  required
                  disabled={submitting}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={!email.trim() || submitting}
                className="w-full"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'E-Mail verknüpfen'}
              </Button>
              {!hardBlock && (
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Später
                </button>
              )}
            </form>
          </>
        )}

        {sent && (
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Schliessen
          </Button>
        )}
      </AppDialogContent>
    </AppDialog>
  );
};
