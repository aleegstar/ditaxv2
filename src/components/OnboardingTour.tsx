import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { debug } from '@/utils/debug';
import { supabase } from '@/integrations/supabase/client';

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetElement: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const mobileTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: '',
    description: 'Wir stellen dir die App kurz vor, damit du weisst, wie es funktioniert.',
    targetElement: '',
    position: 'bottom'
  },
  {
    id: 'navbar',
    title: 'Navigation',
    description: 'Hier kannst du durch die App navigieren.',
    targetElement: '[data-bottom-navbar], .modern-bottom-navbar',
    position: 'top'
  },
  {
    id: 'add-year',
    title: 'Steuerjahr hinzufügen',
    description: 'Hier kannst du weitere Steuerjahre hinzufügen.',
    targetElement: '[data-tour="add-year"], .year-dropdown-button',
    position: 'bottom'
  },
  {
    id: 'chat',
    title: 'Chat',
    description: 'Hier kannst du mit uns chatten und Fragen stellen.',
    targetElement: '[data-tour="chat-header-icon"]',
    position: 'bottom'
  },
  {
    id: 'documents',
    title: 'Dokumente',
    description: 'Sammle hier das ganze Jahr über deine Unterlagen und ordne sie später zu.',
    targetElement: '[data-tour="documents-nav"]',
    position: 'top'
  },
  {
    id: 'continue-card',
    title: 'Steuerjahr fortsetzen',
    description: 'Steuererklärung öffnen und weiter verarbeiten.',
    targetElement: '[data-tour="tax-year-card"], .blue-tax-year-card',
    position: 'bottom'
  }
];

const desktopTourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: '',
    description: 'Wir stellen dir die App kurz vor, damit du weisst, wie es funktioniert.',
    targetElement: '',
    position: 'bottom'
  },
  {
    id: 'sidebar',
    title: 'Navigation',
    description: 'Hier kannst du durch die App navigieren.',
    targetElement: 'nav, [data-sidebar], .modern-side-bar',
    position: 'right'
  },
  {
    id: 'add-year',
    title: 'Steuerjahr hinzufügen',
    description: 'Hier kannst du weitere Steuerjahre hinzufügen.',
    targetElement: '[data-tour="add-year"], .year-dropdown-button',
    position: 'bottom'
  },
  {
    id: 'chat',
    title: 'Chat',
    description: 'Hier kannst du mit uns chatten und Fragen stellen.',
    targetElement: '[data-tour="chat-header-icon"]',
    position: 'bottom'
  },
  {
    id: 'documents',
    title: 'Dokumente',
    description: 'Sammle hier das ganze Jahr über deine Unterlagen und ordne sie später zu.',
    targetElement: '[data-tour="documents-nav"]',
    position: 'right'
  },
  {
    id: 'continue-card',
    title: 'Steuerjahr fortsetzen',
    description: 'Steuererklärung öffnen und weiter verarbeiten.',
    targetElement: '[data-tour="tax-year-card"], .blue-tax-year-card',
    position: 'bottom'
  }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [userFirstName, setUserFirstName] = useState<string>('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  // Use different tour steps based on device type
  const tourSteps = isMobile ? mobileTourSteps : desktopTourSteps;

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
    // Skip spotlight for welcome step (no target element)
    if (!targetElement) {
      return;
    }
    
    debug.log(`🎯 Tour: Updating spotlight for element: ${targetElement} (attempt ${attempt})`);
    
    const tryFind = (): { element: Element | null; foundSelector: string } => {
      // Try multiple selectors separated by comma
      const selectors = targetElement.split(',').map(s => s.trim());
      // Try each selector in order
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
      
      // Enhanced fallback selectors with better mobile/desktop support
      const fallbackSelectors = isMobile ? [
        // Documents navigation - specific selectors first
        '[data-tour="documents-nav"]',
        '[data-bottom-navbar] [data-tour="documents-nav"]',
        '.modern-bottom-navbar [data-tour="documents-nav"]',
        'button[data-tour="documents-nav"]',
        'a[href="/documents"]',
        // Prefer explicit header chat icon
        '[data-tour="chat-header-icon"]',
        // Mobile bottom navbar chat
        '[data-tour="bottom-navbar-chat"]',
        // Legacy chat icon fallbacks
        '[data-tour="chat-icon"]',
        '[data-tour="chat-button"]',
        'a[href="/chat"]',
        '.chat-icon-with-badge',
        // Other elements
        '.continue-tax-card',
        '.year-dropdown-button',
        '.blue-tax-year-card',
        '.tax-year-card',
        // Grid layout cards
        '.grid .blue-tax-year-card',
        '.grid .continue-tax-card',
        '.card'
      ] : [
        // Prefer explicit header chat icon
        '[data-tour="chat-header-icon"]',
        // Documents navigation (sidebar)
        '[data-tour="documents-nav"]',
        // Desktop sidebar/nav fallbacks
        'nav a[href="/chat"]',
        '[data-sidebar-nav]',
        'nav a[href="/"]',
        'nav a[href="/documents"]',
        // Legacy chat icon fallbacks
        '[data-tour="chat-icon"]',
        '[data-tour="chat-button"]',
        '.chat-icon-with-badge',
        // Other elements
        '.continue-tax-card',
        '.year-dropdown-button',
        '.blue-tax-year-card',
        // Grid layout cards (new side-by-side layout)
        '.grid .blue-tax-year-card',
        '.grid .continue-tax-card',
        // Dashboard sections
        '.space-y-6 > div', // Offen/Abgeschlossen sections
        '.grid > div', // Individual grid items
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
      
      // Check if element is in viewport before scrolling
      const rect = element.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
      );
      
      // Only scroll if element is not fully visible
      if (!isInViewport) {
        try {
          (element as HTMLElement).scrollIntoView({ 
            block: 'center', 
            inline: 'center', 
            behavior: 'smooth' 
          });
          
          // Wait for scroll to complete before calculating position
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
      
      // Use viewport-relative coordinates (no scroll offsets for fixed overlay)
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
      // Retry a few times as elements may mount with delay/animation
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
      // Wait a bit for the DOM to be ready
      const timer = setTimeout(() => {
        updateSpotlight(currentStepData.targetElement);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, tourSteps]);

  useEffect(() => {
    // Hide sidebar during tour for better mobile experience only on mobile
    if (isMobile) {
      document.body.classList.add('hide-sidebar');
    }
    
    // Initial spotlight update
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
    // Re-calculate spotlight position on window resize and scroll
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
      // Beim letzten Schritt: Fokus auf das Target-Element setzen
      const lastStepData = tourSteps[tourSteps.length - 1];
      
      onComplete();
      
      // Fokus nach kurzer Verzögerung setzen (nach dem Overlay fade-out)
      if (lastStepData?.targetElement) {
        setTimeout(() => {
          // Versuche mehrere Selektoren (wie beim Spotlight)
          const selectors = lastStepData.targetElement.split(',').map(s => s.trim());
          
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            if (targetElement instanceof HTMLElement) {
              targetElement.focus();
              debug.log('✅ Tour: Fokus auf Element gesetzt:', selector);
              break;
            }
          }
        }, 700); // Nach dem Overlay fade-out (duration: 0.6s)
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

    // For welcome step, center the tooltip
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

    // For desktop, consider sidebar width (approximately 288px when open)
    const sidebarWidth = isMobile ? 0 : 288;
    const availableWidth = window.innerWidth - sidebarWidth;

    // Position based on step position preference and available space
    switch (currentStepData.position) {
      case 'bottom':
        top = spotlightPosition.y + spotlightPosition.height + padding;
        
        if (isMobile) {
          left = Math.max(padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        } else {
          // On desktop, account for sidebar
          left = Math.max(sidebarWidth + padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        }
        
        // If tooltip would be off-screen at bottom, place above
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
          // On desktop, account for sidebar
          left = Math.max(sidebarWidth + padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        }
        
        // If tooltip would be off-screen at top, place below
        if (top < padding) {
          top = spotlightPosition.y + spotlightPosition.height + padding;
        }
        break;

      case 'right':
        if (isMobile) {
          // On mobile, show below instead of right
          top = spotlightPosition.y + spotlightPosition.height + padding;
          left = Math.max(padding, Math.min(
            window.innerWidth - tooltipWidth - padding,
            spotlightPosition.x + (spotlightPosition.width / 2) - (tooltipWidth / 2)
          ));
        } else {
          // On desktop, position to the right with proper spacing
          top = Math.max(padding, Math.min(
            window.innerHeight - tooltipHeight - padding,
            spotlightPosition.y + (spotlightPosition.height / 2) - (tooltipHeight / 2)
          ));
          left = spotlightPosition.x + spotlightPosition.width + padding * 2; // Extra padding for better separation
          
          // If tooltip would be off-screen to the right, try left side
          if (left + tooltipWidth > window.innerWidth - padding) {
            left = Math.max(sidebarWidth + padding, spotlightPosition.x - tooltipWidth - padding * 2);
            
            // If still off-screen, place below instead
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
          // On mobile, show below instead of left
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
          
          // If tooltip would be off-screen to the left, place to the right
          if (left < sidebarWidth + padding) {
            left = spotlightPosition.x + spotlightPosition.width + padding * 2;
            
            // If still off-screen, place below instead
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-0 z-[10000] pointer-events-auto"
      >
        {/* Dark overlay with transparent hole - only show for steps with target elements */}
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
              <rect width="100%" height="100%" fill="black" opacity="0.3" mask="url(#tour-spotlight-mask)" />
            </svg>
            
            {/* Outline and glow to emphasize spotlight target */}
            <motion.div 
              className="absolute pointer-events-none rounded-lg"
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

        {/* For welcome step, show a light overlay instead */}
        {!currentStepData.targetElement && (
          <div className="absolute inset-0 bg-black/30" />
        )}


        {/* Progress indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-700 ease-out",
                index <= currentStep ? "bg-white scale-110" : "bg-white/30 scale-100"
              )}
            />
          ))}
        </div>

        {/* Close button top right */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-[10002] w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-700 hover:text-gray-900 transition-all duration-200 shadow-lg"
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
              "bg-white rounded-xl shadow-2xl relative",
              isMobile ? "p-4 mx-2 max-w-[280px]" : "p-6 mx-4 max-w-sm"
            )}
          >
            {/* Arrow pointing in correct direction based on tooltip position - only for non-welcome steps */}
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
                  // position === 'bottom' or mobile fallback
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
                    "font-semibold text-gray-900 mb-2 transition-all duration-300",
                    isMobile ? "text-base" : "text-lg"
                  )}>
                    {currentStepData.id === 'welcome' 
                      ? `Grüezi ${userFirstName}👋` 
                      : currentStepData.title}
                  </h3>
                  <p className={cn(
                    "text-gray-600 mb-4 transition-all duration-300",
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    {currentStepData.description}
                  </p>
                </motion.div>
              </AnimatePresence>
              
              <div className="flex gap-2 justify-center">
                {/* Show different buttons based on step */}
                {currentStep === 0 ? (
                  // First step (welcome): Skip and Next
                  <>
                    <Button
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      onClick={handleSkip}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      Überspringen
                    </Button>
                    <Button
                      size={isMobile ? "sm" : "default"}
                      onClick={handleNext}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Weiter
                    </Button>
                  </>
                ) : (
                  // All other steps: Back and Next
                  <>
                    <Button
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      onClick={handlePrevious}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                    >
                      Zurück
                    </Button>
                    <Button
                      size={isMobile ? "sm" : "default"}
                      onClick={handleNext}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {currentStep === tourSteps.length - 1 ? "Fertig" : "Weiter"}
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