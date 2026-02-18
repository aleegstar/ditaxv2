
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isValid, isLoading } = useAuth();
  const location = useLocation();

  // Wait for auth to resolve — no redirect, no toast
  if (isLoading) {
    return null;
  }

  // Only redirect when we're certain the user is not authenticated
  if (!isValid) {
    console.log('🔒 ProtectedRoute: Redirecting to /auth (not authenticated)');
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
