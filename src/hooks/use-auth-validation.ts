
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useIdleTimer } from './use-idle-timer';
import { useI18n } from '@/contexts/I18nContext';

interface AuthState {
  userId: string | null;
  email: string | null;
  isValid: boolean;
  isLoading: boolean;
}

interface IdleState {
  showWarning: boolean;
  timeLeft: number;
}

export function useAuthValidation() {
  const [authState, setAuthState] = useState<AuthState>({
    userId: null,
    email: null,
    isValid: false,
    isLoading: true
  });
  
  const [idleState, setIdleState] = useState<IdleState>({
    showWarning: false,
    timeLeft: 0
  });
  
  const mountedRef = useRef(true);
  const authChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  const validateSession = useCallback(async (skipNavigation = false) => {
    try {
      console.log('🔍 Validating session...');
      
      // Add delay to reduce race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session validation error:', error);
        setAuthState({
          userId: null,
          email: null,
          isValid: false,
          isLoading: false
        });
        
        if (!skipNavigation) {
          toast({
            title: "Session-Fehler",
            description: "Ihre Sitzung ist ungültig. Bitte melden Sie sich erneut an.",
            variant: "destructive"
          });
          
          setTimeout(() => {
            navigate('/auth', { state: { from: window.location.pathname } });
          }, 1000);
        }
        
        return false;
      }

      if (!session || !session.user) {
        console.log('⚠️ No valid session found');
        setAuthState({
          userId: null,
          email: null,
          isValid: false,
          isLoading: false
        });
        
        if (!skipNavigation) {
          setTimeout(() => {
            navigate('/auth', { state: { from: window.location.pathname } });
          }, 500);
        }
        return false;
      }

      console.log('✅ Session validated successfully for user:', session.user.id);
      setAuthState({
        userId: session.user.id,
        email: session.user.email || null,
        isValid: true,
        isLoading: false
      });

      return true;
    } catch (error) {
      console.error('💥 Error validating session:', error);
      setAuthState({
        userId: null,
        email: null,
        isValid: false,
        isLoading: false
      });
      return false;
    }
  }, [navigate, toast]);

  const refreshAuth = useCallback(async () => {
    console.log('Refreshing authentication...');
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        throw error;
      }
      
      console.log('Session refreshed successfully');
      return await validateSession(true);
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      
      toast({
        title: t.auth.authFailed,
        description: t.auth.authFailedDescription,
        variant: "destructive"
      });
      
      navigate('/auth', { state: { from: window.location.pathname } });
      return false;
    }
  }, [validateSession, navigate, toast, t.auth]);

  const forceLogout = useCallback(async () => {
    console.log('Forcing logout due to inactivity...');
    try {
      await supabase.auth.signOut();
      setAuthState({
        userId: null,
        email: null,
        isValid: false,
        isLoading: false
      });
      
      toast({
        title: t.auth.autoLogout,
        description: t.auth.autoLogoutDescription,
        variant: "destructive"
      });
      
      navigate('/auth');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [navigate, toast, t.auth]);

  const handleIdleTimeout = useCallback(() => {
    console.log('Idle timeout reached, logging out silently');
    setIdleState({ showWarning: false, timeLeft: 0 });
    forceLogout();
  }, [forceLogout]);

  const extendSession = useCallback(() => {
    console.log('Session extended by user');
    setIdleState({ showWarning: false, timeLeft: 0 });
    toast({
      title: t.auth.sessionExtended,
      description: t.auth.sessionExtendedDescription,
    });
  }, [toast, t.auth]);

  // Set up idle timer for 30-minute auto-logout (no warning, direct logout)
  const { timeLeft, extendSession: extendIdleSession } = useIdleTimer({
    timeout: 30 * 60 * 1000, // 30 minutes
    onIdle: handleIdleTimeout,
  });

  // Update timeLeft in idle state
  useEffect(() => {
    if (idleState.showWarning) {
      setIdleState(prev => ({ ...prev, timeLeft }));
    }
  }, [timeLeft, idleState.showWarning]);

  const handleExtendSession = useCallback(() => {
    extendIdleSession();
    extendSession();
  }, [extendIdleSession, extendSession]);

  useEffect(() => {
    mountedRef.current = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      if (!mountedRef.current) return;
      
      try {
        // Set up auth listener first to catch any immediate changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mountedRef.current) return;
            
            // Debounce auth state changes to prevent rapid updates
            if (authChangeDebounceRef.current) {
              clearTimeout(authChangeDebounceRef.current);
            }
            
            authChangeDebounceRef.current = setTimeout(() => {
              if (!mountedRef.current) return;
              
              if (event === 'SIGNED_OUT' || !session) {
                setAuthState({
                  userId: null,
                  email: null,
                  isValid: false,
                  isLoading: false
                });
                setIdleState({ showWarning: false, timeLeft: 0 });
              } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || session) {
                setAuthState({
                  userId: session.user.id,
                  email: session.user.email || null,
                  isValid: true,
                  isLoading: false
                });
              }
            }, 100); // 100ms debounce
          }
        );
        
        authSubscription = subscription;
        
        // Add delay before checking session to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Then check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (mountedRef.current) {
          if (session && session.user) {
            setAuthState({
              userId: session.user.id,
              email: session.user.email || null,
              isValid: true,
              isLoading: false
            });
          } else {
            setAuthState({
              userId: null,
              email: null,
              isValid: false,
              isLoading: false
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mountedRef.current) {
          setAuthState({
            userId: null,
            email: null,
            isValid: false,
            isLoading: false
          });
        }
      }
    };

    initializeAuth();

    return () => {
      mountedRef.current = false;
      if (authChangeDebounceRef.current) {
        clearTimeout(authChangeDebounceRef.current);
      }
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  return {
    ...authState,
    validateSession: (skipNav?: boolean) => validateSession(skipNav),
    refreshAuth,
    forceLogout,
    idleState,
    extendSession: handleExtendSession
  };
}
