
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useFormContext } from '../contexts';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { FramerButton } from '@/components/ui/framer-button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { debug } from '@/utils/debug';

interface FormNavigationProps {
  onNext: () => void;
  onBack: () => void;
  isLastStep: boolean;
  canProceed: boolean;
  isDialogMode?: boolean;
  formSection?: string;
  validateForm?: () => string[];  // New validation function that returns missing field names
}

const FormNavigation: React.FC<FormNavigationProps> = ({
  onNext,
  onBack,
  isLastStep,
  canProceed = true,
  isDialogMode = false,
  formSection,
  validateForm
}) => {
  const {
    currentStep,
    updateFormProgress,
    updateFormData,
    formData,
    updateValidationErrors,
    saveSection
  } = useFormContext();
  
  const isMobile = useIsMobile();

  const handleNext = async () => {
    debug.log("FormNavigation: handleNext called", { formSection, canProceed });
    
    // If we have a custom validation function, use it
    if (validateForm) {
      const missingFields = validateForm();
      
      // If there are missing fields, update validation errors and show toast
      if (missingFields.length > 0) {
        debug.log("Form validation failed. Missing fields:", missingFields);
        
        if (formSection) {
          // Update validation errors for current form section
          updateValidationErrors(formSection as any, missingFields);
          
          toast({
            title: "Fehlende Angaben",
            description: "Bitte füllen Sie alle erforderlichen Felder aus, bevor Sie fortfahren.",
            variant: "destructive"
          });
        }
        return;
      }
      
      // If validation passed, clear any validation errors
      if (formSection) {
        updateValidationErrors(formSection as any, []);
      }
    }
    
    // Standard validation if no custom validation function provided
    if (!canProceed) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte füllen Sie alle erforderlichen Felder aus, bevor Sie fortfahren.",
        variant: "destructive"
      });
      return;
    }
    
    // If we have a formSection defined, save its data to the database
    if (formSection) {
      debug.log(`FormNavigation: Saving form data for section ${formSection} to database`);
      
      try {
        // Get the current data for this section
        const sectionData = formData[formSection as keyof typeof formData];
        debug.log(`FormNavigation: Section data for ${formSection}:`, sectionData);
        
        if (sectionData) {
          // Save data to database using saveSection
          await saveSection(formSection as any, sectionData);
          debug.log(`FormNavigation: Successfully saved ${formSection} to database`);
          
          toast({
            title: "Gespeichert",
            description: "Deine Daten wurden erfolgreich gespeichert.",
          });
        } else {
          debug.warn(`FormNavigation: No data found for section ${formSection}`);
        }
      } catch (error) {
        debug.error(`FormNavigation: Error saving ${formSection}:`, error);
        toast({
          title: "Speicherfehler",
          description: "Beim Speichern ist ein Fehler aufgetreten. Bitte versuche es erneut.",
          variant: "destructive"
        });
        return; // Don't proceed if save failed
      }
    }
    
    // Call the onNext callback
    onNext();
    
    // Scroll to top after navigation
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  };

  const handleBackClick = () => {
    // Call the onBack callback
    onBack();
    
    // Scroll to top after navigation
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  };

  if (isDialogMode) {
    return (
      <div className="flex justify-center mt-8 w-full">
        <FramerButton variant="desktop" onClick={handleNext} disabled={!canProceed} className="w-full">
          Speichern
        </FramerButton>
      </div>
    );
  }

  return <div className="flex justify-center items-center gap-6 mt-8">
      <motion.button 
        onClick={handleBackClick} 
        disabled={currentStep === 0} 
        className={cn(
          "w-12 h-12 rounded-full bg-white text-black flex items-center justify-center transition-colors shadow-lg",
          currentStep === 0 && 'opacity-30 pointer-events-none'
        )}
        whileHover={currentStep !== 0 ? { scale: 1.1 } : {}}
        whileTap={currentStep !== 0 ? { scale: 0.95 } : {}}
        transition={{ duration: 0.2 }}
      >
        <ChevronLeft size={20} />
      </motion.button>
      
      <motion.button
        onClick={handleNext}
        disabled={!canProceed}
        className={cn(
          "w-12 h-12 rounded-full bg-white text-black flex items-center justify-center transition-colors shadow-lg",
          !canProceed && 'opacity-50 pointer-events-none'
        )}
        whileHover={canProceed ? { scale: 1.1 } : {}}
        whileTap={canProceed ? { scale: 0.95 } : {}}
        transition={{ duration: 0.2 }}
      >
        <ChevronRight size={20} />
      </motion.button>
    </div>;
};

export default FormNavigation;
