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
      {/* Question Section */}
      <div className="space-y-4 text-center md:text-left mb-8">
        <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground tracking-tight font-medium leading-tight">
          {question.text}
        </h2>
      </div>

      {/* Info Accordion — glass style */}
      {question.explanation && (
        <div className="mb-8">
          <details 
            className="group rounded-2xl overflow-hidden border border-border/60 bg-muted/30 backdrop-blur-sm"
            open={isExpanded}
            onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-muted/50 transition-colors text-muted-foreground font-medium text-sm list-none [&::-webkit-details-marker]:hidden">
              <div className="p-1.5 rounded-xl bg-muted text-muted-foreground group-open:bg-primary/10 group-open:text-primary transition-colors">
                <Info className="w-4 h-4" />
              </div>
              <span>{t.yesNoForm.moreInfo}</span>
              <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground/60 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/30 mt-2">
              <div className="pt-4">
                <p>{question.explanation}</p>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Yes/No Selection Grid — liquid glass cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* YES Option */}
        <button
          onClick={() => onAnswer(true)}
          className={cn(
            "relative group cursor-pointer text-left",
            "h-full p-6 rounded-2xl transition-all duration-300",
            "flex flex-col items-start gap-4",
            "backdrop-blur-sm border",
            answer === true
              ? "bg-emerald-50/80 border-emerald-200/60 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.15)]"
              : "bg-background border-border/50 hover:border-emerald-200/60 hover:bg-emerald-50/40 hover:shadow-lg hover:-translate-y-0.5"
          )}
        >
          <div className={cn(
            "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300",
            answer === true
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              : "bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-600"
          )}>
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-lg font-semibold text-foreground mb-0.5 tracking-tight">
              {t.yesNoForm.yes}
            </span>
            <span className="block text-sm text-muted-foreground">
              {t.yesNoForm.yesDescription}
            </span>
          </div>
        </button>

        {/* NO Option */}
        <button
          onClick={() => onAnswer(false)}
          className={cn(
            "relative group cursor-pointer text-left",
            "h-full p-6 rounded-2xl transition-all duration-300",
            "flex flex-col items-start gap-4",
            "backdrop-blur-sm border",
            answer === false
              ? "bg-rose-50/80 border-rose-200/60 shadow-[0_8px_32px_-8px_rgba(244,63,94,0.15)]"
              : "bg-background border-border/50 hover:border-rose-200/60 hover:bg-rose-50/40 hover:shadow-lg hover:-translate-y-0.5"
          )}
        >
          <div className={cn(
            "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300",
            answer === false
              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
              : "bg-muted text-muted-foreground group-hover:bg-rose-100 group-hover:text-rose-600"
          )}>
            <X className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-lg font-semibold text-foreground mb-0.5 tracking-tight">
              {t.yesNoForm.no}
            </span>
            <span className="block text-sm text-muted-foreground">
              {t.yesNoForm.noDescription}
            </span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
