/**
 * OCR Validation with Skeleton Loading and Source Badges
 * 
 * A clean, accessible loading and validation UI pattern for OCR document validation.
 * Shows shimmer placeholders during loading, then reveals validated text with source indicators.
 * 
 * Features:
 * - Skeleton loading with shimmer animation
 * - Source badges with confidence indicators
 * - Tooltip/popover with validation details
 * - Respects reduced-motion preferences
 * - Maintains layout stability (no shift)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// Types
// ============================================================================

export interface OCRFieldResult {
  /** Unique field identifier */
  id: string;
  /** Display label for the field */
  label: string;
  /** Extracted value (null if not yet validated) */
  value: string | null;
  /** Confidence score 0-100 */
  confidence: number;
  /** Validation source */
  source: 'OCR' | 'Verified' | 'Manual' | 'AI';
  /** Timestamp of validation */
  validatedAt?: Date;
  /** Whether this field is currently being validated */
  isValidating?: boolean;
}

export interface OCRValidationSkeletonProps {
  /** Array of fields to display */
  fields: OCRFieldResult[];
  /** Whether the entire validation is in progress */
  isLoading?: boolean;
  /** Optional class name */
  className?: string;
  /** Show header with title */
  showHeader?: boolean;
  /** Header title */
  headerTitle?: string;
}

// ============================================================================
// Skeleton Field Component
// ============================================================================

interface SkeletonFieldProps {
  label: string;
  widthClass?: string;
}

const SkeletonField: React.FC<SkeletonFieldProps> = ({ 
  label, 
  widthClass = 'w-32' 
}) => {
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div 
          className={cn(
            "h-5 rounded-md bg-muted",
            widthClass,
            !prefersReducedMotion && "animate-shimmer-skeleton"
          )}
          role="progressbar"
          aria-label={`${label} wird geladen`}
          aria-busy="true"
        />
        <div className="w-5 h-5 rounded-full bg-muted/60" />
      </div>
    </div>
  );
};

// ============================================================================
// Source Badge Component
// ============================================================================

interface SourceBadgeProps {
  field: OCRFieldResult;
}

