
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { toast } from '@/components/ui/use-toast';

import { useI18n } from '@/contexts/I18nContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { userId, isValid, isLoading: authLoading } = useAuthValidation();
  const { t } = useI18n();
  const location = useLocation();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Wait for auth validation to complete
    if (authLoading) {
      return;
    }

    // Check authentication status
    if (!isValid || !userId) {
      console.log('🚫 Protected route access denied: User not authenticated', { isValid, userId });
      setHasChecked(true);
      return;
    }

    console.log('✅ Protected route access granted for user:', userId, 'Route:', location.pathname);
    setHasChecked(true);
  }, [userId, isValid, authLoading, location.pathname]);

  // Show loading while checking auth
  if (authLoading || !hasChecked) {
    return null;
  }

  // If not authenticated, redirect to auth with return path
  if (!isValid || !userId) {
    console.log('🔒 Redirecting to auth: User not authenticated');
    
    toast({
      title: t.errors.permissionDenied,
      description: t.auth.notLoggedInDescription,
      variant: "destructive",
    });
    
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Log successful access
  console.log('✅ Protected route access granted for user:', userId, 'Route:', location.pathname);

  return <>{children}</>;
};

export default ProtectedRoute;
