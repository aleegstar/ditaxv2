import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { App as CapacitorApp } from '@capacitor/app';

// Lazy-loaded page components for code splitting
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminPanel = lazy(() => import("./pages/Admin"));
const UserTaxReturns = lazy(() => import("./pages/UserTaxReturns"));
const Chat = lazy(() => import("./pages/Chat"));
const UserDetail = lazy(() => import("./pages/UserDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const GoogleAuth = lazy(() => import("./pages/GoogleAuth"));
const AppleAuth = lazy(() => import("./pages/AppleAuth"));
const WebAuthnAuth = lazy(() => import("./pages/WebAuthnAuth"));
const AuthSuccess = lazy(() => import("./pages/AuthSuccess"));
const NativeCallback = lazy(() => import("./pages/NativeCallback"));
const MfaVerify = lazy(() => import("./pages/MfaVerify"));
const AuthBridge = lazy(() => import("./pages/AuthBridge"));
const Profile = lazy(() => import("./pages/Profile"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PriceCalculator = lazy(() => import("./pages/PriceCalculator"));
const Help = lazy(() => import("./pages/Help"));
const Feedback = lazy(() => import("./pages/Feedback"));

const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const AcceptableUse = lazy(() => import("./pages/AcceptableUse"));
const Impressum = lazy(() => import("./pages/Impressum"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const Index = lazy(() => import("./pages/Index"));
const PaymentPage = lazy(() => import("./pages/Payment"));
const DocumentUploadPage = lazy(() => import("./pages/DocumentUploadPage"));
const Documents = lazy(() => import("./pages/Documents"));
const DocumentsUpload = lazy(() => import("./pages/DocumentsUpload"));
const Tickets = lazy(() => import("./pages/Tickets"));
const MissingItems = lazy(() => import("./pages/MissingItems"));
const Welcome = lazy(() => import("./pages/Welcome"));
const InviteFriends = lazy(() => import("./pages/InviteFriends"));
const CreateTicket = lazy(() => import("./pages/CreateTicket"));
const AndroidDebug = lazy(() => import("./pages/AndroidDebug"));
const TaxReturnTracking = lazy(() => import("./pages/TaxReturnTracking"));
const TaxReturnActions = lazy(() => import("./pages/TaxReturnActions"));
const TaxFilers = lazy(() => import("./pages/TaxFilers"));
const SelectPerson = lazy(() => import("./pages/SelectPerson"));
const Invoices = lazy(() => import("./pages/Invoices"));

// Non-lazy imports for essential app shell components
import { SidebarProvider } from "@/contexts/SidebarContext";
import { MobileMenuSheet } from "@/components/ui/modern-mobile-menu";
import { useSidebar } from "@/contexts/SidebarContext";
import { OnboardingTour } from "@/components/OnboardingTour";
import { OnboardingTourProvider, useOnboardingTour } from "@/contexts/OnboardingTourContext";
import { DocumentsTourProvider } from "@/contexts/DocumentsTourContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { TaxFilerProvider } from "@/contexts/TaxFilerContext";
import AdminRouteGuard from "@/components/guards/AdminRouteGuard";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NativeErrorMonitor } from "@/utils/nativeErrorMonitor";
import { androidDebug } from "@/utils/androidDebug";
import { Capacitor } from '@capacitor/core';
import FloatingDebugButton from "@/components/debug/FloatingDebugButton";
import { useFontLoader } from "@/hooks/useFontLoader";
import { useAuthValidation } from "@/hooks/use-auth-validation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SpaRedirector from "@/components/SpaRedirector";
import { MfaSetupPrompt } from "@/components/auth/MfaSetupPrompt";
import { MfaEnrollmentFlow } from "@/components/auth/MfaEnrollmentFlow";
import { useMfaPrompt } from "@/hooks/useMfaPrompt";
import { useFeedbackPrompt } from "@/hooks/useFeedbackPrompt";
import { FeedbackPrompt } from "@/components/feedback/FeedbackPrompt";
import { setStatusBarDark } from "@/utils/despiaStatusBar";
import { isDespiaEnvironment } from "@/utils/platform";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import TaxFilerGate from "@/components/guards/TaxFilerGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Global tour component that only renders within OnboardingTourProvider
const OnboardingTourGlobal = () => {
  const { showTour, completeTour, skipTour } = useOnboardingTour();
  
  return showTour ? (
    <OnboardingTour 
      onComplete={completeTour}
      onSkip={skipTour}
    />
  ) : null;
};

// Central MobileMenuSheet that uses SidebarContext
const GlobalMobileMenuSheet = () => {
  const { menuSheetOpen, setMenuSheetOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <MobileMenuSheet
      isOpen={menuSheetOpen}
      onOpenChange={setMenuSheetOpen}
      navigate={navigate}
      location={location}
    />
  );
};

const AuthenticatedApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { idleState, extendSession } = useAuthValidation();
  const [user, setUser] = useState<any>(null);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [initialPathChecked, setInitialPathChecked] = useState<string | null>(null);
  const { shouldShow: shouldShowMfaPrompt, markMfaOffered } = useMfaPrompt(user?.id);
  const { shouldShow: shouldShowFeedback, dismissPrompt: dismissFeedbackPrompt } = useFeedbackPrompt(user?.id);

  useEffect(() => {
    let mounted = true;
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getUser();
    return () => { mounted = false; };
  }, []);

  // Check if user needs onboarding (new user without first_name)
  useEffect(() => {
    if (!user?.id) return;
    
    // Only run check once per session
    if (onboardingChecked) return;
    
    // Skip check if already on welcome page or auth pages - no redirect needed
    const currentPath = location.pathname;
    if (currentPath === '/welcome' || currentPath.startsWith('/auth')) {
      setOnboardingChecked(true);
      return;
    }
    
    const checkOnboarding = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_tour_completed, first_name')
          .eq('id', user.id)
          .single();
        
        // New user: no first_name and onboarding not completed
        if (profile && !profile.onboarding_tour_completed && !profile.first_name) {
          setNeedsOnboarding(true);
          setInitialPathChecked(currentPath);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setOnboardingChecked(true);
      }
    };
    
    checkOnboarding();
  }, [user?.id, onboardingChecked]);

  // Redirect to welcome if needed
  useEffect(() => {
    if (onboardingChecked && needsOnboarding && initialPathChecked && location.pathname !== '/welcome') {
      navigate('/welcome', { replace: true });
      // Reset after redirect to prevent future redirects
      setNeedsOnboarding(false);
    }
  }, [onboardingChecked, needsOnboarding, initialPathChecked, location.pathname, navigate]);

  const handleMfaSetupStart = async () => {
    await markMfaOffered();
    setShowMfaSetup(true);
  };

  if (isAdminRoute) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <div className="h-screen w-full">
            <Routes>
              <Route 
                path="/admin/*" 
                element={
                  <AdminRouteGuard>
                    <AdminPanel />
                  </AdminRouteGuard>
                } 
              />
              <Route 
                path="/admin/user/:id" 
                element={
                  <AdminRouteGuard>
                    <UserDetail />
                  </AdminRouteGuard>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Show loading while checking onboarding status or while redirect is pending (prevents flash of "Benutzer")
  if (!onboardingChecked || needsOnboarding) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ErrorBoundary>
      <TaxFilerProvider>
        <OnboardingTourProvider>
          <DocumentsTourProvider>
            <SidebarProvider>
            <div className="min-h-screen w-full bg-background flex flex-col">
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <TaxFilerGate>
              <Routes>
                <Route path="/" element={<ProtectedRoute><UserTaxReturns /></ProtectedRoute>} />
                <Route path="/select-person" element={<ProtectedRoute><SelectPerson /></ProtectedRoute>} />
                <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
                <Route path="/form" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/form/documents/upload/:itemId" element={<ProtectedRoute><DocumentUploadPage /></ProtectedRoute>} />
                <Route path="/documents" element={
                  <ProtectedRoute>
                    <Documents />
                  </ProtectedRoute>
                } />
                <Route path="/documents/upload" element={
                  <ProtectedRoute>
                    <DocumentsUpload />
                  </ProtectedRoute>
                } />
                <Route path="/tickets" element={
                  <ProtectedRoute>
                    <Tickets />
                  </ProtectedRoute>
                } />
                <Route path="/create-ticket/:completedTaxReturnId/:taxYear" element={
                  <ProtectedRoute>
                    <CreateTicket />
                  </ProtectedRoute>
                } />
                <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/tax-return-tracking/:id" element={
                  <ProtectedRoute>
                    <TaxReturnTracking />
                  </ProtectedRoute>
                } />
                <Route path="/tax-return-actions/:completedTaxReturnId" element={
                  <ProtectedRoute>
                    <TaxReturnActions />
                  </ProtectedRoute>
                } />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/missing-items" element={
                  <ProtectedRoute>
                    <MissingItems />
                  </ProtectedRoute>
                } />
                <Route path="/invite-friends" element={
                  <ProtectedRoute>
                    <InviteFriends />
                  </ProtectedRoute>
                } />
                <Route path="/help" element={<Help />} />
                <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
                
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/acceptable-use" element={<AcceptableUse />} />
                <Route path="/privacy-settings" element={<PrivacySettings />} />
                <Route path="/debug" element={<AndroidDebug />} />
                <Route path="/tax-filers" element={
                  <ProtectedRoute>
                    <TaxFilers />
                  </ProtectedRoute>
                } />
                
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              </TaxFilerGate>
            </Suspense>
              
              {/* Floating Debug Button for Android */}
              <FloatingDebugButton />

              {/* MFA Setup Prompt */}
              {shouldShowMfaPrompt && user && (
                <MfaSetupPrompt
                  userId={user.id}
                  onSetupNow={handleMfaSetupStart}
                  onClose={() => {}}
                />
              )}

              {/* MFA Enrollment Flow */}
              {showMfaSetup && (
                <MfaEnrollmentFlow
                  onComplete={() => setShowMfaSetup(false)}
                  onCancel={() => setShowMfaSetup(false)}
                />
              )}

              {/* Feedback Prompt - shows after 5th login */}
              {shouldShowFeedback && !shouldShowMfaPrompt && (
                <FeedbackPrompt
                  isOpen={shouldShowFeedback}
                  onDismiss={dismissFeedbackPrompt}
                />
              )}
              
            </div>
          
          {/* Global Onboarding Tour - rendered only once at the top level */}
          <OnboardingTourGlobal />
          
          {/* Global Mobile Menu Sheet - single instance for entire app */}
          <GlobalMobileMenuSheet />
          
          </SidebarProvider>
        </DocumentsTourProvider>
        </OnboardingTourProvider>
      </TaxFilerProvider>
    </ErrorBoundary>
  );
};

/**
 * Inner component that handles OAuth/deeplink token handling and routing.
 * Auth state comes from AuthContext (single source of truth).
 */
const AppRoutes = () => {
  const { isValid, isLoading: authLoading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      // Handle OAuth success signal from Despia deeplink
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true') {
        console.log('🔐 App: OAuth success signal detected');
        await new Promise(resolve => setTimeout(resolve, 500));
        await supabase.auth.getSession();
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Handle URL tokens (at/rt)
      const url = new URL(window.location.href);
      const accessToken = url.searchParams.get('at');
      const refreshToken = url.searchParams.get('rt');
      if (accessToken && refreshToken) {
        console.log('🔐 App: Tokens in URL — setting session...');
        try {
          const { error } = await supabase.auth.setSession({
            access_token: decodeURIComponent(accessToken),
            refresh_token: decodeURIComponent(refreshToken),
          });
          if (error) console.error('❌ Session error:', error);
          else window.history.replaceState({}, '', '/');
        } catch (err) {
          console.error('❌ Token handling error:', err);
        }
      }

      // Handle payment-success params (Despia ignores deeplink path)
      const sessionId = url.searchParams.get('session_id');
      const taxYear = url.searchParams.get('tax_year');
      if (sessionId && taxYear && !window.location.pathname.includes('payment-success')) {
        console.log('💳 Payment params detected on root — redirecting to /payment-success');
        const taxReturnId = url.searchParams.get('tax_return_id') || '';
        const params = new URLSearchParams({ session_id: sessionId, tax_year: taxYear });
        if (taxReturnId) params.set('tax_return_id', taxReturnId);
        window.location.href = `/payment-success?${params.toString()}`;
        return; // Stop further initialization
      }

      if (mounted) setIsInitialized(true);
    };

    initialize();

    // Deep link listener (Capacitor native)
    const setupAppUrlListener = async () => {
      try {
        await CapacitorApp.addListener('appUrlOpen', async (event) => {
          if (!mounted) return;
          console.log('🔗 Deep link URL:', event.url);

          let url: URL;
          try { url = new URL(event.url); } catch { return; }

          // Handle payment success deep links
          if (url.pathname.includes('payment-success') || url.href.includes('payment-success')) {
            console.log('💳 Payment success deep link detected');
            const { Browser } = await import('@capacitor/browser');
            try { await Browser.close(); } catch {}
            const searchParams = url.searchParams.toString();
            window.location.href = `/payment-success${searchParams ? '?' + searchParams : ''}`;
            return;
          }

          const at = url.searchParams.get('at');
          const rt = url.searchParams.get('rt');
          if (at && rt) {
            try {
              const { error } = await supabase.auth.setSession({
                access_token: decodeURIComponent(at),
                refresh_token: decodeURIComponent(rt),
              });
              if (error) console.error('❌ Session error:', error);
              const { Browser } = await import('@capacitor/browser');
              try { await Browser.close(); } catch {}
              window.location.href = '/';
            } catch (err) {
              console.error('❌ Deep link error:', err);
            }
          }
        });
      } catch {
        // Capacitor not available
      }
    };
    setupAppUrlListener();

    return () => { mounted = false; };
  }, []);

  // Wait for both init + auth context
  if (!isInitialized || authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  const handleAppError = (error: Error, errorInfo: any) => {
    if (Capacitor.getPlatform() === 'android') {
      androidDebug.criticalError('App ErrorBoundary triggered', { error: error.message, errorInfo, stack: error.stack });
      setTimeout(() => { window.location.href = '/debug'; }, 1000);
    }
  };

  return (
    <ErrorBoundary onError={handleAppError}>
      <SpaRedirector />
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/preisrechner" element={<PriceCalculator />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/google-auth" element={<GoogleAuth />} />
          <Route path="/apple-auth" element={<AppleAuth />} />
          <Route path="/webauthn-auth" element={<WebAuthnAuth />} />
          <Route path="/mfa-verify" element={<MfaVerify />} />
          <Route path="/auth-success" element={<AuthSuccess />} />
          <Route path="/native-callback" element={<NativeCallback />} />
          <Route path="/native-callback/:deeplinkScheme" element={<NativeCallback />} />
          <Route path="/native-callback/:deeplinkScheme/*" element={<NativeCallback />} />
          
          <Route path="/auth-bridge" element={<AuthBridge />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          
          {/* Public legal pages */}
          <Route path="/datenschutzrichtlinie" element={<Privacy />} />
          <Route path="/agb" element={<Terms />} />
          <Route path="/cookie-richtlinie" element={<Cookies />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/nutzungsbedingungen" element={<Terms />} />
          
          <Route
            path="/*"
            element={
              isValid ? (
                <AuthenticatedApp />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const App = () => {
  useFontLoader();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      NativeErrorMonitor.init();
      androidDebug.log('App initialized with native error monitoring');
    }
    if (isDespiaEnvironment()) {
      setStatusBarDark();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

export default App;
