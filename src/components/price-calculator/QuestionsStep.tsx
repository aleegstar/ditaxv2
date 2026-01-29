import React from 'react';
import { getQuestionsForSection } from '@/config/yesNoQuestions';
import { YesNoQuestion } from './YesNoQuestion';
import { RepeaterCountInput } from './RepeaterCountInput';
import { useI18n } from '@/contexts/I18nContext';

interface QuestionsStepProps {
  section: 'income' | 'assets' | 'deductions';
  answers: Record<string, boolean>;
  repeaterCounts: Record<string, number>;
  onAnswer: (questionId: string, answer: boolean) => void;
  onRepeaterCount: (questionId: string, count: number) => void;
}

export const QuestionsStep: React.FC<QuestionsStepProps> = ({
  section,
  answers,
  repeaterCounts,
  onAnswer,
  onRepeaterCount
}) => {
  const { t } = useI18n();
  const questions = getQuestionsForSection(section, t).questions;

  return (
    <div className="space-y-6">
      {questions.map((question) => (
        <div key={question.id} className="border border-[#E2E8F0] rounded-xl p-6 bg-white">
          <YesNoQuestion
            question={question}
            answer={answers[question.id]}
            onAnswer={(answer) => onAnswer(question.id, answer)}
          />
          
          {/* Show repeater count input if question is answered "yes" and has repeater */}
          {answers[question.id] && question.requiresRepeater && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <RepeaterCountInput
                label={`Anzahl ${question.requiresRepeater.title}`}
                value={repeaterCounts[question.id] || question.requiresRepeater.minimumEntries}
                min={question.requiresRepeater.minimumEntries}
                onChange={(count) => onRepeaterCount(question.id, count)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};