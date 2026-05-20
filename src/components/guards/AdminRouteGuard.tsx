import React, { useEffect, useState, createContext, useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthValue {
  userId: string;
  email: string | null;
  isAdmin: true;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminRouteGuard');
  return ctx;
}

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { userId, email, isValid, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;

    if (!isValid || !userId) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    setChecking(true);

    // Single source of truth: one has_role RPC, no extra getUser() roundtrip
    supabase
      .rpc('has_role', { _user_id: userId, _role: 'admin' })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Admin role check failed:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
        setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isValid, authLoading]);

  // Show a real loading spinner instead of a blank screen
  if (authLoading || checking || isAdmin === null) {
    return <LoadingSpinner fullScreen delay={0} />;
  }

  if (!isValid || !userId) {
    toast({
      title: 'Nicht angemeldet',
      description: 'Du musst dich anmelden, um auf den Administratorbereich zuzugreifen.',
      variant: 'destructive',
    });
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    toast({
      title: 'Keine Berechtigung',
      description: 'Sie haben keine Berechtigung für den Administratorbereich.',
      variant: 'destructive',
    });
    return <Navigate to="/" replace />;
  }

  return (
    <AdminAuthContext.Provider value={{ userId, email, isAdmin: true }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminRouteGuard;
