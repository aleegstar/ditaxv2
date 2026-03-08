import React, { useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo, AnimatePresence } from 'framer-motion';
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

const SWIPE_THRESHOLD = 80;
const EXIT_DURATION = 0.35;

export const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  question,
  answer,
  onAnswer,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const { t } = useI18n();
  const controls = useAnimation();
  const answeredRef = useRef(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const yesOpacity = useTransform(x, [0, 80], [0, 1]);
  const noOpacity = useTransform(x, [-80, 0], [1, 0]);
  // Subtle background tint based on drag direction
  const bgYes = useTransform(x, [0, 120], ['hsla(var(--primary), 0)', 'hsla(var(--primary), 0.06)']);
  const bgNo = useTransform(x, [-120, 0], ['hsla(var(--destructive), 0.06)', 'hsla(var(--destructive), 0)']);

  const animateOut = useCallback(async (direction: 'left' | 'right') => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setIsAnimatingOut(true);

    const targetX = direction === 'right' ? 350 : -350;
    const targetRotate = direction === 'right' ? 18 : -18;

    await controls.start({
      x: targetX,
      rotate: targetRotate,
      opacity: 0,
      transition: {
        duration: EXIT_DURATION,
        ease: [0.32, 0, 0.67, 0],
      }
    });

    onAnswer(direction === 'right');
  }, [controls, onAnswer]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (answeredRef.current) return;
    
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Use both offset and velocity for natural feel
    if (offset > SWIPE_THRESHOLD || velocity > 500) {
      animateOut('right');
    } else if (offset < -SWIPE_THRESHOLD || velocity < -500) {
      animateOut('left');
    } else {
      // Snap back with spring
      controls.start({
        x: 0,
        rotate: 0,
        transition: { type: 'spring', stiffness: 500, damping: 30 }
      });
    }
  }, [animateOut, controls]);

  const handleButtonAnswer = useCallback((isYes: boolean) => {
    animateOut(isYes ? 'right' : 'left');
  }, [animateOut]);

  return (
    <div className={cn("flex-1 flex flex-col items-center justify-center", className)}>
      {/* Swipeable Card */}
      <div className="relative w-full max-w-sm mx-auto flex-1 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={question.id}
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={controls}
            style={{ x, rotate }}
            drag={isAnimatingOut ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02 }}
            className="w-full cursor-grab active:cursor-grabbing select-none will-change-transform"
            onAnimationComplete={() => {
              // Reset for entrance of new card
              if (!answeredRef.current) {
                controls.start({
                  scale: 1,
                  opacity: 1,
                  y: 0,
                  x: 0,
                  rotate: 0,
                  transition: {
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                  }
                });
              }
            }}
          >
            <div className="relative rounded-3xl border-2 border-border/30 bg-card p-6 pb-8 shadow-lg overflow-hidden">
              {/* Swipe Indicators overlaid on card */}
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
              <div className="mt-6 flex items-center justify-center gap-3 text-muted-foreground/30 pointer-events-none">
                <ThumbsDown className="w-4 h-4" />
                <div className="flex items-center gap-1.5">
                  <motion.div 
                    className="w-1.5 h-1.5 bg-muted-foreground/20 rounded-full"
                    animate={{ x: [-3, 3, -3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                  <div className="w-8 h-[1.5px] bg-muted-foreground/15 rounded-full" />
                  <motion.div 
                    className="w-1.5 h-1.5 bg-muted-foreground/20 rounded-full"
                    animate={{ x: [3, -3, 3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                </div>
                <ThumbsUp className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-8 mt-6 mb-4 shrink-0">
        {/* No Button */}
        <motion.button
          onClick={() => handleButtonAnswer(false)}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          disabled={isAnimatingOut}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-200",
            "border-2 border-destructive/25 bg-background shadow-sm",
            "hover:bg-destructive/8 hover:border-destructive/40",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          <ThumbsDown className="w-6 h-6 text-destructive" strokeWidth={2.5} />
        </motion.button>

        {/* Yes Button */}
        <motion.button
          onClick={() => handleButtonAnswer(true)}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          disabled={isAnimatingOut}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-200",
            "border-2 border-primary/25 bg-background shadow-sm",
            "hover:bg-primary/8 hover:border-primary/40",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          <ThumbsUp className="w-6 h-6 text-primary" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
};
