import React from 'react';
import { YesNoQuestion as YesNoQuestionType } from '@/types/multiStepYesNo';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YesNoQuestionProps {
  question: YesNoQuestionType;
  answer?: boolean;
  onAnswer: (answer: boolean) => void;
}

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  question,
  answer,
  onAnswer
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg sm:text-xl font-medium text-slate-900 mb-2 break-words hyphens-auto">
          {question.text}
        </h3>
        {question.explanation && (
          <p className="text-sm text-slate-500 break-words hyphens-auto">
            {question.explanation}
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* YES Option */}
        <button
          onClick={() => onAnswer(true)}
          className={cn(
            "relative group cursor-pointer text-left",
            "h-full p-6 border rounded-2xl shadow-sm transition-all duration-200 flex items-start gap-4",
            answer === true
              ? "border-slate-300 ring-1 ring-slate-200 bg-white shadow-md"
              : "border-slate-200 bg-white hover:shadow-md hover:border-slate-300"
          )}
        >
          <div className={cn(
            "shrink-0 h-10 w-10 rounded-full border flex items-center justify-center transition-colors",
            answer === true
              ? "bg-emerald-400 border-emerald-400 text-white"
              : "border-slate-200 bg-slate-50 text-slate-300 group-hover:border-slate-300 group-hover:text-slate-400"
          )}>
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-lg font-semibold text-slate-900 mb-1">Ja</span>
            <span className="block text-sm text-slate-500 group-hover:text-slate-600">
              Diese Angabe trifft auf mich zu.
            </span>
          </div>
        </button>

        {/* NO Option */}
        <button
          onClick={() => onAnswer(false)}
          className={cn(
            "relative group cursor-pointer text-left",
            "h-full p-6 border rounded-2xl shadow-sm transition-all duration-200 flex items-start gap-4",
            answer === false
              ? "border-slate-300 ring-1 ring-slate-200 bg-white shadow-md"
              : "border-slate-200 bg-white hover:shadow-md hover:border-slate-300"
          )}
        >
          <div className={cn(
            "shrink-0 h-10 w-10 rounded-full border flex items-center justify-center transition-colors",
            answer === false
              ? "bg-rose-400 border-rose-400 text-white"
              : "border-slate-200 bg-slate-50 text-slate-300 group-hover:border-slate-300 group-hover:text-slate-400"
          )}>
            <X className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-lg font-semibold text-slate-900 mb-1">Nein</span>
            <span className="block text-sm text-slate-500 group-hover:text-slate-600">
              Diese Angabe trifft nicht auf mich zu.
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
