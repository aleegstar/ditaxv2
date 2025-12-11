import React from 'react';
import { YesNoQuestion as YesNoQuestionType } from '@/types/multiStepYesNo';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { isAndroidEnvironment } from '@/utils/platform';

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
  const isAndroid = isAndroidEnvironment();

  // Android-safe version without animations or blur effects
  if (isAndroid) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg sm:text-xl font-medium text-foreground mb-2 break-words hyphens-auto">
            {question.text}
          </h3>
          {question.explanation && (
            <p className="text-sm text-muted-foreground break-words hyphens-auto">
              {question.explanation}
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => onAnswer(true)}
            className={`flex items-center justify-center gap-2 flex-1 min-h-[48px] sm:min-h-[56px] px-4 sm:px-6 py-3 sm:py-4 text-base font-medium rounded-xl ${
              answer === true
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground border border-border'
            }`}
          >
            <Check className="w-4 h-4" />
            Ja
          </button>
          <button
            onClick={() => onAnswer(false)}
            className={`flex items-center justify-center gap-2 flex-1 min-h-[48px] sm:min-h-[56px] px-4 sm:px-6 py-3 sm:py-4 text-base font-medium rounded-xl ${
              answer === false
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground border border-border'
            }`}
          >
            <X className="w-4 h-4" />
            Nein
          </button>
        </div>
      </div>
    );
  }

  // Original version with animations for web
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 break-words hyphens-auto">
          {question.text}
        </h3>
        {question.explanation && (
          <p className="text-sm text-gray-600 break-words hyphens-auto">
            {question.explanation}
          </p>
        )}
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={() => onAnswer(true)}
          className={`flex items-center justify-center gap-2 flex-1 min-h-[48px] sm:min-h-[56px] px-4 sm:px-6 py-3 sm:py-4 text-base font-medium rounded-xl transition-colors duration-200 ${
            answer === true
              ? 'bg-[#1d64ff] text-white hover:bg-[#1d64ff]/90'
              : 'bg-white text-black border border-[#E2E8F0] hover:bg-gray-50'
          }`}
        >
          <Check className="w-4 h-4" />
          Ja
        </button>
        <button
          onClick={() => onAnswer(false)}
          className={`flex items-center justify-center gap-2 flex-1 min-h-[48px] sm:min-h-[56px] px-4 sm:px-6 py-3 sm:py-4 text-base font-medium rounded-xl transition-colors duration-200 ${
            answer === false
              ? 'bg-[#1d64ff] text-white hover:bg-[#1d64ff]/90'
              : 'bg-white text-black border border-[#E2E8F0] hover:bg-gray-50'
          }`}
        >
          <X className="w-4 h-4" />
          Nein
        </button>
      </div>
    </div>
  );
};