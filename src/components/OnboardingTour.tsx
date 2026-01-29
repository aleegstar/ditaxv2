import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { debug } from '@/utils/debug';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/contexts/I18nContext';
import { Translation } from '@/i18n/translations';

interface TourStep {
  id: string;
  titleKey: keyof Translation['tour'] | null;
  descriptionKey: keyof Translation['tour'];
  targetElement: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const getTourSteps = (): TourStep[] => [
  {
    id: 'welcome',
    titleKey: null, // Will use dynamic greeting
    descriptionKey: 'welcomeDescription',
    targetElement: '',
    position: 'bottom'
  },
  {
    id: 'add-year',
    titleKey: 'addYearTitle',
    descriptionKey: 'addYearDescription',
    targetElement: '[data-tour="add-year-card"]',
    position: 'top'
  },
  {
    id: 'chat',
    titleKey: 'chatTitle',
    descriptionKey: 'chatDescription',
    targetElement: '[data-tour="chat-header-icon"]',
    position: 'top'
  },
  {
    id: 'documents',
    titleKey: 'documentsTitle',
    descriptionKey: 'documentsDescription',
    targetElement: '[data-tour="floating-document-button"]',
    position: 'top'
  },
  {
    id: 'continue-card',
    titleKey: 'continueCardTitle',
    descriptionKey: 'continueCardDescription',
    targetElement: '[data-tour="tax-year-card"]',
    position: 'bottom'
  }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [userFirstName, setUserFirstName] = useState<string>('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const tourSteps = getTourSteps();

  // Load user's first name
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.first_name) {
            setUserFirstName(profile.first_name);
          }
        }
      } catch (error) {
        console.error('Error loading user name:', error);
      }
    };
    
    loadUserName();
  }, []);

  const updateSpotlight = (targetElement: string, attempt = 0) => {
    if (!targetElement) {
      return;
    }
    
    debug.log(`🎯 Tour: Updating spotlight for element: ${targetElement} (attempt ${attempt})`);
    
    const tryFind = (): { element: Element | null; foundSelector: string } => {
      const selectors = targetElement.split(',').map(s => s.trim());
      for (const selector of selectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            return { element: el, foundSelector: selector };
          }
        } catch (e) {
          debug.warn(`Invalid selector: ${selector}`, e);
        }
      }
      
      const fallbackSelectors = isMobile ? [
        '[data-tour="add-year"]',
        '.year-dropdown-button',
        '[data-tour="floating-document-button"]',
        '[data-tour="chat-header-icon"]',
        '[data-tour="tax-year-card"]',
        '.blue-tax-year-card',
        '.continue-tax-card',
        '.card'
      ] : [
        '[data-tour="add-year"]',
        '.year-dropdown-button',
        '[data-tour="floating-document-button"]',
        '[data-tour="chat-header-icon"]',
        '[data-tour="tax-year-card"]',
        '.blue-tax-year-card',
        '.continue-tax-card',
        '.card'
      ];
      
      for (const fb of fallbackSelectors) {
        const el = document.querySelector(fb);
        if (el) {
          return { element: el, foundSelector: fb };
        }
      }
      return { element: null, foundSelector: '' };
    };
    
    const { element, foundSelector } = tryFind();
    
    if (element) {
      debug.log(`✅ Tour: Found element with selector: ${foundSelector}`);
      
      const rect = element.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
      );
      
      if (!isInViewport) {
        try {
          (element as HTMLElement).scrollIntoView({ 
            block: 'center', 
            inline: 'center', 
            behavior: 'smooth' 
          });
          
          setTimeout(() => {
            const updatedRect = element.getBoundingClientRect();
            setSpotlightPosition({
              x: Math.max(0, Math.floor(updatedRect.left)),
              y: Math.max(0, Math.floor(updatedRect.top)),
              width: Math.max(50, Math.ceil(updatedRect.width)),
              height: Math.max(30, Math.ceil(updatedRect.height))
            });
          }, 300);
          return;
        } catch {}
      }
      
      const x = Math.max(0, Math.floor(rect.left));
      const y = Math.max(0, Math.floor(rect.top));
      const width = Math.max(50, Math.ceil(rect.width));
      const height = Math.max(30, Math.ceil(rect.height));
      
      const validatedPosition = {
        x: isNaN(x) ? 100 : x,
        y: isNaN(y) ? 100 : y,
        width: isNaN(width) ? 200 : width,
        height: isNaN(height) ? 100 : height
      };
      
      debug.log('🎯 Tour: Spotlight position (viewport):', validatedPosition);
      setSpotlightPosition(validatedPosition);
    } else {
      if (attempt < 10) {
        debug.warn('⚠️ No element found, retrying...', attempt + 1);
        setTimeout(() => updateSpotlight(targetElement, attempt + 1), 150);
        return;
      }
      debug.warn('⚠️ Tour: Could not find element after retries, using center fallback');
      const fallbackPosition = {
        x: Math.floor(window.innerWidth / 2 - 100),
        y: Math.floor(window.innerHeight / 2 - 50),
        width: 200,
        height: 100
      };
      debug.log('🎯 Tour: Using fallback position:', fallbackPosition);
      setSpotlightPosition(fallbackPosition);
    }
  };

  useEffect(() => {
    const currentStepData = tourSteps[currentStep];
    if (currentStepData && currentStepData.targetElement) {
      const timer = setTimeout(() => {
        updateSpotlight(currentStepData.targetElement);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, tourSteps]);

  useEffect(() => {
    if (isMobile) {
      document.body.classList.add('hide-sidebar');
    }
    
    if (tourSteps[currentStep] && tourSteps[currentStep].targetElement) {
      updateSpotlight(tourSteps[currentStep].targetElement);
    }
    
    return () => {
      if (isMobile) {
        document.body.classList.remove('hide-sidebar');
      }
    };
  }, [isMobile]);

  useEffect(() => {
    const handleReposition = () => {
      if (tourSteps[currentStep] && tourSteps[currentStep].targetElement) {
        updateSpotlight(tourSteps[currentStep].targetElement);
      }
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, { passive: true } as AddEventListenerOptions);
    window.addEventListener('orientationchange', handleReposition);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition as EventListener);
      window.removeEventListener('orientationchange', handleReposition);
    };
  }, [currentStep, tourSteps]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const lastStepData = tourSteps[tourSteps.length - 1];
      
      onComplete();
      
      if (lastStepData?.targetElement) {
        setTimeout(() => {
          const selectors = lastStepData.targetElement.split(',').map(s => s.trim());
          
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            if (targetElement instanceof HTMLElement) {
              targetElement.focus();
              debug.log('✅ Tour: Fokus auf Element gesetzt:', selector);
              break;
            }
          }
        }, 700);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const getTooltipPosition = () => {
    const currentStepData = tourSteps[currentStep];
    if (!currentStepData) return {};

    if (!currentStepData.targetElement) {
      const tooltipWidth = isMobile ? 280 : 320;
      const tooltipHeight = isMobile ? 180 : 200;
      
      return {
        top: (window.innerHeight / 2) - (tooltipHeight / 2),
        left: (window.innerWidth / 2) - (tooltipWidth / 2)
      };
    }

    const padding = isMobile ? 16 : 24;
    const tooltipWidth = isMobile ? 280 : 320;
    const tooltipHeight = isMobile ? 180 : 200;

    let top = 0;
    let left = 0;

    const sidebarWidth = isMobile ? 0 : 288;
    const availableWidth = window.innerWidth - sidebarWidth;

    switch (currentStepData.position) {
      case 'bottom':
        top = spotlightPosition.y + spotlightPosition.height + padding;
        
        if (isMobile) {
          left = Math.max(padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        } else {
          left = Math.max(sidebarWidth + padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        }
        
        if (top + tooltipHeight > window.innerHeight - padding) {
          top = Math.max(padding, spotlightPosition.y - tooltipHeight - padding);
        }
        break;

      case 'top':
        top = Math.max(padding, spotlightPosition.y - tooltipHeight - padding);
        
        if (isMobile) {
          left = Math.max(padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        } else {
          left = Math.max(sidebarWidth + padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        }
        
        if (top < padding) {
          top = spotlightPosition.y + spotlightPosition.height + padding;
        }
        break;

      case 'right':
        if (isMobile) {
          top = spotlightPosition.y + spotlightPosition.height + padding;
          left = Math.max(padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        } else {
          top = Math.max(padding, Math.min(
            window.innerHeight - tooltipHeight - padding,
            spotlightPosition.y + (spotlightPosition.height / 2) - (tooltipHeight / 2)
          ));
          left = spotlightPosition.x + spotlightPosition.width + padding * 2;
          
          if (left + tooltipWidth > window.innerWidth - padding) {
            left = Math.max(sidebarWidth + padding, spotlightPosition.x - tooltipWidth - padding * 2);
            
            if (left < sidebarWidth + padding) {
              top = spotlightPosition.y + spotlightPosition.height + padding;
              left = Math.max(sidebarWidth + padding, Math.min(
                window.innerWidth - tooltipWidth - padding,
                spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
              ));
            }
          }
        }
        break;

      case 'left':
        if (isMobile) {
          top = spotlightPosition.y + spotlightPosition.height + padding;
          left = Math.max(padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        } else {
          top = Math.max(padding, Math.min(
            window.innerHeight - tooltipHeight - padding,
            spotlightPosition.y + (spotlightPosition.height / 2) - (tooltipHeight / 2)
          ));
          left = Math.max(sidebarWidth + padding, spotlightPosition.x - tooltipWidth - padding * 2);
          
          if (left < sidebarWidth + padding) {
            left = spotlightPosition.x + spotlightPosition.width + padding * 2;
            
            if (left + tooltipWidth > window.innerWidth - padding) {
              top = spotlightPosition.y + spotlightPosition.height + padding;
              left = Math.max(sidebarWidth + padding, Math.min(
                window.innerWidth - tooltipWidth - padding,
                spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
              ));
            }
          }
        }
        break;
    }

    return { top, left };
  };

  const currentStepData = tourSteps[currentStep];
  if (!currentStepData) return null;

  const getStepTitle = () => {
    if (currentStepData.id === 'welcome') {
      return `${t.tour.welcomeGreeting} ${userFirstName} 👋`;
    }
    return currentStepData.titleKey ? t.tour[currentStepData.titleKey] : '';
  };

  const getStepDescription = () => {
    return t.tour[currentStepData.descriptionKey];
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
        {/* Light overlay with transparent hole */}
        {currentStepData.targetElement && (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <motion.rect 
                    animate={{
                      x: spotlightPosition.x - 10,
                      y: spotlightPosition.y - 10,
                      width: spotlightPosition.width + 20,
                      height: spotlightPosition.height + 20
                    }}
                    transition={{ 
                      duration: 0.7, 
                      ease: [0.4, 0, 0.2, 1]
                    }}
                    rx="12" 
                    ry="12"
                    fill="black" 
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#tour-spotlight-mask)" />
            </svg>
            
            {/* Outline and glow */}
            <motion.div 
              className="absolute pointer-events-none rounded-xl border-2 border-[#1D64FF] shadow-[0_0_0_4px_rgba(29,100,255,0.2),0_0_30px_rgba(29,100,255,0.3)]"
              animate={{
                left: spotlightPosition.x - 6,
                top: spotlightPosition.y - 6,
                width: spotlightPosition.width + 12,
                height: spotlightPosition.height + 12
              }}
              transition={{ 
                duration: 0.7, 
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

        {/* Close button top right */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-[10002] w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-all duration-200 shadow-lg"
          aria-label={t.tour.closeTour}
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
              "bg-white border border-slate-200 rounded-xl shadow-2xl relative",
              isMobile ? "p-4 mx-2 max-w-[280px]" : "p-6 mx-4 max-w-sm"
            )}
          >
            {/* Arrow */}
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
                    {getStepTitle()}
                  </h3>
                  <p className={cn(
                    "text-slate-500 mb-4 transition-all duration-300",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    {getStepDescription()}
                  </p>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex gap-2 justify-center">
                {currentStep === 0 ? (
                  <>
                    <Button
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      onClick={handleSkip}
                      className="text-slate-500 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700"
                    >
                      {t.tour.skip}
                    </Button>
                    <Button
                      size={isMobile ? "sm" : "default"}
                      onClick={handleNext}
                      className="bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white shadow-md"
                    >
                      {t.tour.next}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      onClick={handlePrevious}
                      className="text-slate-500 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-700"
                    >
                      {t.tour.back}
                    </Button>
                    <Button
                      size={isMobile ? "sm" : "default"}
                      onClick={handleNext}
                      className="bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white shadow-md"
                    >
                      {currentStep === tourSteps.length - 1 ? t.tour.finish : t.tour.next}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
