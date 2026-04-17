import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
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

export interface SwipeCardHandle {
  triggerExit: (direction: 'left' | 'right') => void;
}

const cardVariants = {
  enter: { opacity: 0, scale: 0.97 },
  center: {
    opacity: 1,
    scale: 1,
    x: 0,
    rotate: 0,
    transition: { duration: 0.25, ease: 'easeOut' as const },
  },
  exit: (direction: number) => ({
    x: direction * 350,
    opacity: 0,
    scale: 0.85,
    rotate: direction * 18,
    transition: { duration: 0.35, ease: [0.36, 0, 0.66, -0.56] as const },
  }),
};

const SwipeCard = forwardRef<SwipeCardHandle, {
  question: YesNoQuestionType;
  onAnswer: (answer: boolean) => void;
  onSetDirection: (dir: number) => void;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  t: any;
}>(({ question, onAnswer, onSetDirection, isExpanded, setIsExpanded, t }, ref) => {
  const answeredRef = useRef(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-6, 0, 6]);
  const yesOpacity = useTransform(x, [0, 60], [0, 1]);
  const noOpacity = useTransform(x, [-60, 0], [1, 0]);

  const triggerAnswer = useCallback((direction: 'left' | 'right') => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    onSetDirection(direction === 'right' ? 1 : -1);
    onAnswer(direction === 'right');
  }, [onAnswer, onSetDirection]);

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
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.01 }}
      className="w-full cursor-grab active:cursor-grabbing select-none will-change-transform"
    >
      <div className="relative rounded-3xl border border-border/40 bg-card px-6 py-10 shadow-sm overflow-hidden">
        {/* Subtle Swipe Indicators */}
        <motion.div
          style={{ opacity: yesOpacity }}
          className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full border border-primary/30 bg-primary/5"
        >
          <span className="text-primary font-semibold text-xs tracking-wide uppercase">
            {t.yesNoForm.yes}
          </span>
        </motion.div>
        <motion.div
          style={{ opacity: noOpacity }}
          className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full border border-border bg-muted/40"
        >
          <span className="text-foreground font-semibold text-xs tracking-wide uppercase">
            {t.yesNoForm.no}
          </span>
        </motion.div>

        {/* Question Content */}
        <div className="text-center">
          <h2 className="text-2xl text-foreground tracking-tight font-semibold leading-tight pointer-events-none">
            {question.text}
          </h2>

          {question.explanation && (
            <div className="mt-6 pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
              >
                {isExpanded ? 'Weniger anzeigen' : 'Mehr erfahren'}
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm text-muted-foreground leading-relaxed mt-4 px-2">
                      {question.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
  const [exitDirection, setExitDirection] = useState(1);
  const { t } = useI18n();
  const cardRef = useRef<SwipeCardHandle>(null);

  const handleButtonAnswer = useCallback(
    (isYes: boolean) => {
      cardRef.current?.triggerExit(isYes ? 'right' : 'left');
    },
    []
  );

  return (
    <div className={cn('flex-1 flex flex-col items-center justify-center', className)}>
      {/* Card area */}
      <div className="relative w-full max-w-sm mx-auto flex-1 flex items-center justify-center overflow-visible px-2">
        <AnimatePresence mode="popLayout" initial={false} custom={exitDirection}>
          <SwipeCard
            ref={cardRef}
            key={question.id}
            question={question}
            onAnswer={onAnswer}
            onSetDirection={setExitDirection}
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
            t={t}
          />
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3 mt-8 mb-4 shrink-0 w-full max-w-sm mx-auto px-4">
        <button
          onClick={() => handleButtonAnswer(false)}
          className="flex-1 flex items-center justify-center rounded-full border border-border bg-background px-6 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-muted/50 active:scale-[0.97]"
        >
          {t.yesNoForm.no}
        </button>

        <button
          onClick={() => handleButtonAnswer(true)}
          className="flex-1 flex items-center justify-center rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-6 py-3.5 text-sm font-semibold text-white transition-all shadow-[0_2px_8px_hsl(222,100%,56%,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_hsl(222,100%,56%,0.45)] hover:brightness-110 active:scale-[0.97]"
        >
          {t.yesNoForm.yes}
        </button>
      </div>
    </div>
  );
};
