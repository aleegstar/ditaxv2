/**
 * Document Check Screen Component
 * 
 * Calm, helpful AI notification dialog for post-OCR validation results.
 * Designed to feel like a friendly AI assistant, not a technical error.
 * 
 * PRIVACY: Shows only validation results, never document content.
 */

import React from 'react';
import { Info, Upload, FileCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ValidationResult } from '@/types/documentProfile';
import { getDocumentProfile } from '@/config/documentProfiles';
import { cn } from '@/lib/utils';
import ditaxSymbol from '@/assets/ditax-symbol.svg';

interface DocumentCheckScreenProps {
  result: ValidationResult;
  fileName: string;
  onConfirm: () => void;
  onReupload: () => void;
  onClose?: () => void;
  isConfirming?: boolean;
}

export const DocumentCheckScreen: React.FC<DocumentCheckScreenProps> = ({
  result,
  fileName,
  onConfirm,
  onReupload,
  onClose,
  isConfirming = false
}) => {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const profile = getDocumentProfile(result.best.docTypeId);
  const confidence = result.best.confidence;
  const isLowConfidence = confidence < 70;
  const documentLabel = profile?.label || 'Dokument';

  // Get notification content based on confidence
  const getNotificationContent = () => {
    if (confidence >= 70) {
      return {
        title: `${documentLabel} erfolgreich erkannt`,
        body: 'Das Dokument wurde erkannt und kann eingereicht werden.',
        variant: 'success' as const
      };
    }
    if (confidence >= 50) {
      return {
        title: `${documentLabel} nicht eindeutig erkannt`,
        body: 'Wir konnten das Dokument nicht sicher zuordnen. Bitte prüfe, ob es sich um das richtige Dokument handelt.',
        variant: 'warning' as const
      };
    }
    return {
      title: `${documentLabel} konnte nicht erkannt werden`,
      body: 'Wir konnten den Text in diesem Dokument nicht sicher auslesen. Bitte prüfe, ob es sich um das richtige Dokument handelt.',
      variant: 'info' as const
    };
  };

  const notification = getNotificationContent();

  // Variant styles for notification card
  const variantStyles = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800/50',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800/50',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400'
    }
  };

  const styles = variantStyles[notification.variant];

  return (
    <motion.div 
      className="space-y-5"
      initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-foreground">Dokumentenprüfung</span>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted"
            aria-label="Schliessen"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Ditax Logo Header */}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="w-12 h-12 rounded-full bg-white border border-border/50 flex items-center justify-center">
          <img 
            src={ditaxSymbol} 
            alt="Ditax" 
            className="w-7 h-7 object-contain"
          />
        </div>
      </div>

      {/* Notification Card */}
      <motion.div 
        className={cn(
          'p-4 rounded-2xl border',
          styles.bg,
          styles.border
        )}
        initial={!prefersReducedMotion ? { opacity: 0, scale: 0.98 } : undefined}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <div className="flex gap-3">
          {/* Icon */}
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            styles.iconBg
          )}>
            <Info className={cn('w-5 h-5', styles.iconColor)} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-[15px] leading-tight mb-1">
              {notification.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {notification.body}
            </p>
          </div>
        </div>
      </motion.div>

      {/* File name - subtle */}
      <p className="text-xs text-muted-foreground/70 truncate text-center">
        {fileName}
      </p>

      {/* Action Buttons */}
      <div className="space-y-3 pt-1">
        {/* Primary Action */}
        {isLowConfidence ? (
          <Button 
            onClick={onReupload} 
            className="w-full rounded-xl"
            size="lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            Anderes Dokument hochladen
          </Button>
        ) : (
          <Button 
            onClick={onConfirm}
            disabled={isConfirming}
            className="w-full rounded-xl"
            size="lg"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            {isConfirming ? 'Wird verarbeitet...' : 'Dokument einreichen'}
          </Button>
        )}
        
        {/* Secondary Action */}
        {isLowConfidence ? (
          <Button 
            variant="outline"
            onClick={onConfirm}
            disabled={isConfirming}
            className="w-full rounded-xl border-border"
            size="default"
          >
            {isConfirming ? 'Wird verarbeitet...' : 'Dokument trotzdem einreichen'}
          </Button>
        ) : (
          <Button 
            variant="outline"
            onClick={onReupload}
            className="w-full rounded-xl border-border"
            size="default"
          >
            <Upload className="w-4 h-4 mr-2" />
            Andere Datei hochladen
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default DocumentCheckScreen;
