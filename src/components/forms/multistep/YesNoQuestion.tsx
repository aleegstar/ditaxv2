import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Info, ChevronDown } from 'lucide-react';
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
      <div className="mb-6 text-center md:text-left">
        <h2 className="text-2xl md:text-3xl text-foreground tracking-tight font-semibold leading-tight">
          {question.text}
        </h2>
      </div>

      {/* Info Accordion */}
      {question.explanation && (
        <div className="mb-6">
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

      {/* Yes/No Options — list style */}
      <div className="space-y-3">
        {/* YES */}
        <button
          onClick={() => onAnswer(true)}
          className={cn(
            "w-full flex items-center justify-between rounded-2xl p-4 transition-all duration-300 cursor-pointer text-left",
            answer === true
              ? "border border-emerald-400/60 bg-emerald-50/60 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]"
              : "border border-emerald-200/60 bg-emerald-50/30 hover:border-emerald-400/50 hover:bg-emerald-50/50"
          )}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium text-emerald-900">
              {t.yesNoForm.yes}
            </span>
            <span className="mt-0.5 text-xs text-emerald-700/70">
              {t.yesNoForm.yesDescription}
            </span>
          </div>
          <div className={cn(
            "w-6 h-6 rounded-full ml-4 shrink-0 flex items-center justify-center transition-all duration-300",
            answer === true
              ? "bg-emerald-500 text-white"
              : "border border-emerald-300"
          )}>
            {answer === true && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
          </div>
        </button>

        {/* NO */}
        <button
          onClick={() => onAnswer(false)}
          className={cn(
            "w-full flex items-center justify-between rounded-2xl p-4 transition-all duration-300 cursor-pointer text-left",
            answer === false
              ? "border border-rose-400/60 bg-rose-50/60 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.15)]"
              : "border border-rose-200/60 bg-rose-50/30 hover:border-rose-400/50 hover:bg-rose-50/50"
          )}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium text-rose-900">
              {t.yesNoForm.no}
            </span>
            <span className="mt-0.5 text-xs text-rose-700/70">
              {t.yesNoForm.noDescription}
            </span>
          </div>
          <div className={cn(
            "w-6 h-6 rounded-full ml-4 shrink-0 flex items-center justify-center transition-all duration-300",
            answer === false
              ? "bg-rose-500 text-white"
              : "border border-rose-300"
          )}>
            {answer === false && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
          </div>
        </button>
      </div>
    </motion.div>
  );
};
