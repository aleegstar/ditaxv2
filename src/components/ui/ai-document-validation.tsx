/**
 * Ditax Document Validation Component
 *
 * Calm fintech card — matches main design language
 * (rounded-2xl, semantic tokens, navy primary, subtle progress).
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationProgress } from '@/types/documentProfile';

interface AIDocumentValidationProps {
  progress: ValidationProgress;
  documentType?: string;
  documentTypeId?: string;
  foundKeywords?: string[];
}

const STATUS_MESSAGES_BY_DOCTYPE: Record<string, string> = {
  'employment-income': 'Arbeitgeber wird erkannt …',
  'pillar3a-certificate': 'Anbieter wird erkannt …',
  'pillar2-statement': 'Vorsorgeeinrichtung wird erkannt …',
  'rental-income': 'Liegenschaft wird erkannt …',
  'insurance-premium': 'Versicherung wird erkannt …',
  'bank-statement': 'Bank wird erkannt …',
  'tax-assessment': 'Steuerbehörde wird erkannt …',
  default: 'Daten werden analysiert …',
};

interface ValidationStep {
  id: string;
  label: string;
  minPercent: number;
  completePercent: number;
}

const VALIDATION_STEPS: ValidationStep[] = [
  { id: 'upload', label: 'Dokument gelesen', minPercent: 0, completePercent: 15 },
  { id: 'extract', label: 'Inhalt extrahiert', minPercent: 15, completePercent: 80 },
  { id: 'validate', label: 'Validierung', minPercent: 80, completePercent: 100 },
];

const StepRow: React.FC<{
  step: ValidationStep;
  status: 'pending' | 'active' | 'complete';
}> = ({ step, status }) => (
  <div
    className={cn(
      'flex items-center gap-2.5 text-[13px]',
      status === 'pending' && 'opacity-50',
    )}
  >
    <div
      className={cn(
        'w-4 h-4 rounded-full flex items-center justify-center shrink-0',
        status === 'complete' && 'bg-primary',
        status === 'active' && 'bg-primary/15 border border-primary/40',
        status === 'pending' && 'bg-muted border border-border',
      )}
    >
      {status === 'complete' && (
        <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
      )}
      {status === 'active' && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      )}
    </div>
    <span
      className={cn(
        status === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground',
      )}
    >
      {step.label}
    </span>
  </div>
);

const AIDocumentValidation: React.FC<AIDocumentValidationProps> = ({
  progress,
  documentType = 'Dokument',
  documentTypeId,
}) => {
  const percent = Math.min(progress.percent, 100);

  const statusMessage = useMemo(() => {
    if (documentTypeId && STATUS_MESSAGES_BY_DOCTYPE[documentTypeId]) {
      return STATUS_MESSAGES_BY_DOCTYPE[documentTypeId];
    }
    return STATUS_MESSAGES_BY_DOCTYPE['default'];
  }, [documentTypeId]);

  return (
    <div className="w-full">
      {/* Main analyzing card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative">
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />
            <span className="absolute inset-0 rounded-xl border border-primary/20 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-foreground tracking-[-0.012em]">
              Ditax prüft dein {documentType}
            </h3>
            <AnimatePresence mode="wait">
              <motion.p
                key={statusMessage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="text-[13px] text-muted-foreground leading-[1.5] mt-1"
              >
                {statusMessage}
              </motion.p>
            </AnimatePresence>
          </div>
          <span className="text-[12px] font-medium text-primary tabular-nums shrink-0">
            {Math.round(percent)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary relative overflow-hidden"
            initial={{ width: '0%' }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.45) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </div>

        {/* Steps */}
        <div className="mt-4 space-y-2">
          {VALIDATION_STEPS.map((step) => {
            let status: 'pending' | 'active' | 'complete' = 'pending';
            if (percent >= step.completePercent) status = 'complete';
            else if (percent >= step.minPercent) status = 'active';
            return <StepRow key={step.id} step={step} status={status} />;
          })}
        </div>
      </div>

      {/* Privacy hint */}
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/40 border border-border/60 px-3 py-2.5">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
        <p className="text-[12px] text-muted-foreground leading-[1.45]">
          Analyse erfolgt lokal auf deinem Gerät. Der Inhalt verlässt es nicht.
        </p>
      </div>
    </div>
  );
};

export default AIDocumentValidation;
