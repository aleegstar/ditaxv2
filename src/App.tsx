import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { App as CapacitorApp } from '@capacitor/app';

import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/Admin";
import UserTaxReturns from "./pages/UserTaxReturns";
import Chat from "./pages/Chat";
import UserDetail from "./pages/UserDetail";
import Auth from "./pages/Auth";
import GoogleAuth from "./pages/GoogleAuth";
import AppleAuth from "./pages/AppleAuth";
import WebAuthnAuth from "./pages/WebAuthnAuth";
import AuthSuccess from "./pages/AuthSuccess";
import NativeCallback from "./pages/NativeCallback";
import MfaVerify from "./pages/MfaVerify";

import AuthBridge from "./pages/AuthBridge";
import Profile from "./pages/Profile";
import PaymentSuccess from "./pages/PaymentSuccess";
import PriceCalculator from "./pages/PriceCalculator";
import Help from "./pages/Help";
import Feedback from "./pages/Feedback";
import Roadmap from "./pages/Roadmap";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import AcceptableUse from "./pages/AcceptableUse";
import PrivacySettings from "./pages/PrivacySettings";
import Index from "./pages/Index";
import PaymentPage from "./pages/Payment";
import DocumentUploadPage from "./pages/DocumentUploadPage";
import Documents from "./pages/Documents";
import DocumentsUpload from "./pages/DocumentsUpload";
import Tickets from "./pages/Tickets";
import Welcome from "./pages/Welcome";
import { SidebarProvider } from "@/contexts/SidebarContext";
import CreateTicket from "./pages/CreateTicket";
import { MobileMenuSheet } from "@/components/ui/modern-mobile-menu";
import { useSidebar } from "@/contexts/SidebarContext";
import { OnboardingTour } from "@/components/OnboardingTour";
import { OnboardingTourProvider, useOnboardingTour } from "@/contexts/OnboardingTourContext";
import { DocumentsTourProvider } from "@/contexts/DocumentsTourContext";



