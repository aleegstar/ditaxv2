import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Clock, FileText } from 'lucide-react';
import { YesNoQuestion as YesNoQuestionType } from '@/types/multiStepYesNo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import yesNoHero from '@/assets/yesno-hero.webp';




const sectionLabels: Record<string, string> = {
  income: 'Einkommen',
  deductions: 'Abzüge',
  assets: 'Vermögen',
  contact: 'Kontakt',
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
  enter: { opacity: 0, y: 10 },
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    transition: { duration: 0.24, ease: [0.22, 0.61, 0.36, 1] as const },
  },
  exit: (direction: number) => ({
    x: direction * 280,
    opacity: 0,
    rotate: direction * 5,
    transition: { duration: 0.22, ease: [0.36, 0, 0.66, -0.56] as const },
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
    const rotate = useTransform(x, [-200, 0, 200], [-4, 0, 4]);

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
        whileDrag={{ scale: 1.005 }}
        className="relative z-10 flex flex-col cursor-grab active:cursor-grabbing select-none will-change-transform px-6 sm:px-8 pt-5 pb-6"
      >
        <h2 className="text-[22px] sm:text-[24px] text-foreground tracking-[-0.02em] font-semibold leading-[1.25] pointer-events-none text-center">
          {question.text}
        </h2>

        {question.explanation && (
          <div className="mt-3 pointer-events-auto text-center">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {isExpanded ? 'Weniger anzeigen' : 'Mehr erfahren'}
              <svg
                className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-90')}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-muted/60 border border-border px-4 py-3 text-left mt-3">
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {question.explanation}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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

  const sectionLabel = section ? sectionLabels[section] : undefined;

  return (
    <div className={cn('flex-1 flex flex-col items-center', className)}>
      {/* Unified card: hero photo → question → explanation → CTA buttons */}
      <div className="relative w-full max-w-xl mx-auto">
        <div className="relative w-full rounded-2xl bg-card overflow-hidden border border-border shadow-[0_1px_2px_rgba(15,27,61,0.04),0_4px_12px_rgba(15,27,61,0.04)] flex flex-col">
          {/* Hero photo with section label badge */}
          <div className="relative w-full h-[150px] sm:h-[180px] shrink-0 overflow-hidden">
            <img
              src={yesNoHero}
              alt=""
              className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
              aria-hidden="true"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent pointer-events-none" />
            {sectionLabel && (
              <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white/95 backdrop-blur-sm shadow-sm">
                <FileText className="w-3 h-3 text-primary" strokeWidth={2.25} />
                <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-foreground">
                  {sectionLabel}
                </span>
              </div>
            )}
            {/* Swipe indicators */}
            <div
              style={{ opacity: yesIndicatorOpacity }}
              className="absolute bottom-3 left-3 z-20 px-2 py-0.5 rounded-md bg-primary transition-opacity"
            >
              <span className="text-primary-foreground font-semibold text-[10px] tracking-[0.1em] uppercase">
                {t.yesNoForm.yes}
              </span>
            </div>
            <div
              style={{ opacity: noIndicatorOpacity }}
              className="absolute bottom-3 right-3 z-20 px-2 py-0.5 rounded-md bg-foreground transition-opacity"
            >
              <span className="text-background font-semibold text-[10px] tracking-[0.1em] uppercase">
                {t.yesNoForm.no}
              </span>
            </div>
          </div>


          {/* Animated text content */}
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

          {/* CTA buttons attached inside same card */}
          <div className="px-6 sm:px-8 pb-6 pt-1 flex items-center gap-3">
            <button
              onClick={() => handleButtonAnswer(false)}
              className="flex-1 h-12 inline-flex items-center justify-center rounded-xl bg-card border border-border px-5 text-[15px] font-semibold text-foreground tracking-tight transition-all duration-150 hover:bg-muted hover:border-foreground/20 active:scale-[0.985]"
            >
              {t.yesNoForm.no}
            </button>
            <button
              onClick={() => handleButtonAnswer(true)}
              className="flex-1 h-12 inline-flex items-center justify-center rounded-xl px-5 text-[15px] font-semibold text-white tracking-tight transition-all duration-150 border border-white/[0.08] bg-[linear-gradient(180deg,#1E3A5F_0%,#0F1B3D_100%)] shadow-[0_6px_18px_rgba(15,27,61,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-[linear-gradient(180deg,#264a78_0%,#142348_100%)] active:scale-[0.985]"
            >
              {t.yesNoForm.yes}
            </button>
          </div>
        </div>

        {/* Trust strip — guided, intelligent reassurance */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.75} />
            Ende-zu-Ende verschlüsselt
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.75} />
            Ca. 5 Min. pro Bereich
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.75} />
            Formulare automatisch korrekt
          </span>
        </div>
      </div>
    </div>
  );
};
