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
        <h2 className="text-2xl md:text-3xl lg:text-4xl text-slate-900 tracking-tight font-medium leading-tight">
          {question.text}
        </h2>
      </div>

      {/* Info Accordion */}
      {question.explanation && (
        <div className="mb-8">
          <details 
            className="group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden"
            open={isExpanded}
            onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
          >
            <summary className="flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-slate-100 transition-colors text-slate-600 font-medium text-sm list-none [&::-webkit-details-marker]:hidden">
              <div className="p-1 rounded-md bg-slate-200 text-slate-500 group-open:bg-blue-100 group-open:text-blue-600 transition-colors">
                <Info className="w-4 h-4" />
              </div>
              <span>{t.yesNoForm.moreInfo}</span>
              <ChevronDown className="w-4 h-4 ml-auto text-slate-400 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-0 text-sm text-slate-500 leading-relaxed border-t border-slate-200/50 mt-2 bg-white rounded-b-xl">
              <div className="pt-4">
                <p>{question.explanation}</p>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Yes/No Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* YES Option */}
        <button
          onClick={() => onAnswer(true)}
          className={cn(
            "relative group cursor-pointer text-left",
            "h-full p-6 rounded-2xl border-2 shadow-sm transition-all duration-200",
            "hover:shadow-md hover:-translate-y-0.5",
            "flex flex-col items-start gap-4",
            answer === true
              ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100"
              : "border-emerald-100 bg-emerald-50 hover:border-emerald-200"
          )}
        >
          <div className={cn(
            "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all",
            answer === true
              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200"
              : "bg-emerald-100 text-emerald-600"
          )}>
            <Check className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xl font-semibold text-slate-900 mb-1 tracking-tight">
              {t.yesNoForm.yes}
            </span>
            <span className="block text-base text-slate-500 font-medium">
              {t.yesNoForm.yesDescription}
            </span>
          </div>
        </button>

        {/* NO Option */}
        <button
          onClick={() => onAnswer(false)}
          className={cn(
            "relative group cursor-pointer text-left",
            "h-full p-6 rounded-2xl border-2 shadow-sm transition-all duration-200",
            "hover:shadow-md hover:-translate-y-0.5",
            "flex flex-col items-start gap-4",
            answer === false
              ? "border-rose-500 bg-gradient-to-br from-rose-50 to-rose-100"
              : "border-rose-100 bg-rose-50 hover:border-rose-200"
          )}
        >
          <div className={cn(
            "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all",
            answer === false
              ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-200"
              : "bg-rose-100 text-rose-600"
          )}>
            <X className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xl font-semibold text-slate-900 mb-1 tracking-tight">
              {t.yesNoForm.no}
            </span>
            <span className="block text-base text-slate-500 font-medium">
              {t.yesNoForm.noDescription}
            </span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
