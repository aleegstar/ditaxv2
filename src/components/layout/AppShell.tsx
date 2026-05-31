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

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { pathname } = useLocation();
  const hideSidebar = HIDE_SIDEBAR_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  if (hideSidebar) {
    return (
      <OfflineGate>
        <div className="min-h-screen bg-white">
          <OfflineBanner />
          <PendingAssignmentBanner />
          {children}
        </div>
      </OfflineGate>
    );
  }

  return (
    <OfflineGate>
      <div className="md:flex md:h-screen md:w-full md:bg-[#F8F9FB] md:overflow-hidden">
        <UserSidebar />
        <div className="md:flex-1 md:min-w-0 md:overflow-y-auto bg-white">
          <OfflineBanner />
          <PendingAssignmentBanner />
          {children}
        </div>
      </div>
    </OfflineGate>
  );
};

export default AppShell;
