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
            "h-full p-6 bg-white border rounded-2xl shadow-sm transition-all duration-200 flex items-start gap-4",
            answer === true
              ? "border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/30"
              : "border-emerald-100 hover:shadow-md hover:border-emerald-400"
          )}
        >
          <div className={cn(
            "shrink-0 h-10 w-10 rounded-full border flex items-center justify-center transition-colors",
            answer === true
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "border-emerald-100 bg-emerald-50 text-emerald-600 group-hover:border-emerald-200 group-hover:text-emerald-700"
          )}>
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-lg font-semibold text-slate-900 mb-1">
              {t.yesNoForm.yes}
            </span>
            <span className="block text-sm text-slate-500 group-hover:text-slate-600">
              {t.yesNoForm.yesDescription}
            </span>
          </div>
        </button>

        {/* NO Option */}
        <button
          onClick={() => onAnswer(false)}
          className={cn(
            "relative group cursor-pointer text-left",
            "h-full p-6 bg-white border rounded-2xl shadow-sm transition-all duration-200 flex items-start gap-4",
            answer === false
              ? "border-red-600 ring-1 ring-red-600 bg-red-50/30"
              : "border-red-100 hover:shadow-md hover:border-red-400"
          )}
        >
          <div className={cn(
            "shrink-0 h-10 w-10 rounded-full border flex items-center justify-center transition-colors",
            answer === false
              ? "bg-red-600 border-red-600 text-white"
              : "border-red-100 bg-red-50 text-red-600 group-hover:border-red-200 group-hover:text-red-700"
          )}>
            <X className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-lg font-semibold text-slate-900 mb-1">
              {t.yesNoForm.no}
            </span>
            <span className="block text-sm text-slate-500 group-hover:text-slate-600">
              {t.yesNoForm.noDescription}
            </span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
