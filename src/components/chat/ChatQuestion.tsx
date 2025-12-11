
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
        <div className="w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center bg-[#0087ff]/20">
          <div className="w-4 h-4 bg-white/60 rounded-full"></div>
        </div>
      </div>
      
      {/* Question Bubble and Info Button Container */}
      <div className="flex-1 max-w-md">
        <div className="flex items-start gap-2">
          {/* Question Bubble */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/40 shadow-xl px-4 py-3 rounded-full">
            <span className="text-white text-sm font-medium leading-relaxed">{question}</span>
          </div>
          
          {/* Info Button - Outside the bubble */}
          {explanation && (
            <button 
              onClick={onToggleInfo}
              className="flex-shrink-0 mt-1 p-1 text-white/40 hover:text-white/80 transition-colors duration-200 rounded-full hover:bg-white/10"
              aria-label="Mehr Informationen"
            >
              <HelpCircle size={16} />
            </button>
          )}
        </div>
        
        {/* Explanation - Below the bubble */}
        {explanation && showInfo && (
          <div className="mt-3 p-3 bg-white/90 backdrop-blur-sm rounded-lg text-gray-800 text-sm animate-fade-in border border-white/20 shadow-lg">
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
};
