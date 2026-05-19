import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { debug } from '@/utils/debug';
import { TourOverlay, type SpotlightPosition } from '@/components/ui/tour-overlay';

interface DocumentsTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const documentsTourSteps = [
  {
    id: 'welcome',
    title: 'Deine Dokumente',
    description: 'Hier sammelst du das ganze Jahr über alle Belege an einem sicheren Ort. Beim Ausfüllen deiner Steuererklärung ordnet Ditax sie automatisch zu.',
    targetElement: '',
    position: 'bottom' as const,
    heroImage: true,
    heroBadge: 'Kurze Tour',
  },
  {
    id: 'year-selector',
    title: 'Steuerjahr wählen',
    description: 'Wechsle hier zwischen den Steuerjahren – jedes Jahr hat seinen eigenen Ordner.',
    targetElement: '[data-tour="documents-year-selector"]',
    position: 'bottom' as const,
  },
  {
    id: 'hero',
    title: 'Sicher verschlüsselt',
    description: 'Alle Dokumente werden Ende-zu-Ende verschlüsselt gespeichert – nur du hast Zugriff.',
    targetElement: '[data-tour="documents-hero"]',
    position: 'bottom' as const,
  },
  {
    id: 'upload-card',
    title: 'Dokumente hochladen',
    description: 'Tippe hier, um Belege per Kamera, Galerie oder Datei hochzuladen.',
    targetElement: '[data-tour="document-upload-floating"], [data-tour="document-upload-card"]',
    position: 'top' as const,
  },
];

export const DocumentsTour: React.FC<DocumentsTourProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightPosition, setSpotlightPosition] = useState<SpotlightPosition>({ x: 0, y: 0, width: 0, height: 0 });
  
  const currentStepData = documentsTourSteps[currentStep];

  // Add/remove body attribute when tour is active
  useEffect(() => {
    document.body.setAttribute('data-documents-tour-open', 'true');
    return () => {
      document.body.removeAttribute('data-documents-tour-open');
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
        debug.log(`🎯 Documents Tour: Retrying to find element (${attempts}/${maxAttempts}): ${currentStepData.targetElement}`);
        setTimeout(tryUpdateSpotlight, retryInterval);
      } else {
        debug.error(`❌ Documents Tour: Could not find element after ${maxAttempts} attempts: ${currentStepData.targetElement}`);
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
    if (currentStep < documentsTourSteps.length - 1) {
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
    <TourOverlay
      steps={documentsTourSteps}
      currentStep={currentStep}
      spotlightPosition={spotlightPosition}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={onSkip}
      maskId="documents-spotlight-mask"
    />
  );
};
