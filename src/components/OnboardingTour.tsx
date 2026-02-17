import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { debug } from '@/utils/debug';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/contexts/I18nContext';
import { Translation } from '@/i18n/translations';
import { TourOverlay, type TourStep, type SpotlightPosition } from '@/components/ui/tour-overlay';

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  titleKey: keyof Translation['tour'] | null;
  descriptionKey: keyof Translation['tour'];
  targetElement: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const getOnboardingSteps = (): OnboardingStep[] => [
  {
    id: 'welcome',
    titleKey: null,
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
  const [spotlightPosition, setSpotlightPosition] = useState<SpotlightPosition>({ x: 0, y: 0, width: 0, height: 0 });
  const [userFirstName, setUserFirstName] = useState<string>('');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const onboardingSteps = getOnboardingSteps();

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

  // Convert onboarding steps to TourStep format with resolved i18n
  const tourSteps: TourStep[] = onboardingSteps.map((step) => ({
    id: step.id,
    title: step.id === 'welcome'
      ? `${t.tour.welcomeGreeting} ${userFirstName} 👋`
      : (step.titleKey ? t.tour[step.titleKey] : ''),
    description: t.tour[step.descriptionKey],
    targetElement: step.targetElement,
    position: step.position,
  }));

  const updateSpotlight = (targetElement: string, attempt = 0) => {
    if (!targetElement) return;
    
    debug.log(`🎯 Tour: Updating spotlight for element: ${targetElement} (attempt ${attempt})`);
    
    const tryFind = (): { element: Element | null; foundSelector: string } => {
      const selectors = targetElement.split(',').map(s => s.trim());
      for (const selector of selectors) {
        try {
          const el = document.querySelector(selector);
          if (el) return { element: el, foundSelector: selector };
        } catch (e) {
          debug.warn(`Invalid selector: ${selector}`, e);
        }
      }
      
      const fallbackSelectors = [
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
        if (el) return { element: el, foundSelector: fb };
      }
      return { element: null, foundSelector: '' };
    };
    
    const { element, foundSelector } = tryFind();
    
    if (element) {
      debug.log(`✅ Tour: Found element with selector: ${foundSelector}`);
      const rect = element.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 && rect.left >= 0 &&
        rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
      );
      
      if (!isInViewport) {
        try {
          (element as HTMLElement).scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
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
      
      setSpotlightPosition({
        x: Math.max(0, Math.floor(rect.left)),
        y: Math.max(0, Math.floor(rect.top)),
        width: Math.max(50, Math.ceil(rect.width)),
        height: Math.max(30, Math.ceil(rect.height))
      });
    } else if (attempt < 10) {
      debug.warn('⚠️ No element found, retrying...', attempt + 1);
      setTimeout(() => updateSpotlight(targetElement, attempt + 1), 100);
    } else {
      debug.warn('⚠️ Tour: Could not find element after retries, using center fallback');
      setSpotlightPosition({
        x: Math.floor(window.innerWidth / 2 - 100),
        y: Math.floor(window.innerHeight / 2 - 50),
        width: 200,
        height: 100
      });
    }
  };

  useEffect(() => {
    const step = onboardingSteps[currentStep];
    if (step?.targetElement) {
      const timer = setTimeout(() => updateSpotlight(step.targetElement), 50);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  useEffect(() => {
    if (isMobile) document.body.classList.add('hide-sidebar');
    if (onboardingSteps[currentStep]?.targetElement) {
      updateSpotlight(onboardingSteps[currentStep].targetElement);
    }
    return () => { if (isMobile) document.body.classList.remove('hide-sidebar'); };
  }, [isMobile]);

  useEffect(() => {
    const handleReposition = () => {
      if (onboardingSteps[currentStep]?.targetElement) {
        updateSpotlight(onboardingSteps[currentStep].targetElement);
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
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const lastStep = onboardingSteps[onboardingSteps.length - 1];
      onComplete();
      if (lastStep?.targetElement) {
        setTimeout(() => {
          const selectors = lastStep.targetElement.split(',').map(s => s.trim());
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el instanceof HTMLElement) {
              el.focus();
              debug.log('✅ Tour: Fokus auf Element gesetzt:', selector);
              break;
            }
          }
        }, 700);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <TourOverlay
      steps={tourSteps}
      currentStep={currentStep}
      spotlightPosition={spotlightPosition}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={onSkip}
      maskId="onboarding-spotlight-mask"
      nextLabel={t.tour.next}
      backLabel={t.tour.back}
      skipLabel={t.tour.skip}
      finishLabel={t.tour.finish}
    />
  );
};