import { I18nProvider } from "@/contexts/I18nContext";
import AdminRouteGuard from "@/components/guards/AdminRouteGuard";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NativeErrorMonitor } from "@/utils/nativeErrorMonitor";
import { androidDebug } from "@/utils/androidDebug";
import { Capacitor } from '@capacitor/core';
import AndroidDebug from "./pages/AndroidDebug";
import FloatingDebugButton from "@/components/debug/FloatingDebugButton";
import TaxReturnTracking from "./pages/TaxReturnTracking";
import TaxReturnActions from "./pages/TaxReturnActions";
import { useFontLoader } from "@/hooks/useFontLoader";
import { useAuthValidation } from "@/hooks/use-auth-validation";
import SpaRedirector from "@/components/SpaRedirector";
import { MfaSetupPrompt } from "@/components/auth/MfaSetupPrompt";
import { MfaEnrollmentFlow } from "@/components/auth/MfaEnrollmentFlow";
import { useMfaPrompt } from "@/hooks/useMfaPrompt";
import { setStatusBarDark } from "@/utils/despiaStatusBar";
import { isDespiaEnvironment } from "@/utils/platform";

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
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { idleState, extendSession } = useAuthValidation();
  const [user, setUser] = useState<any>(null);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const { shouldShow: shouldShowMfaPrompt, markMfaOffered } = useMfaPrompt(user?.id);

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

  const handleMfaSetupStart = async () => {
    await markMfaOffered();
    setShowMfaSetup(true);
  };

  if (isAdminRoute) {
    return (
      <ErrorBoundary>
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
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <OnboardingTourProvider>
        <DocumentsTourProvider>
          <SidebarProvider>
          <div className="min-h-screen w-full bg-background flex flex-col">
              <Routes>
                <Route path="/" element={<UserTaxReturns />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/form" element={<Index />} />
                <Route path="/form/documents/upload/:itemId" element={<DocumentUploadPage />} />
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
                <Route path="/payment" element={<PaymentPage />} />
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
                <Route path="/chat" element={<Chat />} />
                <Route path="/help" element={<Help />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/roadmap" element={<Roadmap />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/acceptable-use" element={<AcceptableUse />} />
                    <Route path="/privacy-settings" element={<PrivacySettings />} />
                    <Route path="/debug" element={<AndroidDebug />} />
                    
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
              
            </div>
          
          {/* Global Onboarding Tour - rendered only once at the top level */}
          <OnboardingTourGlobal />
          
          {/* Global Mobile Menu Sheet - single instance for entire app */}
          <GlobalMobileMenuSheet />
          
        </SidebarProvider>
      </DocumentsTourProvider>
      </OnboardingTourProvider>
    </ErrorBoundary>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Apply Plus Jakarta Sans font
  useFontLoader();

  // Initialize native error monitoring for Android
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      NativeErrorMonitor.init();
      androidDebug.log('App initialized with native error monitoring');
    }
    
    // Set default dark status bar for Despia environment
    if (isDespiaEnvironment()) {
      setStatusBarDark();
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Handle OAuth success signal from Despia deeplink (success=true)
    const handleOAuthSuccessSignal = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success') === 'true') {
        console.log('🔐 App.tsx: OAuth success signal detected from deeplink');
        
        // Short delay to ensure session storage is synced from Chrome Custom Tab
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh session - it was already set in NativeCallback
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ App.tsx: Session refresh error:', error);
        } else if (session) {
          console.log('✅ App.tsx: Session found after OAuth success');
          if (mounted) {
            setIsAuthenticated(true);
            setIsLoading(false);
          }
        } else {
          console.warn('⚠️ App.tsx: No session found after OAuth success signal');
        }
        
        // Clean URL (remove success parameter)
        window.history.replaceState({}, '', window.location.pathname);
        return true; // Signal was handled
      }
      return false;
    };

    // Prüfe ob Tokens in der URL sind (Deep Link von AuthSuccess)
    const handleUrlTokens = async () => {
      const url = new URL(window.location.href);
      const accessToken = url.searchParams.get('at');
      const refreshToken = url.searchParams.get('rt');
      
      if (accessToken && refreshToken) {
        console.log('🔐 App.tsx: Tokens in URL gefunden - setze Session...');
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: decodeURIComponent(accessToken),
            refresh_token: decodeURIComponent(refreshToken)
          });
          
          if (error) {
            console.error('❌ App.tsx: Session error:', error);
          } else {
            console.log('✅ App.tsx: Session erfolgreich gesetzt');
            // URL bereinigen (Tokens entfernen)
            window.history.replaceState({}, '', '/');
          }
        } catch (err) {
          console.error('❌ App.tsx: Token handling error:', err);
        }
      }
    };

    // First check for OAuth success signal, then handle URL tokens
    const initAuth = async () => {
      const wasOAuthSuccess = await handleOAuthSuccessSignal();
      if (!wasOAuthSuccess) {
        await handleUrlTokens();
      }
    };
    
    initAuth();

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (mounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
          return;
        }

        const isLoggedIn = !!session?.user;
        
        if (mounted) {
          setIsAuthenticated(isLoggedIn);
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        const isLoggedIn = !!session?.user;
        setIsAuthenticated(isLoggedIn);
        setIsLoading(false);
      }
    );

    // Set up app URL listener for deep links (Capacitor native only)
    const setupAppUrlListener = async () => {
      try {
        await CapacitorApp.addListener('appUrlOpen', async (event) => {
          if (!mounted) return;
          
          console.log('🔗 Deep link URL:', event.url);
          
          let url: URL;
          try {
            url = new URL(event.url);
          } catch {
            console.error('Invalid URL:', event.url);
            return;
          }
          
          // Handle tokens in query params (from AuthSuccess Deep Link)
          const accessToken = url.searchParams.get('at');
          const refreshToken = url.searchParams.get('rt');
          
          if (accessToken && refreshToken) {
            console.log('🔐 App.tsx: Setting session from deep link tokens...');
            
            try {
              const { error } = await supabase.auth.setSession({
                access_token: decodeURIComponent(accessToken),
                refresh_token: decodeURIComponent(refreshToken)
              });
              
              if (error) {
                console.error('❌ App.tsx: Session error:', error);
              } else {
                console.log('✅ App.tsx: Session set successfully');
              }
              
              // Close browser tab if open
              const { Browser } = await import('@capacitor/browser');
              try {
                await Browser.close();
              } catch (e) {
                console.log('Browser.close() not available');
              }
              
              // Navigate to home
              window.location.href = '/';
            } catch (err) {
              console.error('❌ App.tsx: Deep link error:', err);
            }
          }
        });
      } catch (error) {
        console.log('Capacitor not available, skipping app URL listener');
      }
    };

    setupAppUrlListener();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return null;
  }

  const handleAppError = (error: Error, errorInfo: any) => {
    if (Capacitor.getPlatform() === 'android') {
      androidDebug.criticalError('App ErrorBoundary triggered', { error: error.message, errorInfo, stack: error.stack });
      
      // Auto-navigate to debug page on Android for critical errors
      setTimeout(() => {
        window.location.href = '/debug';
      }, 1000);
    }
  };

  return (
    <ErrorBoundary onError={handleAppError}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <TooltipProvider>
            <BrowserRouter>
              <SpaRedirector />
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
                
                {/* Public legal pages - accessible without authentication */}
                <Route path="/datenschutzrichtlinie" element={<Privacy />} />
                <Route path="/agb" element={<Terms />} />
                <Route path="/cookie-richtlinie" element={<Cookies />} />
          <Route path="/impressum" element={<AcceptableUse />} />
          <Route path="/nutzungsbedingungen" element={<Terms />} />
                
                <Route
                  path="/*"
                  element={
                    isAuthenticated ? (
                      <AuthenticatedApp />
                    ) : (
                      <Navigate to="/auth" replace />
                    )
                  }
                />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