const SourceBadge: React.FC<SourceBadgeProps> = ({ field }) => {
  const getSourceConfig = () => {
    if (field.confidence >= 90) {
      return {
        icon: CheckCircle,
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        label: 'Verifiziert'
      };
    }
    if (field.confidence >= 70) {
      return {
        icon: Sparkles,
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
        iconColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-800',
        label: 'OCR'
      };
    }
    if (field.confidence >= 50) {
      return {
        icon: Info,
        bgColor: 'bg-amber-50 dark:bg-amber-950/50',
        iconColor: 'text-amber-600 dark:text-amber-400',
        borderColor: 'border-amber-200 dark:border-amber-800',
        label: 'Prüfen'
      };
    }
    return {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-950/50',
      iconColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'Unsicher'
    };
  };

  const config = getSourceConfig();
  const Icon = config.icon;

  const formatTimestamp = (date?: Date) => {
    if (!date) return 'Gerade eben';
    return new Intl.DateTimeFormat('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 25,
              duration: 0.2 
            }}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full border transition-colors",
              "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/20",
              config.bgColor,
              config.borderColor
            )}
            aria-label={`${config.label}: ${field.confidence}% Konfidenz`}
          >
            <Icon className={cn("w-3.5 h-3.5", config.iconColor)} />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          className="p-3 max-w-[200px]"
          sideOffset={8}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-muted-foreground">Konfidenz</span>
              <span className={cn(
                "text-xs font-semibold",
                field.confidence >= 70 ? "text-emerald-600" : 
                field.confidence >= 50 ? "text-amber-600" : "text-red-600"
              )}>
                {field.confidence}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-muted-foreground">Quelle</span>
              <span className="text-xs text-foreground">{field.source}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-muted-foreground">Zeit</span>
              <span className="text-xs text-foreground">{formatTimestamp(field.validatedAt)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ============================================================================
// Validated Field Component
// ============================================================================

interface ValidatedFieldProps {
  field: OCRFieldResult;
  index: number;
}

const ValidatedField: React.FC<ValidatedFieldProps> = ({ field, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-b-0"
    >
      <span className="text-sm text-muted-foreground">{field.label}</span>
      <div className="flex items-center gap-2">
        <motion.span
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 + 0.1, duration: 0.2 }}
          className="text-sm font-medium text-foreground"
        >
          {field.value || '—'}
        </motion.span>
        <SourceBadge field={field} />
      </div>
    </motion.div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const OCRValidationSkeleton: React.FC<OCRValidationSkeletonProps> = ({
  fields,
  isLoading = false,
  className,
  showHeader = true,
  headerTitle = 'Erkannte Daten'
}) => {
  // Determine field widths based on expected content length
  const getWidthClass = (label: string): string => {
    const shortLabels = ['ID', 'Nr.', 'PLZ', 'Land'];
    const longLabels = ['Name', 'Adresse', 'E-Mail', 'Strasse'];
    
    if (shortLabels.some(s => label.includes(s))) return 'w-16';
    if (longLabels.some(s => label.includes(s))) return 'w-40';
    return 'w-28';
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h4 className="text-sm font-semibold text-foreground">{headerTitle}</h4>
          {isLoading && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
            />
          )}
        </div>
      )}

      {/* Fields Container */}
      <div className="bg-card rounded-xl border border-border p-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            // Loading State - Skeleton Fields
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {fields.map((field) => (
                <SkeletonField 
                  key={field.id} 
                  label={field.label}
                  widthClass={getWidthClass(field.label)}
                />
              ))}
            </motion.div>
          ) : (
            // Validated State - Real Data
            <motion.div
              key="validated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {fields.map((field, index) => (
                <ValidatedField 
                  key={field.id} 
                  field={field}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary Footer */}
      {!isLoading && fields.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.2 }}
          className="flex items-center justify-between mt-3 px-1"
        >
      <span className="text-xs text-muted-foreground">
            {fields.length} Felder erkannt
          </span>
          <span className={cn(
            "text-xs",
            Math.round(fields.reduce((acc, f) => acc + f.confidence, 0) / fields.length) >= 70 
              ? "text-emerald-600 dark:text-emerald-400" 
              : "text-muted-foreground"
          )}>
            Ø {Math.round(fields.reduce((acc, f) => acc + f.confidence, 0) / fields.length)}% Konfidenz
          </span>
        </motion.div>
      )}
    </div>
  );
};

// ============================================================================
// Demo/Example Component
// ============================================================================

export const OCRValidationDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  const demoFields: OCRFieldResult[] = [
    { id: '1', label: 'Name', value: 'Max Mustermann', confidence: 95, source: 'OCR', validatedAt: new Date() },
    { id: '2', label: 'Geburtsdatum', value: '15.03.1985', confidence: 88, source: 'OCR', validatedAt: new Date() },
    { id: '3', label: 'AHV-Nr.', value: '756.1234.5678.90', confidence: 72, source: 'OCR', validatedAt: new Date() },
    { id: '4', label: 'Adresse', value: 'Musterstrasse 12, 8000 Zürich', confidence: 65, source: 'OCR', validatedAt: new Date() },
    { id: '5', label: 'Bruttolohn', value: 'CHF 85\'400.00', confidence: 45, source: 'OCR', validatedAt: new Date() },
  ];

  // Simulate loading
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-md mx-auto p-6">
      <OCRValidationSkeleton
        fields={demoFields}
        isLoading={isLoading}
        headerTitle="Lohnausweis"
      />
      <button 
        onClick={() => setIsLoading(true)}
        className="mt-4 text-sm text-primary hover:underline"
      >
        Demo neu starten
      </button>
    </div>
  );
};

export default OCRValidationSkeleton;
