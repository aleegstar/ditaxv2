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
    <div className="md:flex md:h-screen md:w-full md:bg-white md:overflow-hidden">
      <UserSidebar />
      <div className="md:flex-1 md:min-w-0 md:p-3 md:pl-0">
        <div className="md:h-full md:rounded-3xl md:bg-background md:overflow-y-auto md:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] md:ring-1 md:ring-border/40">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
