import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Info, ChevronDown } from 'lucide-react';
import { YesNoQuestion as YesNoQuestionType } from '@/types/multiStepYesNo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';

interface YesNoQuestionProps {
  question: YesNoQuestionType;
  answer?: boolean;
  onAnswer: (answer: boolean) => void;
  className?: string;
}

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  question,
  answer,
  onAnswer,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex-1 flex flex-col", className)}
    >
      {/* Question */}
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl text-foreground tracking-tight font-semibold leading-tight">
          {question.text}
        </h2>
      </div>

      {/* Info Accordion */}
      {question.explanation && (
        <div className="mb-8">
          <details 
            className="group rounded-2xl overflow-hidden border border-border/40 bg-muted/20"
            open={isExpanded}
            onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-muted/40 transition-colors text-muted-foreground font-medium text-sm list-none [&::-webkit-details-marker]:hidden">
              <div className="p-1.5 rounded-xl bg-muted/60 text-muted-foreground group-open:bg-primary/10 group-open:text-primary transition-colors">
                <Info className="w-4 h-4" />
              </div>
              <span>{t.yesNoForm.moreInfo}</span>
              <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground/50 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/20">
              <div className="pt-3">
                <p>{question.explanation}</p>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Yes/No Cards — side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* YES */}
        <button
          onClick={() => onAnswer(true)}
          className={cn(
            "group cursor-pointer text-left p-5 rounded-2xl transition-all duration-300 border",
            answer === true
              ? "bg-emerald-50/70 border-emerald-200/50 shadow-sm"
              : "bg-background border-border/30 hover:border-emerald-200/50 hover:bg-emerald-50/30"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
            answer === true
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
              : "bg-muted/60 text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-600"
          )}>
            <Check className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="block text-base font-semibold text-foreground mb-0.5">
            {t.yesNoForm.yes}
          </span>
          <span className="block text-xs text-muted-foreground leading-relaxed">
            {t.yesNoForm.yesDescription}
          </span>
        </button>

        {/* NO */}
        <button
          onClick={() => onAnswer(false)}
          className={cn(
            "group cursor-pointer text-left p-5 rounded-2xl transition-all duration-300 border",
            answer === false
              ? "bg-rose-50/70 border-rose-200/50 shadow-sm"
              : "bg-background border-border/30 hover:border-rose-200/50 hover:bg-rose-50/30"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
            answer === false
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
              : "bg-muted/60 text-muted-foreground group-hover:bg-rose-100 group-hover:text-rose-600"
          )}>
            <X className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="block text-base font-semibold text-foreground mb-0.5">
            {t.yesNoForm.no}
          </span>
          <span className="block text-xs text-muted-foreground leading-relaxed">
            {t.yesNoForm.noDescription}
          </span>
        </button>
      </div>
    </motion.div>
  );
};
