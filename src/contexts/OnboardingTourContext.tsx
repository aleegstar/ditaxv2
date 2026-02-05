import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { debug } from '@/utils/debug';

interface OnboardingTourContextType {
  showTour: boolean;
  isReady: boolean;
  tourCompleted: boolean;
  completeTour: () => Promise<void>;
  skipTour: () => Promise<void>;
  forceTour: () => Promise<void>;
}

const OnboardingTourContext = createContext<OnboardingTourContextType | undefined>(undefined);

export const OnboardingTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showTour, setShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tourCompleted, setTourCompleted] = useState<boolean | null>(null);
  const [isManualStart, setIsManualStart] = useState(false);
  const { isValid, userId, isLoading } = useAuthValidation();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Check tour completion status in database
  const checkTourCompletionStatus = async (userId: string): Promise<boolean> => {
    try {
      debug.log('🎯 Tour: Checking database for tour completion status...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_tour_completed')
        .eq('id', userId)
        .single();

      if (error) {
        debug.error('❌ Tour: Error checking tour completion:', error);
        // Fallback to localStorage
        const localTourCompleted = localStorage.getItem('onboarding-tour-completed');
        return !!localTourCompleted;
      }

      const completed = data?.onboarding_tour_completed || false;
      debug.log(`🎯 Tour: Database tour status for user ${userId}:`, completed);
      
      // Sync with localStorage for backup
      if (completed) {
        localStorage.setItem('onboarding-tour-completed', 'true');
      }
      
      return completed;
    } catch (error) {
      debug.error('❌ Tour: Exception checking tour completion:', error);
      // Fallback to localStorage
      const localTourCompleted = localStorage.getItem('onboarding-tour-completed');
      return !!localTourCompleted;
    }
  };

  // Enhanced waitForElements with shorter timeout for manual starts
  const waitForElements = async (isManualStart = false): Promise<boolean> => {
    const requiredSelectors = isMobile ? [
      '[data-bottom-navbar]', // Bottom navigation (mandatory)
    ] : [
      '[data-sidebar-nav]', // Desktop sidebar navigation (mandatory)
    ];

    // Optional selectors - continue card may not always be present
    const optionalSelectors = [
      '[data-continue-card], .continue-tax-card, .tax-year-card, [data-tax-year-card]'
    ];

    // Alternative selectors as fallback
    const alternativeSelectors = isMobile ? [
      '.modern-bottom-navbar', // Alternative bottom nav
    ] : [
      '.sidebar, nav[data-sidebar]', // Alternative sidebar
    ];

    const maxAttempts = isManualStart ? 4 : 30; // Shorter timeout for manual starts (2 seconds vs 15 seconds)
    let attempts = 0;

    while (attempts < maxAttempts) {
      debug.log(`🎯 Tour: Checking for elements (attempt ${attempts + 1}/${maxAttempts}), manual: ${isManualStart}`);
      
      let mandatoryFound = true;
      let foundSelectors: string[] = [];
      
      // Check mandatory selectors first
      for (const selector of requiredSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
          debug.log(`❌ Tour: Missing mandatory element: ${selector}`);
          mandatoryFound = false;
          break;
        } else {
          debug.log(`✅ Tour: Found mandatory element: ${selector} (${elements.length} elements)`);
          foundSelectors.push(selector);
        }
      }

      // If mandatory selectors failed, try alternatives
      if (!mandatoryFound && attempts > (isManualStart ? 1 : 10)) {
        debug.log('🎯 Tour: Trying alternative mandatory selectors...');
        mandatoryFound = true;
        foundSelectors = [];
        
        for (const selector of alternativeSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length === 0) {
            debug.log(`❌ Tour: Missing alternative mandatory element: ${selector}`);
            mandatoryFound = false;
            break;
          } else {
            debug.log(`✅ Tour: Found alternative mandatory element: ${selector} (${elements.length} elements)`);
            foundSelectors.push(selector);
          }
        }
      }

      // Check optional selectors (continue card) but don't fail if missing
      if (mandatoryFound) {
        for (const selector of optionalSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            debug.log(`✅ Tour: Found optional element: ${selector} (${elements.length} elements)`);
            foundSelectors.push(selector);
          } else {
            debug.log(`⚠️ Tour: Optional element missing (OK): ${selector}`);
          }
        }
      }

      if (mandatoryFound) {
        debug.log('🎉 Tour: All required elements found!', foundSelectors);
        return true;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    debug.warn('⚠️ Tour: Timeout waiting for mandatory elements. DOM state:', {
      bottomNavbar: !!document.querySelector('[data-bottom-navbar]'),
      sidebar: !!document.querySelector('[data-sidebar-nav]'),
      continueCard: !!document.querySelector('[data-continue-card]'),
      taxYearCard: !!document.querySelector('.tax-year-card'),
    });
    
    // For manual starts, be more lenient and start anyway
    if (isManualStart) {
      debug.log('🎯 Tour: Manual start - proceeding with graceful degradation');
      return true;
    }
    
    // Allow tour to proceed even if elements are missing (graceful degradation)
    return true;
  };

  // Load tour completion status when user is authenticated
  useEffect(() => {
    const loadTourStatus = async () => {
      if (!isValid || !userId || isLoading) {
        return;
      }

      debug.log('🎯 Tour: Loading tour completion status for user:', userId);
      const completed = await checkTourCompletionStatus(userId);
      setTourCompleted(completed);
    };

    loadTourStatus();
  }, [isValid, userId, isLoading]);

  // Check if tour should be shown automatically
  useEffect(() => {
    const checkTourConditions = async () => {
      // Skip auto-check if manual start is in progress (prevents race condition)
      if (isManualStart) {
        debug.log('🎯 Tour: Manual start active, skipping auto-check');
        return;
      }

      debug.log('🎯 Tour: Checking automatic tour conditions...', {
        isValid,
        userId,
        isLoading,
        tourCompleted,
        pathname: location.pathname
      });

      // Don't show tour if not authenticated or still loading
      if (!isValid || !userId || isLoading) {
        debug.log('❌ Tour: Not authenticated or still loading');
        return;
      }

      // Wait for tour completion status to load
      if (tourCompleted === null) {
        debug.log('🎯 Tour: Waiting for tour completion status to load...');
        return;
      }

      // Don't show on auth pages or form pages
      if (location.pathname === '/auth' || location.pathname.startsWith('/form')) {
        debug.log('❌ Tour: On auth or form page, skipping tour');
        return;
      }

      // Only show on dashboard page
      if (location.pathname !== '/') {
        debug.log('❌ Tour: Not on dashboard page, skipping tour');
        return;
      }

      // Check if tour was already completed
      if (tourCompleted) {
        debug.log('❌ Tour: Already completed');
        return;
      }

      debug.log('✅ Tour: Conditions met, waiting for elements...');

      // Wait for elements to be available
      const elementsReady = await waitForElements(false);
      
      if (elementsReady) {
        debug.log('🎉 Tour: Starting automatic tour!');
        setIsReady(true);
        setShowTour(true);
      } else {
        debug.warn('⚠️ Tour: Elements not ready, but starting tour anyway (graceful degradation)');
        setIsReady(true);
        setShowTour(true);
      }
    };

    // Add delay to ensure page is fully loaded
    const timer = setTimeout(checkTourConditions, 2000);

    return () => clearTimeout(timer);
  }, [isValid, userId, isLoading, location.pathname, tourCompleted, isManualStart]);

  const completeTour = async () => {
    debug.log('✅ Tour: Completed');
    
    if (userId) {
      try {
        // Update database
        const { error } = await supabase
          .from('profiles')
          .update({ 
            onboarding_tour_completed: true,
            onboarding_tour_completed_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          debug.error('❌ Tour: Error updating tour completion in database:', error);
        } else {
          debug.log('✅ Tour: Successfully updated tour completion in database');
        }
      } catch (error) {
        debug.error('❌ Tour: Exception updating tour completion:', error);
      }
    }
    
    // Update local state and localStorage as backup
    localStorage.setItem('onboarding-tour-completed', 'true');
    setTourCompleted(true);
    setShowTour(false);
    setIsReady(false);
  };

  const skipTour = async () => {
    debug.log('⏭️ Tour: Skipped');
    
    if (userId) {
      try {
        // Update database
        const { error } = await supabase
          .from('profiles')
          .update({ 
            onboarding_tour_completed: true,
            onboarding_tour_completed_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          debug.error('❌ Tour: Error updating tour skip in database:', error);
        } else {
          debug.log('✅ Tour: Successfully updated tour skip in database');
        }
      } catch (error) {
        debug.error('❌ Tour: Exception updating tour skip:', error);
      }
    }
    
    // Update local state and localStorage as backup
    localStorage.setItem('onboarding-tour-completed', 'true');
    setTourCompleted(true);
    setShowTour(false);
    setIsReady(false);
  };

  // Force show tour (for manual starts)
  const forceTour = async () => {
    debug.log('🔄 Tour: Force restart requested');

    // Set manual start flag FIRST to prevent auto-start effect from triggering
    setIsManualStart(true);

    if (userId) {
      try {
        // Reset database status
        const { error } = await supabase
          .from('profiles')
          .update({ 
            onboarding_tour_completed: false,
            onboarding_tour_completed_at: null
          })
          .eq('id', userId);

        if (error) {
          debug.error('❌ Tour: Error resetting tour in database:', error);
        } else {
          debug.log('✅ Tour: Successfully reset tour in database');
        }
      } catch (error) {
        debug.error('❌ Tour: Exception resetting tour:', error);
      }
    }
    
    // Reset local state
    localStorage.removeItem('onboarding-tour-completed');
    setTourCompleted(false);
    setIsReady(false);
    setShowTour(false);
    
    // Optimized tour start for manual activation
    const startTour = async () => {
      const elementsReady = await waitForElements(true); // Mark as manual start
      debug.log('🎯 Tour: Force restart - elements ready:', elementsReady);
      
      setIsReady(true);
      setShowTour(true);
      // Reset manual start flag after tour is started
      setIsManualStart(false);
    };
    
    // Start immediately
    startTour();
  };

  return (
    <OnboardingTourContext.Provider 
      value={{
        showTour: showTour && isReady,
        isReady,
        tourCompleted: tourCompleted ?? false,
        completeTour,
        skipTour,
        forceTour
      }}
    >
      {children}
    </OnboardingTourContext.Provider>
  );
};

export const useOnboardingTour = () => {
  const context = useContext(OnboardingTourContext);
  if (context === undefined) {
    throw new Error('useOnboardingTour must be used within an OnboardingTourProvider');
  }
  return context;
};