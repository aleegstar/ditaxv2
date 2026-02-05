/**
 * AI Research Progress Component
 * 
 * Displays OCR validation progress with shimmer animations
 * and step-by-step visual feedback in an "AI Research" aesthetic.
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Circle, FileText, Loader2 } from 'lucide-react';
import { Progress } from './progress';
import { ValidationProgress } from '@/types/documentProfile';
import { cn } from '@/lib/utils';

interface AIResearchProgressProps {
  progress: ValidationProgress;
  foundKeywords?: string[];
}

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
}

const AIResearchProgress: React.FC<AIResearchProgressProps> = ({ 
  progress, 
  foundKeywords = [] 
}) => {
  // Map validation steps to UI steps
  const steps = useMemo((): Step[] => {
    const stepOrder = ['preparing', 'metadata', 'layout', 'compressing', 'ocr', 'analyzing', 'complete'];
    const currentIndex = stepOrder.indexOf(progress.step);
    
    const stepLabels: Record<string, string> = {
      preparing: 'Dokument vorbereiten',
      metadata: 'Metadaten prüfen',
      layout: 'Layout analysieren',
      compressing: 'Bild optimieren',
      ocr: 'Text erkennen',
      analyzing: 'Dokumenttyp ermitteln',
      complete: 'Analyse abgeschlossen'
    };

    return stepOrder.slice(0, -1).map((stepId, index) => ({
      id: stepId,
      label: stepLabels[stepId],
      status: index < currentIndex ? 'complete' : index === currentIndex ? 'active' : 'pending'
    }));
  }, [progress.step]);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Animated AI Icon with Glow */}
      <div className="relative">
        <motion.div 
          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
          animate={{ 
            scale: [1, 1.05, 1],
            boxShadow: [
              '0 0 0 0 rgba(var(--primary-rgb), 0)',
              '0 0 20px 5px rgba(var(--primary-rgb), 0.15)',
              '0 0 0 0 rgba(var(--primary-rgb), 0)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-9 h-9 text-primary" />
        </motion.div>
        
        {/* Orbiting dots */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-primary/60" />
        </motion.div>
      </div>

      {/* Title with Shimmer Subtitle */}
      <div className="text-center space-y-2">
        <h3 className="font-semibold text-foreground text-lg">
          AI analysiert Dokument
        </h3>
        <div className="h-5 overflow-hidden">
          <motion.p 
            key={progress.message}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-primary font-medium shimmer-text"
          >
            {progress.message}
          </motion.p>
        </div>
      </div>

      {/* Divider with gradient */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Steps List */}
      <div className="w-full space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
            className={cn(
              "flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors",
              step.status === 'active' && "bg-primary/5"
            )}
          >
            {/* Step Icon */}
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              {step.status === 'complete' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="w-6 h-6 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </motion.div>
              ) : step.status === 'active' ? (
                <motion.div
                  className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </motion.div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <Circle className="w-3 h-3 text-muted-foreground/40" strokeWidth={2} />
                </div>
              )}
            </div>

            {/* Step Label */}
            <span 
              className={cn(
                "text-sm transition-all duration-300",
                step.status === 'complete' && "text-muted-foreground",
                step.status === 'active' && "text-foreground font-medium",
                step.status === 'pending' && "text-muted-foreground/50"
              )}
            >
              {step.label}
              {step.status === 'active' && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-primary"
                >
                  ...
                </motion.span>
              )}
            </span>

            {/* Shimmer indicator for active step */}
            {step.status === 'active' && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: "linear" }}
                className="ml-auto h-0.5 bg-gradient-to-r from-primary/50 to-transparent rounded-full max-w-16"
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Keywords Section - "Sources Found" */}
      <AnimatePresence>
        {foundKeywords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full space-y-2.5 pt-1"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quellen erkannt
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {foundKeywords.slice(0, 6).map((keyword, index) => (
                <motion.div
                  key={keyword}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.25 }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md"
                >
                  <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 max-w-24 truncate">
                    {keyword}
                  </span>
                </motion.div>
              ))}
              {foundKeywords.length > 6 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center px-2 py-1 text-xs text-muted-foreground"
                >
                  +{foundKeywords.length - 6} mehr
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="w-full space-y-2 pt-2">
        <div className="relative">
          <Progress 
            value={progress.percent} 
            className="w-full h-2"
          />
          {/* Shimmer overlay on progress bar */}
          <motion.div
            className="absolute inset-0 h-2 rounded-full overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
        <p className="text-xs text-muted-foreground text-center tabular-nums">
          {progress.percent}% abgeschlossen
        </p>
      </div>
    </div>
  );
};

export default AIResearchProgress;
