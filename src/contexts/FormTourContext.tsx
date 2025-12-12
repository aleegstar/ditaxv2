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
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();

  // Check if on form page without section param (main dashboard)
  const isOnFormDashboard = location.pathname === '/form' && !new URLSearchParams(location.search).get('section');

  // Check tour completion status
  const checkTourCompletionStatus = async (uid: string): Promise<boolean> => {
    try {
      // Check localStorage first
      const localCompleted = localStorage.getItem(`${FORM_TOUR_KEY}-${uid}`);
      if (localCompleted === 'true') {
        return true;
      }

      // Check database
      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_preferences')
        .eq('id', uid)
        .single();

      if (error) {
        debug.error('Error checking form tour status:', error);
        return false;
      }

      const prefs = data?.privacy_preferences as Record<string, unknown> | null;
      const completed = prefs?.form_tour_completed === true;
      
      if (completed) {
        localStorage.setItem(`${FORM_TOUR_KEY}-${uid}`, 'true');
      }
      
      return completed;
    } catch (error) {
      debug.error('Error in checkTourCompletionStatus:', error);
      return false;
    }
  };

  // Load tour status on auth change
  useEffect(() => {
    const loadTourStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        const completed = await checkTourCompletionStatus(user.id);
        setTourCompleted(completed);
        setIsReady(true);
      } else {
        setUserId(null);
        setTourCompleted(false);
        setIsReady(true);
      }
    };

    loadTourStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        const completed = await checkTourCompletionStatus(session.user.id);
        setTourCompleted(completed);
      } else {
        setUserId(null);
        setTourCompleted(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-show tour when on form dashboard and not completed
  useEffect(() => {
    if (!isReady || !userId) return;

    if (isOnFormDashboard && !tourCompleted) {
      // Small delay to ensure page is rendered
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowTour(false);
    }
  }, [isReady, userId, isOnFormDashboard, tourCompleted]);

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
