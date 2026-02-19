
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { IdleWarningDialog } from '@/components/IdleWarningDialog';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isValid, isLoading } = useAuth();
  const { idleState, extendSession } = useAuthValidation();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isValid) {
    console.log('🔒 ProtectedRoute: Redirecting to /auth (not authenticated)');
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return (
    <>
      {children}
      <IdleWarningDialog
        isOpen={idleState.showWarning}
        timeLeft={idleState.timeLeft}
        onExtendSession={extendSession}
      />
    </>
  );
};

export default ProtectedRoute;
