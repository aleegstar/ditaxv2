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

  // Allow /select-person, /welcome, and legal pages through without gating
  const bypassPaths = ['/select-person', '/welcome', '/privacy', '/terms', '/cookies', '/acceptable-use', '/impressum', '/privacy-settings', '/debug', '/help', '/feedback'];
  const shouldBypass = bypassPaths.some(p => location.pathname.startsWith(p));

  if (shouldBypass) {
    return <>{children}</>;
  }

  // Show loading spinner while tax filer data is being fetched
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Redirect to person selection before rendering any route content
  if (hasMultipleFilers && !selectionConfirmed) {
    return <Navigate to="/select-person" replace />;
  }

  return <>{children}</>;
};

export default TaxFilerGate;
