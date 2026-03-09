import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Info, ChevronDown } from 'lucide-react';
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
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useI18n();

  return (
    <div className={cn('flex-1 flex flex-col items-center justify-center', className)}>
      {/* Card area */}
      <div className="relative w-full max-w-sm mx-auto flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } }}
            className="w-full"
          >
            <div className="relative rounded-3xl border-2 border-border/30 bg-card p-6 pb-8 shadow-lg">
              {/* Question Content */}
              <div className="text-center">
                <h2 className="text-xl md:text-2xl text-foreground tracking-tight font-semibold leading-tight mb-4">
                  {question.text}
                </h2>

                {question.explanation && (
                  <div className="mt-4">
                    <details
                      className="group rounded-2xl overflow-hidden border border-border/40 bg-muted/20 text-left"
                      open={isExpanded}
                      onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
                    >
                      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/40 transition-colors text-muted-foreground font-medium text-sm list-none [&::-webkit-details-marker]:hidden">
                        <div className="p-1.5 rounded-xl bg-muted/60 text-muted-foreground group-open:bg-primary/10 group-open:text-primary transition-colors">
                          <Info className="w-4 h-4" />
                        </div>
                        <span>{t.yesNoForm.moreInfo}</span>
                        <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground/50 transition-transform duration-300 group-open:rotate-180" />
                      </summary>
                      <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed border-t border-border/20">
                        <div className="pt-3">
                          <p>{question.explanation}</p>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-8 mt-6 mb-4 shrink-0">
        <motion.button
          onClick={() => onAnswer(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'border-2 border-destructive/25 bg-background shadow-sm',
            'hover:bg-destructive/8 hover:border-destructive/40',
            'transition-colors duration-200'
          )}
        >
          <ThumbsDown className="w-6 h-6 text-destructive" strokeWidth={2.5} />
        </motion.button>

        <motion.button
          onClick={() => onAnswer(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'border-2 border-primary/25 bg-background shadow-sm',
            'hover:bg-primary/8 hover:border-primary/40',
            'transition-colors duration-200'
          )}
        >
          <ThumbsUp className="w-6 h-6 text-primary" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
};
