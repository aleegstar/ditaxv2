import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { YesNoQuestion as YesNoQuestionType } from '@/types/multiStepYesNo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import sectionIncomeImg from '@/assets/section-income.webp';
import sectionDeductionsImg from '@/assets/section-deductions.webp';
import sectionAssetsImg from '@/assets/section-assets.webp';
import sectionContactImg from '@/assets/section-contact.webp';

const sectionImages: Record<string, string> = {
  income: sectionIncomeImg,
  deductions: sectionDeductionsImg,
  assets: sectionAssetsImg,
  contact: sectionContactImg,
};

interface YesNoQuestionProps {
  question: YesNoQuestionType;
  answer?: boolean;
  onAnswer: (answer: boolean) => void;
  className?: string;
  section?: 'income' | 'deductions' | 'assets' | 'contact';
}

const SWIPE_THRESHOLD = 60;

export interface SwipeCardHandle {
  triggerExit: (direction: 'left' | 'right') => void;
}

const contentVariants = {
  enter: { opacity: 0, y: 16 },
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    transition: { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] as const },
  },
  exit: (direction: number) => ({
    x: direction * 320,
    opacity: 0,
    rotate: direction * 8,
    transition: { duration: 0.28, ease: [0.36, 0, 0.66, -0.56] as const },
  }),
};

interface SwipeContentProps {
  question: YesNoQuestionType;
  onAnswer: (answer: boolean) => void;
  onSetDirection: (dir: number) => void;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
  onDragX: (value: number) => void;
  t: any;
}

const SwipeContent = forwardRef<SwipeCardHandle, SwipeContentProps>(
  ({ question, onAnswer, onSetDirection, isExpanded, setIsExpanded, onDragX, t }, ref) => {
    const answeredRef = useRef(false);
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-6, 0, 6]);

    React.useEffect(() => {
      const unsub = x.on('change', onDragX);
      return () => unsub();
    }, [x, onDragX]);

    const triggerAnswer = useCallback(
      (direction: 'left' | 'right') => {
        if (answeredRef.current) return;
        answeredRef.current = true;
        onSetDirection(direction === 'right' ? 1 : -1);
        onAnswer(direction === 'right');
      },
      [onAnswer, onSetDirection]
    );

    useImperativeHandle(ref, () => ({ triggerExit: triggerAnswer }), [triggerAnswer]);

    const handleDragEnd = useCallback(
      (_: any, info: PanInfo) => {
        if (answeredRef.current) return;
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (offset > SWIPE_THRESHOLD || velocity > 400) triggerAnswer('right');
        else if (offset < -SWIPE_THRESHOLD || velocity < -400) triggerAnswer('left');
      },
      [triggerAnswer]
    );

    return (
      <motion.div
        variants={contentVariants}
        initial="enter"
        animate="center"
        exit="exit"
        style={{ x, rotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.01 }}
        className="absolute inset-0 z-10 flex flex-col cursor-grab active:cursor-grabbing select-none will-change-transform px-8 pt-[240px] pb-16"
      >
        <div className="mb-auto">
          <div className="text-center">
            <h2 className="text-[26px] sm:text-[28px] text-foreground tracking-[-0.02em] font-semibold leading-[1.2] pointer-events-none">
              {question.text}
            </h2>

            {question.explanation && (
              <div className="mt-7 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {isExpanded ? 'Weniger anzeigen' : 'Mehr erfahren'}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
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
                      <div className="rounded-2xl bg-foreground/[0.025] border border-[rgba(20,20,20,0.06)] px-5 py-4 text-left mt-5">
                        <p className="text-[13px] text-muted-foreground/85 leading-relaxed">
                          {question.explanation}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

SwipeContent.displayName = 'SwipeContent';

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  question,
  answer,
  onAnswer,
  className,
  section,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [exitDirection, setExitDirection] = useState(1);
  const [dragX, setDragX] = useState(0);
  const { t } = useI18n();
  const cardRef = useRef<SwipeCardHandle>(null);

  const handleButtonAnswer = useCallback(
    (isYes: boolean) => {
      setExitDirection(isYes ? 1 : -1);
      onAnswer(isYes);
    },
    [onAnswer]
  );

  const yesIndicatorOpacity = Math.min(Math.max(dragX / 60, 0), 1);
  const noIndicatorOpacity = Math.min(Math.max(-dragX / 60, 0), 1);

  const sectionImage = section ? sectionImages[section] : undefined;

  return (
    <div className={cn('flex-1 flex flex-col items-center justify-center', className)}>
      {/* Card area — persistent image, only text content swaps */}
      <div className="relative w-full max-w-md mx-auto flex-1 flex items-center justify-center overflow-visible px-2">
        <div
          className="relative w-full rounded-3xl bg-card overflow-hidden min-h-[480px] border border-[rgba(20,20,20,0.06)] shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03)]"
        >
          {/* Background Image — top portion only, persistent across questions */}
          {sectionImage && (
            <img
              src={sectionImage}
              alt=""
              className="absolute top-0 left-0 right-0 h-[260px] w-full object-cover pointer-events-none select-none"
              aria-hidden="true"
            />
          )}
          {/* Fade from image into card */}
          <div className="absolute top-[210px] left-0 right-0 h-20 bg-gradient-to-b from-transparent to-card pointer-events-none" />

          {/* Subtle Swipe Indicators */}
          <div
            style={{ opacity: yesIndicatorOpacity }}
            className="absolute top-5 left-5 z-20 px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-sm transition-opacity"
          >
            <span className="text-primary-foreground font-medium text-[10px] tracking-[0.1em] uppercase">
              {t.yesNoForm.yes}
            </span>
          </div>
          <div
            style={{ opacity: noIndicatorOpacity }}
            className="absolute top-5 right-5 z-20 px-2.5 py-1 rounded-full bg-foreground/85 backdrop-blur-sm transition-opacity"
          >
            <span className="text-background font-medium text-[10px] tracking-[0.1em] uppercase">
              {t.yesNoForm.no}
            </span>
          </div>

          {/* Animated Text Content */}
          <AnimatePresence mode="popLayout" initial={false} custom={exitDirection}>
            <SwipeContent
              ref={cardRef}
              key={question.id}
              question={question}
              onAnswer={onAnswer}
              onSetDirection={setExitDirection}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
              onDragX={setDragX}
              t={t}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons — restrained palette, blue accent only */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1], delay: 0.08 }}
        className="flex items-center justify-center gap-3 mt-10 mb-4 shrink-0 w-full max-w-md mx-auto px-4"
      >
        <button
          onClick={() => handleButtonAnswer(true)}
          className="flex-1 h-12 inline-flex items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white tracking-tight transition-all duration-200 border border-white/[0.08] bg-[linear-gradient(180deg,#2B2B35_0%,#17171C_100%)] shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[linear-gradient(180deg,#33333E_0%,#1C1C22_100%)] active:scale-[0.985]"
        >
          {t.yesNoForm.yes}
        </button>

        <button
          onClick={() => handleButtonAnswer(false)}
          className="flex-1 h-12 inline-flex items-center justify-center rounded-2xl bg-white border border-[rgba(20,20,20,0.08)] px-5 text-[15px] font-semibold text-foreground tracking-tight transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-foreground/[0.025] hover:border-[rgba(20,20,20,0.12)] active:scale-[0.985]"
        >
          {t.yesNoForm.no}
        </button>
      </motion.div>
    </div>
  );
};
