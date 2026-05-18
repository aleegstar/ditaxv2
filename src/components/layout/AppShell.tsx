import React from 'react';
import { UserSidebar } from './UserSidebar';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * App layout shell.
 * - Mobile: renders children directly (existing layout with HomeBottomNav).
 * - Desktop (md+): renders a permanent left sidebar on a white frame,
 *   with the page content nested inside a rounded card using the main
 *   background (rosé-tinted). The mobile bottom nav is hidden via its
 *   own md:hidden rule.
 */
export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="md:flex md:h-screen md:w-full md:bg-[#F8F9FB] md:overflow-hidden">
      <UserSidebar />
      <div className="md:flex-1 md:min-w-0 md:overflow-y-auto bg-white">
        {children}
      </div>
    </div>
  );
};

export default AppShell;
