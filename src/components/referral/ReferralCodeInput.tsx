import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useReferralCode } from '@/hooks/useReferralCode';
import { CheckCircle, Gift, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReferralCodeInputProps {
  onSuccess?: (promoCode: string) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export const ReferralCodeInput: React.FC<ReferralCodeInputProps> = ({
  onSuccess,
  onSkip,
  showSkip = true,
}) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; promoCode: string } | null>(null);
  const { applyReferralCode } = useReferralCode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await applyReferralCode(code.trim());

    setIsSubmitting(false);

    if (result.success && result.promoCode) {
      setSuccess({ message: result.message || 'Rabatt gesichert!', promoCode: result.promoCode });
      onSuccess?.(result.promoCode);
    } else {
      setError(result.message || 'Ungültiger Code');
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center"
      >
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">
          {success.message}
        </h3>
        <p className="text-sm text-muted-foreground">
          Dein Rabatt wird automatisch beim Checkout angewendet
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Gift className="h-5 w-5" />
        <Label className="text-base font-medium">
          Hast du einen Empfehlungscode?
        </Label>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="z.B. DITAX-ABC123"
            className={`font-mono text-center text-lg tracking-wider ${
              error ? 'border-destructive' : ''
            }`}
            disabled={isSubmitting}
            maxLength={12}
          />
          {code && !isSubmitting && (
            <button
              type="button"
              onClick={() => setCode('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-destructive text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!code.trim() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Prüfen...
              </>
            ) : (
              'Code einlösen'
            )}
          </Button>
          {showSkip && onSkip && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              disabled={isSubmitting}
            >
              Überspringen
            </Button>
          )}
        </div>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        Mit einem gültigen Code erhältst du CHF 20.- Rabatt auf deine Steuererklärung
      </p>
    </div>
  );
};
