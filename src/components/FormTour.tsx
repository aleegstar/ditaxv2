import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { debug } from '@/utils/debug';
import { TourOverlay, type SpotlightPosition } from '@/components/ui/tour-overlay';
import { motion } from 'framer-motion';

interface FormTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const formTourSteps = [
  {
    id: 'welcome',
    title: 'Willkommen',
    description: 'In dieser Anleitung zeigen wir dir die 3 Schritte, um deine Steuererklärung einzureichen.',
    targetElement: '',
    position: 'bottom' as const
  },
  {
    id: 'step-1-angaben',
    title: 'Schritt 1: Angaben',
    description: 'Fülle zuerst die 4 Formulare aus: Kontaktangaben, Abzüge, Einkommen und Vermögen. Klicke auf jede Karte, um das jeweilige Formular zu öffnen.',
    targetElement: '[data-tour="form-step-1"]',
    position: 'bottom' as const
  },
  {
    id: 'step-2-unterlagen',
    title: 'Schritt 2: Unterlagen',
    description: 'Nachdem du alle Angaben gemacht hast, lade deine steuerrelevanten Unterlagen hoch. Diese Funktion wird freigeschaltet, sobald Schritt 1 abgeschlossen ist.',
    targetElement: '[data-tour="form-step-2"]',
    position: 'top' as const
  },
  {
    id: 'step-3-einreichen',
    title: 'Schritt 3: Einreichen',
    description: 'Zum Schluss reichst du deine Steuererklärung zur Erstellung ein. Diese Funktion wird freigeschaltet, sobald Schritt 2 abgeschlossen ist.',
    targetElement: '[data-tour="form-step-3"]',
    position: 'top' as const
  },
  {
    id: 'start-kontaktangaben',
    title: 'Los geht\'s!',
    description: 'Beginne damit deine Angaben zu erfassen.',
    targetElement: '[data-tour="kontaktangaben"]',
    position: 'bottom' as const
  }
];

export const FormTour: React.FC<FormTourProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState<SpotlightPosition>({ x: 0, y: 0, width: 0, height: 0 });
  const isMobile = useIsMobile();
  
  const currentStepData = formTourSteps[currentStep];

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
        const padding = 12;
        setSpotlightPosition({
          x: rect.left - padding,
          y: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

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
    if (currentStep < formTourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <TourOverlay
        steps={formTourSteps}
        currentStep={currentStep}
        spotlightPosition={spotlightPosition}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={onSkip}
        maskId="form-spotlight-mask"
      />
    </motion.div>
  );
};
