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
  const checkTourCompletionStatus = async (userId: string): Promise<boolean> => {
    try {
      debug.log('🎯 Documents Tour: Checking database for tour completion status...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('documents_tour_completed')
        .eq('id', userId)
        .single();

      if (error) {
        debug.error('❌ Documents Tour: Error checking tour completion:', error);
        // Fallback to localStorage
        const localTourCompleted = localStorage.getItem('documents-tour-completed');
        return !!localTourCompleted;
      }

      const completed = data?.documents_tour_completed || false;
      debug.log(`🎯 Documents Tour: Database tour status for user ${userId}:`, completed);
      
      // Sync with localStorage for backup
      if (completed) {
        localStorage.setItem('documents-tour-completed', 'true');
      }
      
      return completed;
    } catch (error) {
      debug.error('❌ Documents Tour: Exception checking tour completion:', error);
      // Fallback to localStorage
      const localTourCompleted = localStorage.getItem('documents-tour-completed');
      return !!localTourCompleted;
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
      
      const completed = await checkTourCompletionStatus(userId);
      setTourCompleted(completed);
      
      if (!completed) {
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
