import React, { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
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

const SWIPE_THRESHOLD = 100;

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  question,
  answer,
  onAnswer,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const { t } = useI18n();

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const yesOpacity = useTransform(x, [0, 80], [0, 1]);
  const noOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const offset = info.offset.x;
    if (offset > SWIPE_THRESHOLD) {
      setExitDirection('right');
      onAnswer(true);
    } else if (offset < -SWIPE_THRESHOLD) {
      setExitDirection('left');
      onAnswer(false);
    }
  }, [onAnswer]);

  const handleButtonAnswer = useCallback((answer: boolean) => {
    setExitDirection(answer ? 'right' : 'left');
    onAnswer(answer);
  }, [onAnswer]);

  return (
    <div className={cn("flex-1 flex flex-col items-center justify-center", className)}>
      {/* Swipeable Card */}
      <div className="relative w-full max-w-sm mx-auto flex-1 flex items-center justify-center">
        <motion.div
          key={question.id}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{
            x: exitDirection === 'right' ? 300 : exitDirection === 'left' ? -300 : 0,
            opacity: 0,
            rotate: exitDirection === 'right' ? 20 : exitDirection === 'left' ? -20 : 0,
            transition: { duration: 0.3 }
          }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ x, rotate }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.8}
          onDragEnd={handleDragEnd}
          className="w-full cursor-grab active:cursor-grabbing select-none"
        >
          <div className="relative rounded-3xl border-2 border-border/30 bg-card p-6 pb-8 shadow-lg overflow-hidden">
            {/* Swipe Indicators overlaid on card */}
            <motion.div
              style={{ opacity: yesOpacity }}
              className="absolute top-6 left-6 z-10 px-4 py-2 rounded-xl border-3 border-primary bg-primary/10 rotate-[-15deg]"
            >
              <span className="text-primary font-black text-2xl tracking-wide uppercase">
                {t.yesNoForm.yes}
              </span>
            </motion.div>

            <motion.div
              style={{ opacity: noOpacity }}
              className="absolute top-6 right-6 z-10 px-4 py-2 rounded-xl border-3 border-destructive bg-destructive/10 rotate-[15deg]"
            >
              <span className="text-destructive font-black text-2xl tracking-wide uppercase">
                {t.yesNoForm.no}
              </span>
            </motion.div>

            {/* Question Content */}
            <div className="pt-4 text-center">
              <h2 className="text-xl md:text-2xl text-foreground tracking-tight font-semibold leading-tight mb-4 pointer-events-none">
                {question.text}
              </h2>

              {/* Info Accordion */}
              {question.explanation && (
                <div className="mt-4 pointer-events-auto">
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

            {/* Swipe hint */}
            <div className="mt-6 flex items-center justify-center gap-3 text-muted-foreground/40 pointer-events-none">
              <ThumbsDown className="w-4 h-4" />
              <div className="flex items-center gap-1">
                <div className="w-5 h-[2px] bg-muted-foreground/20 rounded-full" />
                <div className="w-2 h-2 bg-muted-foreground/20 rounded-full" />
                <div className="w-5 h-[2px] bg-muted-foreground/20 rounded-full" />
              </div>
              <ThumbsUp className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons (Tinder-style bottom buttons) */}
      <div className="flex items-center justify-center gap-6 mt-6 mb-4 shrink-0">
        {/* No Button */}
        <button
          onClick={() => handleButtonAnswer(false)}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
            "border-2 border-destructive/30 bg-background hover:bg-destructive/10 hover:border-destructive/50 hover:scale-110 active:scale-95",
            answer === false && "bg-destructive border-destructive text-destructive-foreground scale-110"
          )}
        >
          <ThumbsDown className={cn(
            "w-6 h-6",
            answer === false ? "text-destructive-foreground" : "text-destructive"
          )} strokeWidth={2.5} />
        </button>

        {/* Yes Button */}
        <button
          onClick={() => handleButtonAnswer(true)}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
            "border-2 border-primary/30 bg-background hover:bg-primary/10 hover:border-primary/50 hover:scale-110 active:scale-95",
            answer === true && "bg-primary border-primary text-primary-foreground scale-110"
          )}
        >
          <ThumbsUp className={cn(
            "w-6 h-6",
            answer === true ? "text-primary-foreground" : "text-primary"
          )} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
