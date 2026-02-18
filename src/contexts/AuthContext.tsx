
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  userId: string | null;
  email: string | null;
  isValid: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  refreshAuth: () => Promise<boolean>;
  forceLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    userId: null,
    email: null,
    isValid: false,
    isLoading: true,
  });
  const mountedRef = useRef(true);

  const refreshAuth = useCallback(async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      return false;
    }
  }, []);

  const forceLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      if (mountedRef.current) {
        setState({ userId: null, email: null, isValid: false, isLoading: false });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // 1. Register auth listener FIRST (Supabase best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mountedRef.current) return;
        setState({
          userId: session?.user?.id ?? null,
          email: session?.user?.email ?? null,
          isValid: !!session,
          isLoading: false,
        });
      }
    );

    // 2. Check existing session, then validate server-side
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mountedRef.current) return;
      if (error) {
        console.error('Error getting session:', error);
      }

      if (session) {
        // Validate token server-side with getUser()
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!mountedRef.current) return;
        if (userError || !user) {
          console.warn('Session token invalid, forcing logout:', userError?.message);
          await supabase.auth.signOut();
          setState({ userId: null, email: null, isValid: false, isLoading: false });
          return;
        }
      }

      setState({
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        isValid: !!session,
        isLoading: false,
      });
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refreshAuth, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
