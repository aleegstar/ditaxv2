
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIdleTimer } from './use-idle-timer';
import { useI18n } from '@/contexts/I18nContext';

interface IdleState {
  showWarning: boolean;
  timeLeft: number;
}

/**
 * Thin wrapper around useAuth() that adds idle-timer and legacy API compatibility.
 * All actual auth state comes from the central AuthContext.
 */
export function useAuthValidation() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  // Guard: ensure the logout toast + navigation only fires once per idle event
  const logoutFiredRef = useRef(false);

  const [idleState, setIdleState] = useState<IdleState>({
    showWarning: false,
    timeLeft: 0,
  });

  const handleIdleTimeout = useCallback(() => {
    if (logoutFiredRef.current) return;
    logoutFiredRef.current = true;

    console.log('Idle timeout reached, logging out');
    setIdleState({ showWarning: false, timeLeft: 0 });
    auth.forceLogout().then(() => {
      toast({
        title: t.auth.autoLogout,
        description: t.auth.autoLogoutDescription,
        variant: "destructive",
      });
      navigate('/auth');
    });
  }, [auth, toast, t.auth, navigate]);

  const handleIdleWarning = useCallback(() => {
    setIdleState(prev => ({ ...prev, showWarning: true }));
  }, []);

  const { timeLeft, extendSession: extendIdleSession } = useIdleTimer({
    timeout: 20 * 60 * 1000,
    onIdle: handleIdleTimeout,
    onWarning: handleIdleWarning,
    warningTime: 18 * 60 * 1000,
  });

  // Reset the guard when the user is authenticated again
  useEffect(() => {
    if (auth.isValid) {
      logoutFiredRef.current = false;
    }
  }, [auth.isValid]);

  useEffect(() => {
    if (idleState.showWarning) {
      setIdleState(prev => ({ ...prev, timeLeft }));
    }
  }, [timeLeft, idleState.showWarning]);

  const extendSession = useCallback(() => {
    extendIdleSession();
    setIdleState({ showWarning: false, timeLeft: 0 });
    toast({
      title: t.auth.sessionExtended,
      description: t.auth.sessionExtendedDescription,
    });
  }, [extendIdleSession, toast, t.auth]);

  const validateSession = useCallback(async (_skipNavigation = false) => {
    // Delegate to central context — session is always up-to-date
    return auth.isValid;
  }, [auth.isValid]);

  return {
    userId: auth.userId,
    email: auth.email,
    isValid: auth.isValid,
    isLoading: auth.isLoading,
    validateSession,
    refreshAuth: auth.refreshAuth,
    forceLogout: auth.forceLogout,
    idleState,
    extendSession,
  };
}
