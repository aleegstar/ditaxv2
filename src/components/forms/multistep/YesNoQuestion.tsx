import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Info } from 'lucide-react';
import { YesNoQuestion as YesNoQuestionType } from '@/types/multiStepYesNo';
import { cn } from '@/lib/utils';

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
  
  // Function to truncate explanation text
  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  };
  
  const shouldTruncate = question.explanation && question.explanation.length > 60;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn("w-full max-w-2xl mx-auto px-2 sm:px-4", className)}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4 sm:p-6 md:p-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Question Text */}
            <div className="text-center space-y-3">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground leading-tight break-all hyphens-auto px-2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {question.text}
              </h2>
              
              {question.explanation && (
                <div 
                  className="flex items-start gap-2 p-2 sm:p-3 md:p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors duration-200 mx-2"
                  onClick={() => shouldTruncate && setIsExpanded(!isExpanded)}
                >
                  <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed break-words hyphens-auto">
                    {shouldTruncate && !isExpanded 
                      ? `${truncateText(question.explanation)}...` 
                      : question.explanation
                    }
                    {shouldTruncate && (
                      <span className="text-blue-500 hover:text-blue-600 ml-1 font-medium">
                        {isExpanded ? " weniger anzeigen" : " mehr anzeigen"}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Yes/No Buttons */}
            <div className="flex gap-2 sm:gap-3 md:gap-4 justify-center px-2">
              <Button
                onClick={() => onAnswer(true)}
                className={cn(
                  "flex-1 max-w-[140px] sm:min-w-[120px] h-11 sm:h-12 md:h-14 text-sm sm:text-base font-medium rounded-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 transition-all duration-200 bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white border-0",
                  answer === true 
                    ? "shadow-[rgba(29,100,255,0.3)_0px_5px_15px_0px] scale-105" 
                    : "hover:scale-105",
                )}
                style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
              >
                <Check className="w-5 h-5 mr-2" />
                Ja
              </Button>
              
              <Button
                onClick={() => onAnswer(false)}
                className={cn(
                  "flex-1 max-w-[140px] sm:min-w-[120px] h-11 sm:h-12 md:h-14 text-sm sm:text-base font-medium rounded-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 transition-all duration-200",
                  answer === false 
                    ? "bg-red-500 hover:bg-red-500/90 text-white border-0 shadow-[rgba(239,68,68,0.3)_0px_5px_15px_0px] scale-105" 
                    : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:scale-105"
                )}
                style={answer === false ? { boxShadow: 'rgba(239, 68, 68, 0.2) 0px 3px 10px 0px' } : { boxShadow: 'rgba(0, 0, 0, 0.05) 0px 3px 5px 0px' }}
              >
                <X className="w-5 h-5 mr-2" />
                Nein
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};