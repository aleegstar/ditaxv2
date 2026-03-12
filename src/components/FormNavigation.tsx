
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useFormContext } from '../contexts';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
        <Button onClick={handleNext} disabled={!canProceed} className="w-full">
          Speichern
        </Button>
      </div>
    );
  }

  return <div className="flex justify-center items-center gap-4 mt-8">
      <motion.button
        onClick={handleBackClick}
        disabled={currentStep === 0}
        className={cn(
          "group flex items-center gap-3 rounded-full bg-gradient-to-b from-card to-muted border border-border px-5 py-3 font-semibold text-sm text-foreground transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-[0.97]",
          currentStep === 0 && 'opacity-30 pointer-events-none'
        )}
        whileHover={currentStep !== 0 ? { scale: 1.03 } : {}}
        whileTap={currentStep !== 0 ? { scale: 0.97 } : {}}
        transition={{ duration: 0.2 }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-accent">
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        </div>
        <span>Zurück</span>
      </motion.button>

      <motion.button
        onClick={handleNext}
        disabled={!canProceed}
        className={cn(
          "group flex items-center gap-3 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-5 py-3 font-semibold text-sm text-white transition-all shadow-[0_2px_8px_hsl(222,100%,56%,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_hsl(222,100%,56%,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 active:scale-[0.97]",
          !canProceed && 'opacity-50 pointer-events-none'
        )}
        whileHover={canProceed ? { scale: 1.03 } : {}}
        whileTap={canProceed ? { scale: 0.97 } : {}}
        transition={{ duration: 0.2 }}
      >
        <span>Weiter</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors group-hover:bg-white/25">
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.button>
    </div>;
};

export default FormNavigation;
