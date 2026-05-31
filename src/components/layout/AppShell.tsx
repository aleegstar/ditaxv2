import React from 'react';
import { useLocation } from 'react-router-dom';
import { UserSidebar } from './UserSidebar';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { PendingAssignmentBanner } from '@/components/offline/PendingAssignmentBanner';
import { OfflineGate } from '@/components/guards/OfflineGate';

interface AppShellProps {
  children: React.ReactNode;
}

// Routes where the sidebar should NOT be shown (onboarding/auth flows)
const HIDE_SIDEBAR_ROUTES = ['/welcome'];

// Routes that manage their own scroll/fixed-frame internally and should NOT
// be wrapped in an extra overflow-y-auto container on mobile (e.g. /chat).
const SELF_MANAGED_SCROLL_ROUTES = ['/chat'];

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { pathname } = useLocation();
  const hideSidebar = HIDE_SIDEBAR_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
  const selfManagedScroll = SELF_MANAGED_SCROLL_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  // Inner content area: either we own the scroll (default) or the page owns
  // it (chat). On desktop the existing scroll containers handle this.
  const contentClass = selfManagedScroll
    ? 'flex-1 min-h-0 flex flex-col md:flex-none md:min-h-0 md:block'
    : 'flex-1 min-h-0 overflow-y-auto md:flex-none md:min-h-0 md:overflow-visible';

  if (hideSidebar) {
    return (
      <OfflineGate>
        <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden md:flex-none md:min-h-screen md:overflow-visible">
          <OfflineBanner />
          <PendingAssignmentBanner />
          <div className={contentClass}>{children}</div>
        </div>
      </OfflineGate>
    );
  }

  return (
    <OfflineGate>
      <div className="flex-1 min-h-0 flex flex-col md:flex md:flex-row md:h-screen md:min-h-0 md:w-full md:bg-[#F8F9FB] md:overflow-hidden">
        <UserSidebar />
        <div className="flex-1 min-h-0 flex flex-col bg-white md:flex-1 md:min-w-0 md:overflow-y-auto md:block">
          <OfflineBanner />
          <PendingAssignmentBanner />
          <div className={contentClass}>{children}</div>
        </div>
      </div>
    </OfflineGate>
  );
};

export default AppShell;
