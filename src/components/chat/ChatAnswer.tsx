import React from 'react';
import { Check } from 'lucide-react';
interface ChatAnswerProps {
  answer: string | boolean | any;
  stepType?: 'text' | 'boolean' | 'select' | 'address';
  isConfirmed?: boolean;
}
export const ChatAnswer: React.FC<ChatAnswerProps> = ({
  answer,
  stepType,
  isConfirmed = true
}) => {
  const formatAnswer = () => {
    if (stepType === 'boolean') {
      return answer ? 'Ja' : 'Nein';
    }
    if (stepType === 'address' && typeof answer === 'object') {
      return `${answer.address}, ${answer.postalCode} ${answer.city}`;
    }
    if (typeof answer === 'string') {
      return answer;
    }
    return String(answer);
  };
  return <div className="flex items-start justify-end gap-3 mb-4 animate-fade-in">
      <div className="flex-1 flex justify-end">
        <div className="max-w-md backdrop-blur-sm rounded-tr-sm px-4 py-3 shadow-lg border border-blue-400/20 rounded-full bg-blue-500/[0.12]">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">
              {formatAnswer()}
            </span>
            {isConfirmed && <Check className="w-4 h-4 text-green-400 flex-shrink-0" />}
          </div>
        </div>
      </div>
    </div>;
};