/**
 * Ditax Document Validation Component
 * 
 * Scanner-style OCR validation UI with step-based progress.
 * Matches premium fintech bottom-sheet aesthetic.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import documentCheckImg from '@/assets/document-check.png';
import { cn } from '@/lib/utils';
import { ValidationProgress } from '@/types/documentProfile';

// ============================================================================
// Types
// ============================================================================

interface AIDocumentValidationProps {
  progress: ValidationProgress;
  documentType?: string;
  documentTypeId?: string;
  foundKeywords?: string[];
}

// ============================================================================
// Status Messages by Document Type
// ============================================================================

const STATUS_MESSAGES_BY_DOCTYPE: Record<string, string> = {
  'employment-income': 'Arbeitgeber wird erkannt, bitte warten Sie einen Moment…',
  'pillar3a-certificate': 'Anbieter wird erkannt, bitte warten Sie einen Moment…',
  'pillar2-statement': 'Vorsorgeeinrichtung wird erkannt, bitte warten Sie einen Moment…',
  'rental-income': 'Liegenschaft wird erkannt, bitte warten Sie einen Moment…',
  'insurance-premium': 'Versicherung wird erkannt, bitte warten Sie einen Moment…',
  'bank-statement': 'Bank wird erkannt, bitte warten Sie einen Moment…',
  'tax-assessment': 'Steuerbehörde wird erkannt, bitte warten Sie einen Moment…',
  'default': 'Daten werden analysiert, bitte warten Sie einen Moment…'
};

// ============================================================================
// Validation Steps
// ============================================================================

interface ValidationStep {
  id: string;
  label: string;
  minPercent: number; // step becomes active at this percent
  completePercent: number; // step is completed at this percent
}

const VALIDATION_STEPS: ValidationStep[] = [
  { id: 'upload', label: 'Dokument hochgeladen', minPercent: 0, completePercent: 15 },
  { id: 'extract', label: 'Extrahiere Daten', minPercent: 15, completePercent: 80 },
  { id: 'validate', label: 'Validierung', minPercent: 80, completePercent: 100 },
];

// ============================================================================
// Step Row Component
// ============================================================================

interface StepRowProps {
  step: ValidationStep;
  status: 'pending' | 'active' | 'complete';
  percent: number;
}

const StepRow: React.FC<StepRowProps> = ({ step, status, percent }) => {
  // Calculate step-local progress for the badge
  const stepProgress = status === 'complete' ? 100 
    : status === 'active' 
      ? Math.round(((percent - step.minPercent) / (step.completePercent - step.minPercent)) * 100)
      : 0;

  return (
    <motion.div 
      className={cn(
        "flex items-center justify-between",
        status === 'pending' && "opacity-40"
      )}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: status === 'pending' ? 0.4 : 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        {/* Step indicator */}
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center border",
          status === 'complete' && "bg-primary/10 border-primary/20",
          status === 'active' && "bg-background border-primary/30 relative",
          status === 'pending' && "bg-background border-border"
        )}>
          {status === 'complete' && (
            <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
          )}
          {status === 'active' && (
            <span className="absolute w-2 h-2 bg-primary rounded-full animate-pulse" />
          )}
          {status === 'pending' && (
            <div className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full" />
          )}
        </div>
        <span className={cn(
          "text-sm font-medium",
          status === 'active' ? "text-foreground" : "text-muted-foreground"
        )}>
          {step.label}
        </span>
      </div>

      {/* Progress badge for active step */}
      {status === 'active' && (
        <motion.span 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full"
        >
          {stepProgress}%
        </motion.span>
      )}
    </motion.div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const AIDocumentValidation: React.FC<AIDocumentValidationProps> = ({
  progress,
  documentType = 'Dokument',
  documentTypeId,
}) => {
  const percent = progress.percent;

  const statusMessage = useMemo(() => {
    if (documentTypeId && STATUS_MESSAGES_BY_DOCTYPE[documentTypeId]) {
      return STATUS_MESSAGES_BY_DOCTYPE[documentTypeId];
    }
    return STATUS_MESSAGES_BY_DOCTYPE['default'];
  }, [documentTypeId]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative flex flex-col items-center pt-2 pb-4 w-full">
        
        {/* Scanner Icon */}
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl animate-pulse" />
          <img
            src={documentCheckImg}
            alt=""
            className="relative w-28 h-28 object-contain z-10 select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Title + Subtitle */}
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Ditax prüft {documentType}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
            {statusMessage}
          </p>
        </div>

        {/* Validation Steps */}
        <div className="w-full space-y-3">
          {VALIDATION_STEPS.map((step) => {
            let status: 'pending' | 'active' | 'complete' = 'pending';
            if (percent >= step.completePercent) {
              status = 'complete';
            } else if (percent >= step.minPercent) {
              status = 'active';
            }
            return (
              <StepRow 
                key={step.id} 
                step={step} 
                status={status} 
                percent={percent} 
              />
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted h-1 mt-8 rounded-full overflow-hidden">
          <motion.div 
            className="bg-primary h-full rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(percent, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
};

export default AIDocumentValidation;