import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  // Check if on form page without section param (main dashboard)
  const isOnFormDashboard = location.pathname === '/form' && !new URLSearchParams(location.search).get('section');

  // Check tour completion status
  const checkTourCompletionStatus = async (uid: string): Promise<{ form: boolean; onboarding: boolean }> => {
    try {
      // Check localStorage first for form tour
      const localCompleted = localStorage.getItem(`${FORM_TOUR_KEY}-${uid}`);
      const localOnboardingCompleted = localStorage.getItem('onboarding-tour-completed');
      
      if (localCompleted === 'true') {
        return { form: true, onboarding: !!localOnboardingCompleted };
      }

      // Check database
      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_preferences, onboarding_tour_completed')
        .eq('id', uid)
        .single();

      if (error) {
        debug.error('Error checking form tour status:', error);
        return { form: false, onboarding: !!localOnboardingCompleted };
      }

      const prefs = data?.privacy_preferences as Record<string, unknown> | null;
      const formCompleted = prefs?.form_tour_completed === true;
      const onboardingCompleted = data?.onboarding_tour_completed === true;
      
      if (formCompleted) {
        localStorage.setItem(`${FORM_TOUR_KEY}-${uid}`, 'true');
      }
      
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
        const { form, onboarding } = await checkTourCompletionStatus(user.id);
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
        const { form, onboarding } = await checkTourCompletionStatus(session.user.id);
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

    if (userId) {
      localStorage.setItem(`${FORM_TOUR_KEY}-${userId}`, 'true');
      
      try {
        // Get current privacy_preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('privacy_preferences')
          .eq('id', userId)
          .single();

        const currentPrefs = (profile?.privacy_preferences as Record<string, unknown>) || {};
        
        // Update with form_tour_completed
        await supabase
          .from('profiles')
          .update({
            privacy_preferences: {
              ...currentPrefs,
              form_tour_completed: true
            }
          })
          .eq('id', userId);

        debug.log('✅ Form tour marked as completed');
      } catch (error) {
        debug.error('Error saving form tour completion:', error);
      }
    }
  };

  const skipTour = async () => {
    await completeTour();
  };

  const forceTour = () => {
    if (userId) {
      localStorage.removeItem(`${FORM_TOUR_KEY}-${userId}`);
    }
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
