import { useLocation, Navigate } from 'react-router-dom';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Offline lockdown: while the browser is offline, only `/offline-upload`
 * is reachable. Every other route is redirected there. Once back online,
 * normal routing resumes and the React tree re-renders.
 *
 * The single allowed offline screen lets users keep collecting and
 * encrypting documents into the offline queue. Assignment to a tax filer,
 * year and checklist item happens later on `/documents/review`.
 */
const OFFLINE_ALLOWED_ROUTES = ['/offline-upload'];

interface Props {
  children: React.ReactNode;
}

export const OfflineGate = ({ children }: Props) => {
  const online = useOnlineStatus();
  const { pathname } = useLocation();

  if (!online && !OFFLINE_ALLOWED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return <Navigate to="/offline-upload" replace />;
  }

  return <>{children}</>;
};

export default OfflineGate;
