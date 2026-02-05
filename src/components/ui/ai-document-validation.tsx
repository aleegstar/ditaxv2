/**
 * AI Document Validation Component
 * 
 * A live AI analysis view that shows fields being detected and confirmed in real-time.
 * Replaces step-based progress with dynamic field validation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationProgress } from '@/types/documentProfile';

// ============================================================================
// Types
// ============================================================================

interface ExtractedField {
  id: string;
  label: string;
  value: string | null;
  confidence: 'high' | 'medium' | 'low' | 'pending';
  isValidated: boolean;
}

interface AIDocumentValidationProps {
  progress: ValidationProgress;
  documentType?: string;
  foundKeywords?: string[];
  /** Custom fields to display (optional - will generate from keywords if not provided) */
  fields?: ExtractedField[];
}

// ============================================================================
// Field Skeleton Component
// ============================================================================

interface FieldRowProps {
  field: ExtractedField;
  index: number;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, index }) => {
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0"
    >
      {/* Label */}
      <span className="text-sm text-muted-foreground">{field.label}</span>
      
      {/* Value + Badge */}
      <div className="flex items-center gap-2.5">
        <AnimatePresence mode="wait">
          {!field.isValidated ? (
            // Skeleton placeholder
            <motion.div
              key="skeleton"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "h-5 rounded bg-muted",
                field.id === 'name' ? 'w-28' : 
                field.id === 'amount' ? 'w-20' : 
                field.id === 'date' ? 'w-24' : 'w-24',
                !prefersReducedMotion && "animate-shimmer-skeleton"
              )}
            />
          ) : (
            // Validated value
            <motion.span
              key="value"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-medium text-foreground"
            >
              {field.value || '—'}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Confidence Badge */}
        <div className="w-5 h-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!field.isValidated ? (
              // Empty placeholder
              <motion.div
                key="placeholder"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                className="w-4 h-4 rounded-full bg-muted"
              />
            ) : field.confidence === 'high' ? (
              // Green check
              <motion.div
                key="high"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="w-5 h-5 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </motion.div>
            ) : field.confidence === 'medium' ? (
              // Yellow dot
              <motion.div
                key="medium"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="w-4 h-4 rounded-full bg-amber-400 dark:bg-amber-500"
              />
            ) : (
              // Low confidence - gray dot
              <motion.div
                key="low"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-4 h-4 rounded-full bg-muted-foreground/30"
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const AIDocumentValidation: React.FC<AIDocumentValidationProps> = ({
  progress,
  documentType = 'Dokument',
  foundKeywords = [],
  fields: customFields
}) => {
  // Generate fields from keywords or use defaults
  const baseFields = useMemo((): ExtractedField[] => {
    if (customFields) return customFields;
    
    // Default fields for document validation
    const defaultFields: ExtractedField[] = [
      { id: 'name', label: 'Name', value: null, confidence: 'pending', isValidated: false },
      { id: 'employer', label: 'Arbeitgeber', value: null, confidence: 'pending', isValidated: false },
      { id: 'amount', label: 'Bruttolohn', value: null, confidence: 'pending', isValidated: false },
      { id: 'date', label: 'Datum', value: null, confidence: 'pending', isValidated: false },
    ];

    return defaultFields;
  }, [customFields]);

  const [fields, setFields] = useState<ExtractedField[]>(baseFields);
  const [validatedCount, setValidatedCount] = useState(0);

  // Progressive field validation based on progress
  useEffect(() => {
    const progressPercent = progress.percent;
    
    // Map progress to number of validated fields
    let targetValidated = 0;
    if (progressPercent >= 90) targetValidated = fields.length;
    else if (progressPercent >= 70) targetValidated = Math.floor(fields.length * 0.75);
    else if (progressPercent >= 50) targetValidated = Math.floor(fields.length * 0.5);
    else if (progressPercent >= 30) targetValidated = Math.floor(fields.length * 0.25);
    else if (progressPercent >= 15) targetValidated = 1;

    // Animate field validation one by one
    if (targetValidated > validatedCount) {
      const timer = setTimeout(() => {
        setFields(prev => prev.map((field, index) => {
          if (index === validatedCount) {
            // Check if this keyword was found
            const hasKeyword = foundKeywords.some(kw => 
              kw.toLowerCase().includes(field.label.toLowerCase()) ||
              field.label.toLowerCase().includes(kw.toLowerCase())
            );
            
            // Generate mock value based on field type
            let mockValue = '—';
            let confidence: 'high' | 'medium' | 'low' = hasKeyword ? 'high' : 'medium';
            
            if (field.id === 'name') {
              mockValue = hasKeyword ? 'Erkannt' : '—';
            } else if (field.id === 'employer') {
              mockValue = hasKeyword ? 'Erkannt' : '—';
            } else if (field.id === 'amount') {
              mockValue = hasKeyword ? 'CHF ****' : '—';
            } else if (field.id === 'date') {
              mockValue = hasKeyword ? '**.**.****' : '—';
            }

            // If we have found keywords, show high confidence
            if (foundKeywords.length >= 4) confidence = 'high';
            else if (foundKeywords.length >= 2) confidence = 'medium';
            else confidence = foundKeywords.length > 0 ? 'medium' : 'low';
            
            return {
              ...field,
              value: mockValue,
              confidence,
              isValidated: true
            };
          }
          return field;
        }));
        setValidatedCount(prev => prev + 1);
      }, 300 + Math.random() * 500); // 300-800ms delay

      return () => clearTimeout(timer);
    }
  }, [progress.percent, validatedCount, fields.length, foundKeywords]);

  // Reset when progress resets
  useEffect(() => {
    if (progress.percent < 10) {
      setFields(baseFields);
      setValidatedCount(0);
    }
  }, [progress.percent, baseFields]);

  const allValidated = validatedCount >= fields.length && progress.step === 'complete';

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        {/* AI Icon */}
        <motion.div 
          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center"
          animate={!allValidated ? { 
            scale: [1, 1.05, 1],
          } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {allValidated ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Check className="w-8 h-8 text-emerald-500" strokeWidth={2.5} />
            </motion.div>
          ) : (
            <Sparkles className="w-8 h-8 text-primary" />
          )}
        </motion.div>

        {/* Title */}
        <div className="text-center">
          <h3 className="font-semibold text-foreground text-lg">
            {allValidated ? 'Analyse abgeschlossen' : `AI prüft ${documentType}`}
          </h3>
          <motion.p 
            key={allValidated ? 'done' : 'loading'}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-muted-foreground mt-1"
          >
            {allValidated ? 'Alle Felder erkannt' : 'Dokument wird analysiert'}
          </motion.p>
        </div>
      </div>

      {/* Validation Card */}
      <motion.div 
        className="w-full bg-card border border-border rounded-xl p-4 shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {fields.map((field, index) => (
          <FieldRow key={field.id} field={field} index={index} />
        ))}
      </motion.div>

      {/* Found Keywords Pills */}
      <AnimatePresence>
        {foundKeywords.length > 0 && validatedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full"
          >
            <div className="flex flex-wrap gap-1.5 justify-center">
              {foundKeywords.slice(0, 5).map((keyword, index) => (
                <motion.span
                  key={keyword}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.2 }}
                  className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground"
                >
                  {keyword}
                </motion.span>
              ))}
              {foundKeywords.length > 5 && (
                <span className="px-2 py-0.5 text-xs text-muted-foreground">
                  +{foundKeywords.length - 5}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Status */}
      <motion.div
        key={allValidated ? 'complete' : 'loading'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2"
      >
        {!allValidated && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary"
          />
        )}
        <span className={cn(
          "text-xs",
          allValidated ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
        )}>
          {allValidated ? 'Dokument erfolgreich geprüft' : 'Analyse läuft…'}
        </span>
      </motion.div>
    </div>
  );
};

export default AIDocumentValidation;
