import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * TaxFilerGate - Blocks route rendering until tax filer data is loaded.
 * If the user has multiple filers and hasn't confirmed a selection,
 * redirects to /select-person BEFORE any route content is rendered.
 */
const TaxFilerGate = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, hasMultipleFilers, selectionConfirmed } = useTaxFiler();
  const location = useLocation();
  const [safetyTimeout, setSafetyTimeout] = useState(false);

  // Safety timeout: prevent infinite loading if isLoading never resolves
  useEffect(() => {
    if (!isLoading) {
      setSafetyTimeout(false);
      return;
    }
    const timer = setTimeout(() => {
      console.warn('TaxFilerGate: Safety timeout after 8s, unblocking routes');
      setSafetyTimeout(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Allow /select-person, /welcome, and legal pages through without gating
  const bypassPaths = ['/select-person', '/welcome', '/privacy', '/terms', '/cookies', '/acceptable-use', '/impressum', '/privacy-settings', '/debug', '/help', '/feedback', '/payment-success'];
  const shouldBypass = bypassPaths.some(p => location.pathname.startsWith(p));

  if (shouldBypass) {
    return <>{children}</>;
  }

  // Show loading spinner while tax filer data is being fetched (with safety timeout)
  if (isLoading && !safetyTimeout) {
    return <LoadingSpinner fullScreen />;
  }

  // Redirect to person selection before rendering any route content
  if (hasMultipleFilers && !selectionConfirmed) {
    return <Navigate to="/select-person" replace />;
  }

  return <>{children}</>;
};

export default TaxFilerGate;
