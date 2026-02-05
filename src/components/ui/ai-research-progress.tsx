import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Circle, FileText } from 'lucide-react';
import { Progress } from './progress';
import { ValidationProgress } from '@/types/documentProfile';

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
      preparing: 'Metadaten prüfen',
      metadata: 'Metadaten geprüft',
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
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Animated Header Icon */}
      <motion.div 
        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Search className="w-7 h-7 text-primary" />
      </motion.div>

      {/* Shimmer Title */}
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-foreground text-lg">
          Dokument wird analysiert
        </h3>
        <p className="text-sm animate-shimmer font-medium">
          {progress.message}
        </p>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Steps List */}
      <div className="w-full space-y-2.5">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="flex items-center gap-3"
          >
            {/* Step Icon */}
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {step.status === 'complete' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </motion.div>
              ) : step.status === 'active' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent"
                />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40" strokeWidth={2} />
              )}
            </div>

            {/* Step Label */}
            <span 
              className={`text-sm transition-colors ${
                step.status === 'complete' 
                  ? 'text-muted-foreground' 
                  : step.status === 'active' 
                    ? 'text-foreground font-medium animate-shimmer' 
                    : 'text-muted-foreground/50'
              }`}
            >
              {step.status === 'complete' ? '✓ ' : ''}{step.label}
              {step.status === 'active' && '...'}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Keywords Section */}
      <AnimatePresence>
        {foundKeywords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full space-y-2"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Keywords gefunden
            </p>
            <div className="flex flex-wrap gap-2">
              {foundKeywords.map((keyword, index) => (
                <motion.div
                  key={keyword}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.2 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                >
                  <FileText className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{keyword}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="w-full space-y-2 pt-2">
        <Progress 
          value={progress.percent} 
          className="w-full h-1.5"
        />
        <p className="text-xs text-muted-foreground text-center">
          {progress.percent}% abgeschlossen
        </p>
      </div>
    </div>
  );
};

export default AIResearchProgress;
