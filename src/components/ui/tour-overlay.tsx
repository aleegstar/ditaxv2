import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetElement: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface SpotlightPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  spotlightPosition: SpotlightPosition;
  onNext: () => void;
  onBack?: () => void;
  onSkip: () => void;
  maskId: string;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  finishLabel?: string;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  steps,
  currentStep,
  spotlightPosition,
  onNext,
  onBack,
  onSkip,
  maskId,
  nextLabel = 'Weiter',
  backLabel = 'Zurück',
  skipLabel = 'Überspringen',
  finishLabel = 'Fertig',
}) => {
  const isMobile = useIsMobile();
  const currentStepData = steps[currentStep];
  if (!currentStepData) return null;

  const hasTarget = currentStepData.targetElement && spotlightPosition.width > 0;
  const isLastStep = currentStep === steps.length - 1;

  const getTooltipPosition = (): React.CSSProperties => {
    const padding = isMobile ? 16 : 24;
    const tooltipWidth = isMobile ? 280 : 340;
    const tooltipHeight = isMobile ? 180 : 220;

    if (!currentStepData.targetElement || spotlightPosition.width === 0) {
      return {
        top: (window.innerHeight / 2) - (tooltipHeight / 2),
        left: (window.innerWidth / 2) - (tooltipWidth / 2),
      };
    }

    let top = 0;
    let left = 0;

    switch (currentStepData.position) {
      case 'bottom':
        top = spotlightPosition.y + spotlightPosition.height + padding;
        left = Math.max(padding, Math.min(
          window.innerWidth - tooltipWidth - padding,
          spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
        ));
        if (top + tooltipHeight > window.innerHeight - padding) {
          top = Math.max(padding, spotlightPosition.y - tooltipHeight - padding);
        }
        break;
      case 'top':
        top = Math.max(padding, spotlightPosition.y - tooltipHeight - padding);
        left = Math.max(padding, Math.min(
          window.innerWidth - tooltipWidth - padding,
          spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
        ));
        if (top < padding) {
          top = spotlightPosition.y + spotlightPosition.height + padding;
        }
        break;
      case 'right':
        top = Math.max(padding, Math.min(
          window.innerHeight - tooltipHeight - padding,
          spotlightPosition.y + (spotlightPosition.height / 2) - (tooltipHeight / 2)
        ));
        left = spotlightPosition.x + spotlightPosition.width + padding * 2;
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = Math.max(padding, spotlightPosition.x - tooltipWidth - padding * 2);
          if (left < padding) {
            top = spotlightPosition.y + spotlightPosition.height + padding;
            left = Math.max(padding, Math.min(
              window.innerWidth - tooltipWidth - padding,
              spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
            ));
          }
        }
        break;
      case 'left':
        top = Math.max(padding, Math.min(
          window.innerHeight - tooltipHeight - padding,
          spotlightPosition.y + (spotlightPosition.height / 2) - (tooltipHeight / 2)
        ));
        left = Math.max(padding, spotlightPosition.x - tooltipWidth - padding * 2);
        if (left < padding) {
          left = spotlightPosition.x + spotlightPosition.width + padding * 2;
          if (left + tooltipWidth > window.innerWidth - padding) {
            top = spotlightPosition.y + spotlightPosition.height + padding;
            left = Math.max(padding, Math.min(
              window.innerWidth - tooltipWidth - padding,
              spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
            ));
          }
        }
        break;
    }

    return { top: `${top}px`, left: `${left}px`, transform: 'none' };
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed inset-0 z-[10000] pointer-events-auto"
      >
        {/* Overlay with spotlight cutout */}
        {hasTarget ? (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <defs>
                <mask id={maskId}>
                  <rect width="100%" height="100%" fill="white" />
                  <motion.rect
                    animate={{
                      x: spotlightPosition.x - 12,
                      y: spotlightPosition.y - 12,
                      width: spotlightPosition.width + 24,
                      height: spotlightPosition.height + 24,
                    }}
                    transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    rx="16"
                    ry="16"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.6)"
                mask={`url(#${maskId})`}
                style={{ backdropFilter: 'blur(4px)' }}
              />
            </svg>
            {/* Subtle spotlight border */}
            <motion.div
              className="absolute pointer-events-none rounded-2xl border border-[#1D64FF]/40 shadow-[0_0_0_1px_rgba(29,100,255,0.15),0_0_20px_rgba(29,100,255,0.1)]"
              animate={{
                left: spotlightPosition.x - 12,
                top: spotlightPosition.y - 12,
                width: spotlightPosition.width + 24,
                height: spotlightPosition.height + 24,
              }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />
        )}

        {/* Progress pills */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 items-center">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                width: index === currentStep ? 24 : 6,
                opacity: index <= currentStep ? 1 : 0.4,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                "h-1.5 rounded-full",
                index <= currentStep ? "bg-[#1D64FF]" : "bg-white/60"
              )}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 z-[10002] w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
          aria-label="Tour schließen"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tooltip */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 200, mass: 0.7 }}
          className="absolute z-[10001]"
          style={getTooltipPosition()}
        >
          <motion.div
            layout
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
              "bg-white border border-slate-100 rounded-2xl shadow-xl relative",
              isMobile ? "p-4 mx-2 max-w-[280px]" : "p-5 mx-4 max-w-[340px]"
            )}
          >
            <div className="text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className={cn(
                    "font-semibold text-slate-900 mb-1.5",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    {currentStepData.title}
                  </h3>
                  <p className={cn(
                    "text-slate-400 mb-4 whitespace-pre-line leading-relaxed",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {currentStepData.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-2 justify-center">
                {currentStep === 0 ? (
                  <Button
                    variant="ghost"
                    size={isMobile ? "sm" : "default"}
                    onClick={onSkip}
                    className="text-slate-400 hover:text-slate-600 rounded-xl"
                  >
                    {skipLabel}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size={isMobile ? "sm" : "default"}
                    onClick={onBack || (() => {})}
                    className="text-slate-400 hover:text-slate-600 rounded-xl"
                  >
                    {backLabel}
                  </Button>
                )}
                <Button
                  size={isMobile ? "sm" : "default"}
                  onClick={onNext}
                  className="bg-[#1D64FF] hover:bg-[#1854D9] text-white rounded-xl"
                >
                  {isLastStep ? finishLabel : nextLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
