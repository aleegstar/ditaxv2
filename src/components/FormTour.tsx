import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { debug } from '@/utils/debug';

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetElement: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface FormTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const formTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Willkommen',
    description: 'In dieser Anleitung zeigen wir dir die 3 Schritte, um deine Steuererklärung einzureichen.',
    targetElement: '',
    position: 'bottom'
  },
  {
    id: 'step-1-angaben',
    title: 'Schritt 1: Angaben',
    description: 'Fülle zuerst die 4 Formulare aus: Kontaktangaben, Abzüge, Einkommen und Vermögen. Klicke auf jede Karte, um das jeweilige Formular zu öffnen.',
    targetElement: '[data-tour="form-step-1"]',
    position: 'bottom'
  },
  {
    id: 'step-2-unterlagen',
    title: 'Schritt 2: Unterlagen',
    description: 'Nachdem du alle Angaben gemacht hast, lade deine steuerrelevanten Unterlagen hoch. Diese Funktion wird freigeschaltet, sobald Schritt 1 abgeschlossen ist.',
    targetElement: '[data-tour="form-step-2"]',
    position: 'top'
  },
  {
    id: 'step-3-einreichen',
    title: 'Schritt 3: Einreichen',
    description: 'Zum Schluss reichst du deine Steuererklärung zur Erstellung ein. Diese Funktion wird freigeschaltet, sobald Schritt 2 abgeschlossen ist.',
    targetElement: '[data-tour="form-step-3"]',
    position: 'top'
  },
  {
    id: 'start-kontaktangaben',
    title: 'Los geht\'s!',
    description: 'Beginne damit deine Angaben zu erfassen.',
    targetElement: '[data-tour="kontaktangaben"]',
    position: 'bottom'
  }
];

