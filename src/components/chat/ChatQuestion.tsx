
import React from 'react';
import { HelpCircle } from 'lucide-react';


interface ChatQuestionProps {
  question: string;
  explanation?: string;
  showInfo: boolean;
  onToggleInfo: () => void;
}

export const ChatQuestion: React.FC<ChatQuestionProps> = ({
  question,
  explanation,
  showInfo,
  onToggleInfo
}) => {
  return (
    <div className="flex items-start gap-3 mb-8 animate-fade-in">
      {/* AI Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1D64FF]/10">
          <div className="w-4 h-4 bg-[#1D64FF]/60 rounded-full"></div>
        </div>
      </div>
      
      {/* Question Bubble and Info Button Container */}
      <div className="flex-1 max-w-md">
        <div className="flex items-start gap-2">
          {/* Question Bubble */}
          <div className="bg-slate-100 border border-slate-200 shadow-sm px-4 py-3 rounded-full">
            <span className="text-slate-800 text-sm font-medium leading-relaxed">{question}</span>
          </div>
          
          {/* Info Button - Outside the bubble */}
          {explanation && (
            <button 
              onClick={onToggleInfo}
              className="flex-shrink-0 mt-1 p-1 text-slate-400 hover:text-slate-600 transition-colors duration-200 rounded-full hover:bg-slate-100"
              aria-label="Mehr Informationen"
            >
              <HelpCircle size={16} />
            </button>
          )}
        </div>
        
        {/* Explanation - Below the bubble */}
        {explanation && showInfo && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-slate-700 text-sm animate-fade-in border border-blue-100 shadow-sm">
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
};
