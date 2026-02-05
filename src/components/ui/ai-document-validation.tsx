/**
 * Ditax Document Validation Component
 * 
 * A live analysis view that shows fields being detected and confirmed in real-time.
 * Fields resolve progressively with dynamic status messages.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import ditaxLogo from '@/assets/ditax-symbol.svg';
import { ValidationProgress } from '@/types/documentProfile';

// ============================================================================
// Types
// ============================================================================

interface ExtractedField {
  id: string;
  label: string;
  value: string | null;
  displayValue: string;
  confidence: 'high' | 'medium' | 'low' | 'pending';
  isValidated: boolean;
  statusMessage: string;
}

interface AIDocumentValidationProps {
  progress: ValidationProgress;
  documentType?: string;
  documentTypeId?: string;
  foundKeywords?: string[];
}

// ============================================================================
// Status Messages by Document Type
// ============================================================================

const STATUS_MESSAGES_BY_DOCTYPE: Record<string, string[]> = {
  'employment-income': [
    'Arbeitgeber wird erkannt…',
    'Bruttolohn wird geprüft…',
    'AHV-Beiträge werden validiert…',
    'Quellensteuer wird analysiert…',
    'Lohnausweis wird verifiziert…'
  ],
  'pillar3a-certificate': [
    'Anbieter wird erkannt…',
    'Einzahlung wird geprüft…',
    'Steuerjahr wird validiert…',
    'Kontodaten werden analysiert…',
    'Säule 3a wird verifiziert…'
  ],
  'pillar2-statement': [
    'Vorsorgeeinrichtung wird erkannt…',
    'Altersguthaben wird geprüft…',
    'Beiträge werden validiert…',
    'Pensionskasse wird verifiziert…'
  ],
  'rental-income': [
    'Liegenschaft wird erkannt…',
    'Mietzins wird geprüft…',
    'Nebenkosten werden validiert…',
    'Mieteinnahmen werden verifiziert…'
  ],
  'insurance-premium': [
    'Versicherung wird erkannt…',
    'Prämie wird geprüft…',
    'Police wird validiert…',
    'Versicherungsnachweis wird verifiziert…'
  ],
  'bank-statement': [
    'Bank wird erkannt…',
    'Kontostand wird geprüft…',
    'Transaktionen werden validiert…',
    'Bankauszug wird verifiziert…'
  ],
  'tax-assessment': [
    'Steuerbehörde wird erkannt…',
    'Veranlagung wird geprüft…',
    'Steuerbetrag wird validiert…',
    'Steuerrechnung wird verifiziert…'
  ],
  'default': [
    'Text wird erkannt…',
    'Daten werden analysiert…',
    'Inhalte werden geprüft…',
    'Dokument wird validiert…',
    'Informationen werden verifiziert…'
  ]
};

// ============================================================================
// Field Configuration
// ============================================================================

const FIELD_CONFIG = [
  { 
    id: 'name', 
    label: 'Name', 
    placeholderValue: 'Max Mustermann',
    statusMessage: 'Name wird erkannt…'
  },
  { 
    id: 'employer', 
    label: 'Arbeitgeber', 
    placeholderValue: 'ACME AG',
    statusMessage: 'Arbeitgeber wird geprüft…'
  },
  { 
    id: 'amount', 
    label: 'Bruttolohn', 
    placeholderValue: "5'240 CHF",
    statusMessage: 'Beträge werden validiert…'
  },
  { 
    id: 'date', 
    label: 'Datum', 
    placeholderValue: '31.12.2024',
    statusMessage: 'Dokument wird abgeschlossen…'
  },
];

// ============================================================================
// Field Row Component
// ============================================================================

interface FieldRowProps {
  field: ExtractedField;
  isBeingValidated: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, isBeingValidated }) => {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/30 last:border-b-0">
      {/* Label */}
      <span className="text-sm text-muted-foreground font-medium">{field.label}</span>
      
      {/* Value + Status */}
      <div className="flex items-center gap-3">
        <AnimatePresence mode="wait">
          {!field.isValidated && !isBeingValidated ? (
            // Skeleton placeholder
            <motion.div
              key={`skeleton-${field.id}`}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "h-5 rounded-md bg-muted/60",
                field.id === 'name' ? 'w-28' : 
                field.id === 'employer' ? 'w-20' : 
                field.id === 'amount' ? 'w-16' : 'w-20',
                !prefersReducedMotion && "animate-shimmer-skeleton"
              )}
            />
          ) : (
            // Value (being validated or confirmed)
            <motion.span
              key={`value-${field.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="text-sm font-semibold text-foreground"
            >
              {field.displayValue}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Status Indicator */}
        <div className="w-5 h-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!field.isValidated && !isBeingValidated ? (
              // Empty placeholder
              <motion.div
                key={`empty-${field.id}`}
                exit={{ opacity: 0, scale: 0 }}
                className="w-2 h-2 rounded-full bg-muted/40"
              />
            ) : isBeingValidated && !field.isValidated ? (
              // Pulsing blue dot (being validated)
              <motion.div
                key={`validating-${field.id}`}
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ 
                  duration: 1.2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(29,100,255,0.5)]"
              />
            ) : (
              // Green check (confirmed)
              <motion.div
                key={`check-${field.id}`}
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 20 
                }}
                className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Rotating Status Text Component
// ============================================================================

interface RotatingStatusTextProps {
  messages: string[];
  isComplete: boolean;
  prefersReducedMotion: boolean;
}

const RotatingStatusText: React.FC<RotatingStatusTextProps> = ({ 
  messages, 
  isComplete, 
  prefersReducedMotion 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isComplete || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isComplete, messages.length, prefersReducedMotion]);

  if (isComplete) {
    return (
      <motion.p 
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-emerald-600 dark:text-emerald-400 font-medium"
      >
        Dokument erfolgreich geprüft
      </motion.p>
    );
  }

  return (
    <div className="h-5 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "text-sm text-center",
            !prefersReducedMotion && "shimmer-text"
          )}
        >
          {messages[currentIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const AIDocumentValidation: React.FC<AIDocumentValidationProps> = ({
  progress,
  documentType = 'Dokument',
  documentTypeId,
  foundKeywords = []
}) => {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  // Get status messages based on document type ID
  const statusMessages = useMemo(() => {
    if (documentTypeId && STATUS_MESSAGES_BY_DOCTYPE[documentTypeId]) {
      return STATUS_MESSAGES_BY_DOCTYPE[documentTypeId];
    }
    return STATUS_MESSAGES_BY_DOCTYPE['default'];
  }, [documentTypeId]);

  // Initialize fields
  const initialFields = useMemo((): ExtractedField[] => {
    return FIELD_CONFIG.map(config => ({
      id: config.id,
      label: config.label,
      value: null,
      displayValue: config.placeholderValue,
      confidence: 'pending' as const,
      isValidated: false,
      statusMessage: config.statusMessage
    }));
  }, []);

  const [fields, setFields] = useState<ExtractedField[]>(initialFields);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);

  // Calculate confidence based on found keywords
  const getConfidence = useCallback((fieldId: string): 'high' | 'medium' => {
    if (foundKeywords.length >= 3) return 'high';
    if (foundKeywords.length >= 1) return 'high';
    return 'medium';
  }, [foundKeywords]);

  // Progressive field validation
  useEffect(() => {
    const progressPercent = progress.percent;
    
    // Determine how many fields should be validated based on progress
    let targetFieldIndex = -1;
    if (progressPercent >= 95) targetFieldIndex = 3; // All 4 fields
    else if (progressPercent >= 75) targetFieldIndex = 2;
    else if (progressPercent >= 55) targetFieldIndex = 1;
    else if (progressPercent >= 35) targetFieldIndex = 0;
    else if (progressPercent >= 20) targetFieldIndex = -1; // Still loading

    // Validate fields one by one with delay
    if (targetFieldIndex > currentFieldIndex && currentFieldIndex < fields.length - 1) {
      const nextIndex = currentFieldIndex + 1;
      const delay = 400 + Math.random() * 400; // 400-800ms

      const timer = setTimeout(() => {
        setFields(prev => prev.map((field, idx) => {
          if (idx === nextIndex) {
            return {
              ...field,
              isValidated: true,
              confidence: getConfidence(field.id)
            };
          }
          return field;
        }));
        setCurrentFieldIndex(nextIndex);

        // Check if all fields are validated
        if (nextIndex === fields.length - 1) {
          setTimeout(() => {
            setIsComplete(true);
          }, 300);
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [progress.percent, currentFieldIndex, fields.length, getConfidence]);

  // Reset when progress resets
  useEffect(() => {
    if (progress.percent < 15 && progress.step === 'preparing') {
      setFields(initialFields);
      setCurrentFieldIndex(-1);
      setIsComplete(false);
    }
  }, [progress.percent, progress.step, initialFields]);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Header with AI Icon */}
      <div className="flex flex-col items-center gap-3">
        {/* Animated AI Icon with Pulse/Glow */}
        <div className="relative">
          <motion.div 
            className="w-16 h-16 rounded-full flex items-center justify-center bg-white border border-border/50"
            animate={!isComplete && !prefersReducedMotion ? { 
              scale: [1, 1.03, 1]
            } : {}}
            transition={{ 
              duration: 2, 
              repeat: isComplete ? 0 : Infinity, 
              ease: "easeInOut" 
            }}
          >
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Check className="w-8 h-8 text-emerald-500" strokeWidth={2.5} />
                </motion.div>
              ) : (
                <motion.img
                  key="analyzing"
                  src={ditaxLogo}
                  alt="ditax"
                  className="w-10 h-10 object-contain"
                  animate={!prefersReducedMotion ? { 
                    scale: [1, 1.05, 1] 
                  } : {}}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/* Subtle orbiting particle */}
          {!isComplete && !prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/50" />
            </motion.div>
          )}
        </div>

        <div className="text-center space-y-2">
          <h3 className="font-semibold text-foreground text-lg">
            {isComplete ? 'Analyse abgeschlossen' : `Ditax prüft ${documentType}`}
          </h3>
          
          {/* Rotating Status Text with Shimmer */}
          <RotatingStatusText 
            messages={statusMessages}
            isComplete={isComplete}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
      </div>

      {/* Validation Card */}
      <motion.div 
        className="w-full bg-card border border-border rounded-xl p-4 shadow-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {fields.map((field, index) => (
          <FieldRow 
            key={field.id} 
            field={field} 
            isBeingValidated={index === currentFieldIndex + 1 && !field.isValidated}
          />
        ))}
      </motion.div>

      {/* Keywords Found - Show after first field validates */}
      <AnimatePresence>
        {foundKeywords.length > 0 && currentFieldIndex >= 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <div className="flex flex-wrap gap-1.5 justify-center">
              {foundKeywords.slice(0, 4).map((keyword, index) => (
                <motion.span
                  key={keyword}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.2 }}
                  className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800"
                >
                  {keyword}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AIDocumentValidation;
