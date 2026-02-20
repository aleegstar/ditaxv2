import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { debug } from '@/utils/debug';

interface FormTourContextType {
  showTour: boolean;
  isReady: boolean;
  tourCompleted: boolean;
  completeTour: () => Promise<void>;
  skipTour: () => Promise<void>;
  forceTour: () => void;
}

const FormTourContext = createContext<FormTourContextType | undefined>(undefined);

const FORM_TOUR_KEY = 'form-tour-completed';

export const FormTourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showTour, setShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();
  
  // Track if user has navigated - prevents tour from starting after navigation
  const initialRouteRef = useRef<string | null>(null);
  const hasNavigatedRef = useRef(false);

  // Check if on form page without section param (main dashboard)
  const isOnFormDashboard = location.pathname === '/form' && !new URLSearchParams(location.search).get('section');

  // Check tour completion status in user metadata
  const checkTourCompletionStatus = async (): Promise<{ form: boolean; onboarding: boolean }> => {
    try {
      debug.log('🎯 Form Tour: Checking user metadata for tour completion status...');
      
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        debug.error('Error checking form tour status:', error);
        return { form: false, onboarding: false };
      }

      const formCompleted = user.user_metadata?.form_tour_completed === true;
      const onboardingCompleted = user.user_metadata?.onboarding_tour_completed === true;
      
      debug.log('🎯 Form Tour: User metadata status:', { formCompleted, onboardingCompleted });
      
      return { form: formCompleted, onboarding: onboardingCompleted };
    } catch (error) {
      debug.error('Error in checkTourCompletionStatus:', error);
      return { form: false, onboarding: false };
    }
  };

  // Load tour status on auth change
  useEffect(() => {
    const loadTourStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        const { form, onboarding } = await checkTourCompletionStatus();
        setTourCompleted(form);
        setOnboardingCompleted(onboarding);
        setIsReady(true);
      } else {
        setUserId(null);
        setTourCompleted(false);
        setOnboardingCompleted(false);
        setIsReady(true);
      }
    };

    loadTourStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        const { form, onboarding } = await checkTourCompletionStatus();
        setTourCompleted(form);
        setOnboardingCompleted(onboarding);
      } else {
        setUserId(null);
        setTourCompleted(false);
        setOnboardingCompleted(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Track navigation - if user navigates away, don't show tour on return
  useEffect(() => {
    if (initialRouteRef.current === null) {
      initialRouteRef.current = location.pathname;
      debug.log('🎯 Form Tour: Initial route set:', location.pathname);
    } else if (location.pathname !== initialRouteRef.current) {
      hasNavigatedRef.current = true;
      debug.log('🎯 Form Tour: User navigated, tour will not auto-start');
    }
  }, [location.pathname]);

  // Auto-show tour when on form dashboard and not completed
  // CRITICAL: Only show if onboarding tour is already completed (prevents overlapping tours)
  useEffect(() => {
    if (!isReady || !userId) return;

    // Don't show form tour if onboarding tour hasn't been completed yet
    if (!onboardingCompleted) {
      debug.log('🎯 Form Tour: Onboarding tour not completed yet, skipping form tour');
      setShowTour(false);
      return;
    }
    
    // Don't show tour if user navigated here from another page
    if (hasNavigatedRef.current && !initialRouteRef.current?.startsWith('/form')) {
      debug.log('🎯 Form Tour: User navigated here, skipping tour');
      setShowTour(false);
      return;
    }

    if (isOnFormDashboard && !tourCompleted) {
      // Small delay to ensure page is rendered
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowTour(false);
    }
  }, [isReady, userId, isOnFormDashboard, tourCompleted, onboardingCompleted]);

  const completeTour = async () => {
    setShowTour(false);
    setTourCompleted(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          form_tour_completed: true,
          form_tour_completed_at: new Date().toISOString()
        }
      });

      if (error) {
        debug.error('Error saving form tour completion:', error);
      } else {
        debug.log('✅ Form tour marked as completed in user metadata');
      }
    } catch (error) {
      debug.error('Error saving form tour completion:', error);
    }
  };

  const skipTour = async () => {
    await completeTour();
  };

  const forceTour = async () => {
    try {
      await supabase.auth.updateUser({
        data: { 
          form_tour_completed: false,
          form_tour_completed_at: null
        }
      });
    } catch (error) {
      debug.error('Error resetting form tour:', error);
    }
    // Reset navigation guard so tour can start even after navigating here
    hasNavigatedRef.current = false;
    initialRouteRef.current = '/form';
    setTourCompleted(false);
    setShowTour(true);
  };

  return (
    <FormTourContext.Provider value={{
      showTour,
      isReady,
      tourCompleted,
      completeTour,
      skipTour,
      forceTour
    }}>
      {children}
    </FormTourContext.Provider>
  );
};

export const useFormTour = () => {
  const context = useContext(FormTourContext);
  if (!context) {
    throw new Error('useFormTour must be used within a FormTourProvider');
  }
  return context;
};

// Safe version that returns null when used outside provider
export const useFormTourSafe = () => {
  return useContext(FormTourContext);
};
