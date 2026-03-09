import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
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

const SWIPE_THRESHOLD = 60;
const EXIT_DURATION = 0.32;

export interface SwipeCardHandle {
  triggerExit: (direction: 'left' | 'right') => void;
}

// Inner card that handles drag and exit animation
const SwipeCard = forwardRef<SwipeCardHandle, {
  question: YesNoQuestionType;
  onAnswer: (answer: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  t: any;
}>(({ question, onAnswer, isExpanded, setIsExpanded, t }, ref) => {
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null);
  const answeredRef = useRef(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const yesOpacity = useTransform(x, [0, 60], [0, 1]);
  const noOpacity = useTransform(x, [-60, 0], [1, 0]);

  const triggerAnswer = useCallback((direction: 'left' | 'right') => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    onAnswer(direction === 'right');
  }, [onAnswer]);

  // Expose triggerExit so buttons can animate the card out
  useImperativeHandle(ref, () => ({
    triggerExit: triggerAnswer,
  }), [triggerAnswer]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (answeredRef.current) return;
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > SWIPE_THRESHOLD || velocity > 400) {
      triggerAnswer('right');
    } else if (offset < -SWIPE_THRESHOLD || velocity < -400) {
      triggerAnswer('left');
    }
  }, [triggerAnswer]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: 0,
        rotate: 0,
        transition: { duration: 0.25, ease: 'easeOut' },
      }}
      exit={{
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.15 },
      }}
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.015 }}
      className="w-full cursor-grab active:cursor-grabbing select-none will-change-transform"
    >
      <div className="relative rounded-3xl border-2 border-border/30 bg-card p-6 pb-8 shadow-lg overflow-hidden">
        {/* Swipe Indicators */}
        <motion.div
          style={{ opacity: yesOpacity }}
          className="absolute top-5 left-5 z-10 px-3.5 py-1.5 rounded-xl border-2 border-primary bg-primary/10 rotate-[-12deg]"
        >
          <span className="text-primary font-black text-xl tracking-wide uppercase">
            {t.yesNoForm.yes}
          </span>
        </motion.div>
        <motion.div
          style={{ opacity: noOpacity }}
          className="absolute top-5 right-5 z-10 px-3.5 py-1.5 rounded-xl border-2 border-destructive bg-destructive/10 rotate-[12deg]"
        >
          <span className="text-destructive font-black text-xl tracking-wide uppercase">
            {t.yesNoForm.no}
          </span>
        </motion.div>

        {/* Question Content */}
        <div className="pt-4 text-center">
          <h2 className="text-xl md:text-2xl text-foreground tracking-tight font-semibold leading-tight mb-4 pointer-events-none">
            {question.text}
          </h2>

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
        <div className="mt-6 flex items-center justify-center gap-3 text-muted-foreground/30 pointer-events-none">
          <ThumbsDown className="w-4 h-4" />
          <div className="w-8 h-[1.5px] bg-muted-foreground/15 rounded-full" />
          <ThumbsUp className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  question,
  answer,
  onAnswer,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useI18n();
  const cardRef = useRef<SwipeCardHandle>(null);

  const handleButtonAnswer = useCallback(
    (isYes: boolean) => {
      // Trigger the card's exit animation instead of calling onAnswer directly
      cardRef.current?.triggerExit(isYes ? 'right' : 'left');
    },
    []
  );

  return (
    <div className={cn('flex-1 flex flex-col items-center justify-center', className)}>
      {/* Card area */}
      <div className="relative w-full max-w-sm mx-auto flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <SwipeCard
            ref={cardRef}
            key={question.id}
            question={question}
            onAnswer={onAnswer}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            t={t}
          />
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-8 mt-6 mb-4 shrink-0">
        <motion.button
          onClick={() => handleButtonAnswer(false)}
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
          onClick={() => handleButtonAnswer(true)}
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
