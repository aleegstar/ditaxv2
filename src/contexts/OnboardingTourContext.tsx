import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

// System routes that represent automatic redirects, not manual user navigation
const SYSTEM_ROUTES = ['/welcome', '/auth', '/select-person'];

export const OnboardingTourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showTour, setShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tourCompleted, setTourCompleted] = useState<boolean | null>(null);
  const [isManualStart, setIsManualStart] = useState(false);
  const { isValid, userId, isLoading } = useAuthValidation();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Always reflects the CURRENT path — avoids closure issues in setTimeout
  const currentPathRef = useRef(location.pathname);

  // Tracks the first route seen in this session
  const initialRouteRef = useRef<string | null>(null);

  // True only after the user has manually navigated away from '/' (non-system routes)
  const hasNavigatedRef = useRef(false);

  // Prevents the tour from being attempted more than once per session
  const tourStartAttemptedRef = useRef(false);

  // Keep currentPathRef always up to date
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  // Check tour completion status in user metadata
  const checkTourCompletionStatus = async (): Promise<boolean> => {
    try {
      debug.log('🎯 Tour: Checking user metadata for tour completion status...');

      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        debug.error('❌ Tour: Error getting user:', error);
        return false;
      }

      const completed = user.user_metadata?.onboarding_tour_completed === true;
      debug.log(`🎯 Tour: User metadata tour status:`, completed);

      return completed;
    } catch (error) {
      debug.error('❌ Tour: Exception checking tour completion:', error);
      return false;
    }
  };

  // Enhanced waitForElements with shorter timeout for manual starts
  const waitForElements = async (isManualStartMode = false): Promise<boolean> => {
    const requiredSelectors = isMobile ? [
      '[data-bottom-navbar]',
    ] : [
      '[data-sidebar-nav]',
    ];

    const optionalSelectors = [
      '[data-continue-card], .continue-tax-card, .tax-year-card, [data-tax-year-card]'
    ];

    const alternativeSelectors = isMobile ? [
      '.modern-bottom-navbar',
    ] : [
      '.sidebar, nav[data-sidebar]',
    ];

    const maxAttempts = isManualStartMode ? 4 : 15;
    let attempts = 0;

    while (attempts < maxAttempts) {
      debug.log(`🎯 Tour: Checking for elements (attempt ${attempts + 1}/${maxAttempts}), manual: ${isManualStartMode}`);

      let mandatoryFound = true;
      let foundSelectors: string[] = [];

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

      if (!mandatoryFound && attempts > (isManualStartMode ? 1 : 10)) {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    debug.warn('⚠️ Tour: Timeout waiting for mandatory elements. DOM state:', {
      bottomNavbar: !!document.querySelector('[data-bottom-navbar]'),
      sidebar: !!document.querySelector('[data-sidebar-nav]'),
      continueCard: !!document.querySelector('[data-continue-card]'),
      taxYearCard: !!document.querySelector('.tax-year-card'),
    });

    if (isManualStartMode) {
      debug.log('🎯 Tour: Manual start - proceeding with graceful degradation');
      return true;
    }

    return true;
  };

  // Load tour completion status when user is authenticated
  useEffect(() => {
    const loadTourStatus = async () => {
      if (!isValid || !userId || isLoading) {
        return;
      }

      debug.log('🎯 Tour: Loading tour completion status for user:', userId);
      const completed = await checkTourCompletionStatus();
      setTourCompleted(completed);
    };

    loadTourStatus();
  }, [isValid, userId, isLoading]);

  // Track navigation — only mark as "navigated" when moving between non-system routes
  useEffect(() => {
    if (initialRouteRef.current === null) {
      initialRouteRef.current = location.pathname;
      debug.log('🎯 Tour: Initial route set:', location.pathname);
    } else if (location.pathname !== initialRouteRef.current) {
      const fromSystemRoute = SYSTEM_ROUTES.some(r => initialRouteRef.current?.startsWith(r));
      const toSystemRoute = SYSTEM_ROUTES.some(r => location.pathname.startsWith(r));

      if (!fromSystemRoute && !toSystemRoute) {
        hasNavigatedRef.current = true;
        debug.log('🎯 Tour: User navigated manually (non-system route), tour will not auto-start:', {
          from: initialRouteRef.current,
          to: location.pathname,
        });
      } else {
        debug.log('🎯 Tour: System route transition, not marking as navigated:', {
          from: initialRouteRef.current,
          to: location.pathname,
        });
      }
    }
  }, [location.pathname]);

  // Check if tour should be shown automatically
  useEffect(() => {
    const checkTourConditions = async () => {
      // Skip auto-check if manual start is in progress
      if (isManualStart) {
        debug.log('🎯 Tour: Manual start active, skipping auto-check');
        return;
      }

      // Only ever attempt once per session (prevents race conditions from multiple timers)
      if (tourStartAttemptedRef.current) {
        debug.log('🎯 Tour: Already attempted this session, skipping');
        return;
      }

      // CRITICAL: Read the actual current path at execution time, not from closure
      const currentPath = currentPathRef.current;

      debug.log('🎯 Tour: Checking automatic tour conditions...', {
        isValid,
        userId,
        isLoading,
        tourCompleted,
        currentPath,
        hasNavigated: hasNavigatedRef.current,
        initialRoute: initialRouteRef.current,
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

      // Don't show on auth or form pages
      if (currentPath === '/auth' || currentPath.startsWith('/form')) {
        debug.log('❌ Tour: On auth or form page at execution time, skipping tour');
        return;
      }

      // Must be on dashboard
      if (currentPath !== '/') {
        debug.log('❌ Tour: Not on dashboard page at execution time, skipping tour:', currentPath);
        return;
      }

      // Don't start if user has manually navigated between non-system pages
      if (hasNavigatedRef.current) {
        debug.log('❌ Tour: User has manually navigated, skipping auto-start');
        return;
      }

      // Check if tour was already completed
      if (tourCompleted) {
        debug.log('❌ Tour: Already completed');
        return;
      }

      debug.log('✅ Tour: Conditions met, waiting for elements...');

      // Mark as attempted BEFORE async wait to prevent double-starts
      tourStartAttemptedRef.current = true;

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

    const timer = setTimeout(checkTourConditions, 800);

    return () => clearTimeout(timer);
  }, [isValid, userId, isLoading, tourCompleted, isManualStart]);

  const completeTour = async () => {
    debug.log('✅ Tour: Completed');

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarding_tour_completed: true,
          onboarding_tour_completed_at: new Date().toISOString()
        }
      });

      if (error) {
        debug.error('❌ Tour: Error updating tour completion in user metadata:', error);
      } else {
        debug.log('✅ Tour: Successfully updated tour completion in user metadata');
      }
    } catch (error) {
      debug.error('❌ Tour: Exception updating tour completion:', error);
    }

    setTourCompleted(true);
    setShowTour(false);
    setIsReady(false);
  };

  const skipTour = async () => {
    debug.log('⏭️ Tour: Skipped');

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarding_tour_completed: true,
          onboarding_tour_completed_at: new Date().toISOString()
        }
      });

      if (error) {
        debug.error('❌ Tour: Error updating tour skip in user metadata:', error);
      } else {
        debug.log('✅ Tour: Successfully updated tour skip in user metadata');
      }
    } catch (error) {
      debug.error('❌ Tour: Exception updating tour skip:', error);
    }

    setTourCompleted(true);
    setShowTour(false);
    setIsReady(false);
  };

  // Force show tour (for manual starts from settings etc.)
  const forceTour = async () => {
    debug.log('🔄 Tour: Force restart requested');

    setIsManualStart(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarding_tour_completed: false,
          onboarding_tour_completed_at: null
        }
      });

      if (error) {
        debug.error('❌ Tour: Error resetting tour in user metadata:', error);
      } else {
        debug.log('✅ Tour: Successfully reset tour in user metadata');
      }
    } catch (error) {
      debug.error('❌ Tour: Exception resetting tour:', error);
    }

    // Reset all guards so the forced tour can proceed
    tourStartAttemptedRef.current = false;
    hasNavigatedRef.current = false;

    setTourCompleted(false);
    setIsReady(false);
    setShowTour(false);

    const startTour = async () => {
      const elementsReady = await waitForElements(true);
      debug.log('🎯 Tour: Force restart - elements ready:', elementsReady);

      setIsReady(true);
      setShowTour(true);
      setIsManualStart(false);
    };

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