export const FormTour: React.FC<FormTourProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const isMobile = useIsMobile();
  
  const tourSteps = formTourSteps;
  const currentStepData = tourSteps[currentStep];

  // Add/remove body attribute when tour is active
  useEffect(() => {
    document.body.setAttribute('data-form-tour-open', 'true');
    return () => {
      document.body.removeAttribute('data-form-tour-open');
    };
  }, []);

  // Update spotlight position when step changes
  useEffect(() => {
    if (!currentStepData.targetElement) {
      setSpotlightPosition({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

    const updateSpotlight = () => {
      const element = document.querySelector(currentStepData.targetElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        setSpotlightPosition({
          x: rect.left - padding,
          y: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Scroll element into view if not visible
        const isInViewport = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
        );

        if (!isInViewport) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    // Retry mechanism to find elements
    let attempts = 0;
    const maxAttempts = 10;
    const retryInterval = 150;

    const tryUpdateSpotlight = () => {
      const element = document.querySelector(currentStepData.targetElement);
      if (element) {
        updateSpotlight();
      } else if (attempts < maxAttempts) {
        attempts++;
        debug.log(`🎯 Form Tour: Retrying to find element (${attempts}/${maxAttempts}): ${currentStepData.targetElement}`);
        setTimeout(tryUpdateSpotlight, retryInterval);
      } else {
        debug.error(`❌ Form Tour: Could not find element after ${maxAttempts} attempts: ${currentStepData.targetElement}`);
      }
    };

    tryUpdateSpotlight();

    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, { passive: true } as AddEventListenerOptions);
    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight as EventListener);
    };
  }, [currentStep, currentStepData.targetElement]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const getTooltipPosition = () => {
    if (!currentStepData.targetElement) {
      // Centered for welcome step (both mobile and desktop)
      const tooltipWidth = isMobile ? 280 : 320;
      const tooltipHeight = isMobile ? 180 : 200;
      
      return {
        top: (window.innerHeight / 2) - (tooltipHeight / 2),
        left: (window.innerWidth / 2) - (tooltipWidth / 2)
      };
    }

    const padding = isMobile ? 16 : 24;
    const tooltipWidth = isMobile ? 280 : 384;
    const tooltipHeight = isMobile ? 180 : 300;

    let top = 0;
    let left = 0;

    switch (currentStepData.position) {
      case 'bottom':
        top = spotlightPosition.y + spotlightPosition.height + padding;
        left = Math.max(padding, Math.min(
          window.innerWidth - tooltipWidth - padding,
          spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
        ));
        
        // If tooltip would be off-screen at bottom, place above
        if (top + tooltipHeight > window.innerHeight - padding) {
          top = spotlightPosition.y - tooltipHeight - padding;
        }
        break;

      case 'top':
        top = spotlightPosition.y - tooltipHeight - padding;
        left = Math.max(padding, Math.min(
          window.innerWidth - tooltipWidth - padding,
          spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
        ));
        
        // If tooltip would be off-screen at top, place below
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
        
        // If tooltip would be off-screen to the right, try left side
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = Math.max(padding, spotlightPosition.x - tooltipWidth - padding * 2);
          
          // If still off-screen, place below instead
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
        
        // If tooltip would be off-screen to the left, place to the right
        if (left < padding) {
          left = spotlightPosition.x + spotlightPosition.width + padding * 2;
          
          // If still off-screen, place below instead
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

    return { 
      top: `${top}px`, 
      left: `${left}px`,
      transform: 'none'
    };
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-[10000] pointer-events-auto"
      >
        {/* Light overlay with transparent hole - only show for steps with target elements */}
        {currentStepData.targetElement && (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <defs>
                <mask id="form-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={spotlightPosition.x}
                    y={spotlightPosition.y}
                    width={spotlightPosition.width}
                    height={spotlightPosition.height}
                    rx="24"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.75)"
                mask="url(#form-spotlight-mask)"
              />
            </svg>
            {/* Enhanced spotlight border for native app visibility */}
            <motion.div 
              className="absolute pointer-events-none rounded-3xl border-2 border-[#1D64FF] shadow-[0_0_0_4px_rgba(29,100,255,0.3),0_0_25px_rgba(29,100,255,0.4)]"
              animate={{
                left: spotlightPosition.x - 4,
                top: spotlightPosition.y - 4,
                width: spotlightPosition.width + 8,
                height: spotlightPosition.height + 8
              }}
              transition={{ 
                duration: 0.5, 
                ease: [0.4, 0, 0.2, 1]
              }}
            />
          </>
        )}

        {/* For welcome step, show dark overlay */}
        {!currentStepData.targetElement && (
          <div className="absolute inset-0 bg-black/75" />
        )}

        {/* Progress indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-700 ease-out",
                index <= currentStep ? "bg-[#1D64FF] scale-110" : "bg-slate-300 scale-100"
              )}
            />
          ))}
        </div>

        {/* Close button top right - light theme */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-[10002] w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all duration-200 shadow-lg"
          aria-label="Tour schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tooltip */}
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 120,
            mass: 0.8,
            duration: 0.6
          }}
          className="absolute z-[10001]"
          style={getTooltipPosition()}
        >
          <motion.div 
            layout
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={cn(
              "bg-white border border-slate-200 rounded-2xl shadow-2xl relative",
              isMobile ? "p-4 mx-2 max-w-[280px]" : "p-6 mx-4 max-w-sm"
            )}
          >
            {/* Arrow pointing in correct direction - light theme */}
            <AnimatePresence mode="wait">
              {currentStepData.targetElement && (() => {
                const arrowKey = `${currentStepData.position}-${isMobile}`;
                if (currentStepData.position === 'right' && !isMobile) {
                  return <motion.div key={arrowKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white" />;
                } else if (currentStepData.position === 'left' && !isMobile) {
                  return <motion.div key={arrowKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white" />;
                } else if (currentStepData.position === 'top') {
                  return <motion.div key={arrowKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />;
                } else if (currentStepData.position === 'bottom') {
                  return <motion.div key={arrowKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white" />;
                }
              })()}
            </AnimatePresence>
            
            <div className="text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className={cn(
                    "font-semibold text-slate-900 mb-2 transition-all duration-300",
                    isMobile ? "text-base" : "text-lg"
                  )}>
                    {currentStepData.title}
                  </h3>
                  <p className={cn(
                    "text-slate-500 mb-4 transition-all duration-300",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    {currentStepData.description}
                  </p>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={handleSkip}
                  className="text-slate-500 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700"
                >
                  Überspringen
                </Button>
                <Button
                  size={isMobile ? "sm" : "default"}
                  onClick={handleNext}
                  className="bg-[#1D64FF] hover:bg-[#1854D9] text-white shadow-lg shadow-[#1D64FF]/25"
                >
                  {currentStep < tourSteps.length - 1 ? 'Weiter' : 'Fertig'}
                </Button>
              </div>
            </div>

          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
