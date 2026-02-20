import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
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

export const FormTourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showTour, setShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  const initialRouteRef = useRef<string | null>(null);
  const hasNavigatedRef = useRef(false);
  const forceStartHandledRef = useRef(false);

  const isOnFormDashboard = location.pathname === '/form' && !new URLSearchParams(location.search).get('section');
  const shouldForceStart = new URLSearchParams(location.search).get('startTour') === 'true';

  const checkTourCompletionStatus = async (): Promise<{ form: boolean; onboarding: boolean }> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return { form: false, onboarding: false };
      const formCompleted = user.user_metadata?.form_tour_completed === true;
      const onboardingDone = user.user_metadata?.onboarding_tour_completed === true;
      return { form: formCompleted, onboarding: onboardingDone };
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

  // Track navigation
  useEffect(() => {
    if (initialRouteRef.current === null) {
      initialRouteRef.current = location.pathname;
    } else if (location.pathname !== initialRouteRef.current) {
      hasNavigatedRef.current = true;
    }
  }, [location.pathname]);

  // Handle ?startTour=true URL param — triggered from menu
  useEffect(() => {
    if (!shouldForceStart || !isReady || !userId || forceStartHandledRef.current) return;
    forceStartHandledRef.current = true;

    debug.log('🎯 Form Tour: startTour param detected — force starting tour');

    // Remove the param from URL cleanly
    navigate('/form', { replace: true });

    // Reset guards and show tour immediately
    hasNavigatedRef.current = false;
    initialRouteRef.current = '/form';
    setTourCompleted(false);
    setShowTour(true);
  }, [shouldForceStart, isReady, userId, navigate]);

  // Auto-show tour when on form dashboard and not completed
  useEffect(() => {
    if (!isReady || !userId) return;

    // Skip if force-start already handled (to avoid conflict)
    if (shouldForceStart) return;

    if (!onboardingCompleted) {
      setShowTour(false);
      return;
    }
    
    if (hasNavigatedRef.current && !initialRouteRef.current?.startsWith('/form')) {
      setShowTour(false);
      return;
    }

    if (isOnFormDashboard && !tourCompleted) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowTour(false);
    }
  }, [isReady, userId, isOnFormDashboard, tourCompleted, onboardingCompleted, shouldForceStart]);

  const completeTour = async () => {
    setShowTour(false);
    setTourCompleted(true);
    try {
      await supabase.auth.updateUser({
        data: { 
          form_tour_completed: true,
          form_tour_completed_at: new Date().toISOString()
        }
      });
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
