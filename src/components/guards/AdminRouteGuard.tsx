
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { toast } from '@/components/ui/use-toast';

import { useI18n } from '@/contexts/I18nContext';
import { SecurityService } from '@/services/SecurityService';
import { validateAdminAccess, logAdminSecurityEvent, initializeAdminSecurity } from '@/utils/adminSecurity';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { userId, isValid, isLoading: authLoading } = useAuthValidation();
  const { t } = useI18n();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize security monitoring on component mount
  useEffect(() => {
    initializeAdminSecurity();
  }, []);

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Wait for auth validation to complete
      if (authLoading) {
        return;
      }

      // If not authenticated, fail immediately
      if (!isValid || !userId) {
        console.log('🚫 Admin access denied: User not authenticated', { isValid, userId });
        logAdminSecurityEvent(
          'ADMIN_ACCESS_DENIED_NO_AUTH',
          false,
          userId,
          location.pathname,
          { reason: 'User not authenticated' }
        );
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔐 Admin status check for user:', userId, 'Route:', location.pathname);

        // Use enhanced server-side admin validation
        const adminStatus = await validateAdminAccess();

        console.log('✅ Admin status result:', adminStatus);
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          // Log security event for unauthorized admin access attempt
          console.warn('🚨 Unauthorized admin access attempt by user:', userId, 'Route:', location.pathname);
          logAdminSecurityEvent(
            'UNAUTHORIZED_ADMIN_ROUTE_ACCESS',
            false,
            userId,
            location.pathname,
            { 
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          );
        } else {
          // Log successful admin access
          logAdminSecurityEvent(
            'AUTHORIZED_ADMIN_ROUTE_ACCESS',
            true,
            userId,
            location.pathname,
            {
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          );
        }
      } catch (error) {
        console.error('❌ Critical error in admin check:', error);
        // In case of any error, deny access for security
        setIsAdmin(false);
        
        logAdminSecurityEvent(
          'ADMIN_CHECK_ERROR',
          false,
          userId,
          location.pathname,
          { 
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        );
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [userId, isValid, authLoading, location.pathname]);

  // Show loading while checking auth or admin status
  if (authLoading || isLoading) {
    return null;
  }

  // If not authenticated, redirect to auth with return path
  if (!isValid || !userId) {
    console.log('🔒 Redirecting to auth: User not authenticated');
    logAdminSecurityEvent(
      'REDIRECT_TO_AUTH',
      false,
      userId,
      location.pathname,
      { reason: 'Authentication required' }
    );
    
    toast({
      title: t.errors.permissionDenied,
      description: 'Du musst dich anmelden, um auf den Administratorbereich zuzugreifen.',
      variant: "destructive",
    });
    
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // If authenticated but not admin, show access denied and redirect to home
  if (isAdmin === false) {
    console.log('🚫 Admin access denied: User lacks admin role', { userId, isAdmin });
    
    toast({
      title: t.errors.permissionDenied,
      description: 'Sie haben keine Berechtigung für den Administratorbereich.',
      variant: "destructive",
    });
    
    return <Navigate to="/" replace />;
  }

  // Log successful admin access
  console.log('✅ Admin access granted for user:', userId, 'Route:', location.pathname);

  return <>{children}</>;
};

export default AdminRouteGuard;
