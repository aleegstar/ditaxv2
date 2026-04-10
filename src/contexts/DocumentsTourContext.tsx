import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  
  // Track if user has navigated - prevents tour from starting after navigation
  const initialRouteRef = useRef<string | null>(null);
  const hasNavigatedRef = useRef(false);
  const isManualStartRef = useRef(false);

  // Check tour completion status in user metadata
  const checkTourCompletionStatus = async (): Promise<{ documents: boolean; onboarding: boolean }> => {
    try {
      debug.log('🎯 Documents Tour: Checking user metadata for tour completion status...');
      
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        debug.error('❌ Documents Tour: Error getting user:', error);
        return { documents: false, onboarding: false };
      }

      const documentsCompleted = user.user_metadata?.documents_tour_completed === true;
      const onboardingCompleted = user.user_metadata?.onboarding_tour_completed === true;
      
      debug.log(`🎯 Documents Tour: User metadata status:`, { documentsCompleted, onboardingCompleted });
      
      return { documents: documentsCompleted, onboarding: onboardingCompleted };
    } catch (error) {
      debug.error('❌ Documents Tour: Exception checking tour completion:', error);
      return { documents: false, onboarding: false };
    }
  };

  // Track navigation - if user navigates away, don't show tour on return
  useEffect(() => {
    if (initialRouteRef.current === null) {
      initialRouteRef.current = location.pathname;
      debug.log('🎯 Documents Tour: Initial route set:', location.pathname);
    } else if (location.pathname !== initialRouteRef.current) {
      hasNavigatedRef.current = true;
      debug.log('🎯 Documents Tour: User navigated, tour will not auto-start');
    }
  }, [location.pathname]);

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
      
      // Don't show tour if user navigated here from another page (unless manually started)
      // Exception: /auth and /welcome are allowed (user just completed registration)
      if (!isManualStartRef.current && hasNavigatedRef.current && initialRouteRef.current !== '/documents' && initialRouteRef.current !== '/auth' && initialRouteRef.current !== '/welcome' && initialRouteRef.current !== '/') {
        debug.log('❌ Documents Tour: User navigated here, skipping tour');
        setShowTour(false);
        setIsReady(true);
        return;
      }

      debug.log('🎯 Documents Tour: User authenticated, checking tour status...');

      if (isManualStartRef.current) {
        debug.log('🔄 Documents Tour: Manual start active, showing tour');
        setShowTour(true);
        setIsReady(true);
        return;
      }
      
      const { documents: documentsCompleted, onboarding: onboardingCompleted } = await checkTourCompletionStatus();

      if (isManualStartRef.current) {
        debug.log('🔄 Documents Tour: Manual start became active during init, showing tour');
        setShowTour(true);
        setIsReady(true);
        return;
      }

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
    isManualStartRef.current = false;
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          documents_tour_completed: true,
          documents_tour_completed_at: new Date().toISOString()
        }
      });

      if (error) {
        debug.error('❌ Documents Tour: Error updating user metadata:', error);
      } else {
        debug.log('✅ Documents Tour: User metadata updated successfully');
      }
      
      setTourCompleted(true);
      setShowTour(false);
    } catch (error) {
      debug.error('❌ Documents Tour: Error completing tour:', error);
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
    isManualStartRef.current = true;
    hasNavigatedRef.current = false;
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
