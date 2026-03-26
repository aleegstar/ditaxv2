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

export interface SwipeCardHandle {
  triggerExit: (direction: 'left' | 'right') => void;
}

const cardVariants = {
  enter: {
    opacity: 0,
    scale: 0.97,
  },
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

// Inner card that handles drag and exit animation
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
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
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
      <div className="relative w-full max-w-sm mx-auto flex-1 flex items-center justify-center overflow-visible">
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
      <div className="flex items-center justify-center gap-4 mt-6 mb-4 shrink-0 w-full max-w-sm mx-auto px-4">
        <button
          onClick={() => handleButtonAnswer(false)}
          className="flex-1 flex items-center justify-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-6 py-3.5 text-sm font-semibold text-destructive transition-all hover:bg-destructive/10 hover:border-destructive/30 active:scale-[0.97]"
        >
          <ThumbsDown className="w-4 h-4" strokeWidth={2} />
          <span>{t.yesNoForm.no}</span>
        </button>

        <button
          onClick={() => handleButtonAnswer(true)}
          className="flex-1 flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-6 py-3.5 text-sm font-semibold text-white transition-all shadow-[0_2px_8px_hsl(222,100%,56%,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_hsl(222,100%,56%,0.45)] hover:brightness-110 active:scale-[0.97]"
        >
          <ThumbsUp className="w-4 h-4" strokeWidth={2} />
          <span>{t.yesNoForm.yes}</span>
        </button>
      </div>
    </div>
  );
};
