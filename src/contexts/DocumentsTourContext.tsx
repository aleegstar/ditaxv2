import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';

interface DocumentsTourContextType {
  showTour: boolean;
  isReady: boolean;
  tourCompleted: boolean;
  completeTour: () => Promise<void>;
  skipTour: () => Promise<void>;
  forceTour: () => Promise<void>;
}

const DocumentsTourContext = createContext<DocumentsTourContextType | undefined>(undefined);

export const DocumentsTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showTour, setShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tourCompleted, setTourCompleted] = useState<boolean | null>(null);
  const { isValid, userId, isLoading } = useAuthValidation();
  const location = useLocation();

  // Check tour completion status in database
  const checkTourCompletionStatus = async (userId: string): Promise<{ documents: boolean; onboarding: boolean }> => {
    try {
      debug.log('🎯 Documents Tour: Checking database for tour completion status...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('documents_tour_completed, onboarding_tour_completed')
        .eq('id', userId)
        .single();

      if (error) {
        debug.error('❌ Documents Tour: Error checking tour completion:', error);
        // Fallback to localStorage
        const localTourCompleted = localStorage.getItem('documents-tour-completed');
        const localOnboardingCompleted = localStorage.getItem('onboarding-tour-completed');
        return { 
          documents: !!localTourCompleted, 
          onboarding: !!localOnboardingCompleted 
        };
      }

      const documentsCompleted = data?.documents_tour_completed || false;
      const onboardingCompleted = data?.onboarding_tour_completed || false;
      
      debug.log(`🎯 Documents Tour: Database status for user ${userId}:`, { documentsCompleted, onboardingCompleted });
      
      // Sync with localStorage for backup
      if (documentsCompleted) {
        localStorage.setItem('documents-tour-completed', 'true');
      }
      
      return { documents: documentsCompleted, onboarding: onboardingCompleted };
    } catch (error) {
      debug.error('❌ Documents Tour: Exception checking tour completion:', error);
      // Fallback to localStorage
      const localTourCompleted = localStorage.getItem('documents-tour-completed');
      const localOnboardingCompleted = localStorage.getItem('onboarding-tour-completed');
      return { 
        documents: !!localTourCompleted, 
        onboarding: !!localOnboardingCompleted 
      };
    }
  };

  // Initialize tour state
  useEffect(() => {
    const initializeTour = async () => {
      if (isLoading) {
        debug.log('🎯 Documents Tour: Waiting for auth...');
        return;
      }

      if (!isValid || !userId) {
        debug.log('❌ Documents Tour: User not authenticated');
        setShowTour(false);
        setIsReady(false);
        return;
      }

      // Only run on /documents route
      if (location.pathname !== '/documents') {
        setShowTour(false);
        setIsReady(false);
        return;
      }

      debug.log('🎯 Documents Tour: User authenticated, checking tour status...');
      
      const { documents: documentsCompleted, onboarding: onboardingCompleted } = await checkTourCompletionStatus(userId);
      setTourCompleted(documentsCompleted);
      
      // CRITICAL: Only show documents tour if onboarding tour is already completed
      // This prevents overlapping tours for new users
      if (!onboardingCompleted) {
        debug.log('❌ Documents Tour: Onboarding tour not completed yet, skipping documents tour');
        setShowTour(false);
        setIsReady(true);
        return;
      }
      
      if (!documentsCompleted) {
        debug.log('✅ Documents Tour: Tour not completed, will show tour');
        setShowTour(true);
        setIsReady(true);
      } else {
        debug.log('✅ Documents Tour: Tour already completed');
        setShowTour(false);
        setIsReady(true);
      }
    };

    initializeTour();
  }, [isValid, userId, isLoading, location.pathname]);

  const completeTour = async () => {
    debug.log('✅ Documents Tour: Completing tour...');
    
    try {
      if (userId) {
        const { error } = await supabase
          .from('profiles')
          .update({ documents_tour_completed: true })
          .eq('id', userId);

        if (error) {
          debug.error('❌ Documents Tour: Error updating database:', error);
        } else {
          debug.log('✅ Documents Tour: Database updated successfully');
        }
      }
      
      // Always update localStorage as backup
      localStorage.setItem('documents-tour-completed', 'true');
      setTourCompleted(true);
      setShowTour(false);
    } catch (error) {
      debug.error('❌ Documents Tour: Error completing tour:', error);
      // Still update localStorage on error
      localStorage.setItem('documents-tour-completed', 'true');
      setTourCompleted(true);
      setShowTour(false);
    }
  };

  const skipTour = async () => {
    debug.log('⏭️ Documents Tour: Skipping tour...');
    await completeTour(); // Same as complete
  };

  const forceTour = async () => {
    debug.log('🔄 Documents Tour: Forcing tour to show...');
    setShowTour(true);
    setIsReady(true);
  };

  return (
    <DocumentsTourContext.Provider
      value={{
        showTour,
        isReady,
        tourCompleted: tourCompleted || false,
        completeTour,
        skipTour,
        forceTour,
      }}
    >
      {children}
    </DocumentsTourContext.Provider>
  );
};

export const useDocumentsTour = () => {
  const context = useContext(DocumentsTourContext);
  if (context === undefined) {
    throw new Error('useDocumentsTour must be used within a DocumentsTourProvider');
  }
  return context;
};
