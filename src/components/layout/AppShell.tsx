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
    <div className="md:flex md:h-screen md:w-full md:bg-muted md:overflow-hidden">
      <UserSidebar />
      <div className="md:flex-1 md:min-w-0 md:p-3 md:pl-0">
        <div className="md:h-full md:rounded-2xl md:bg-background md:overflow-y-auto md:shadow-[0_1px_2px_rgba(15,27,61,0.04),0_4px_16px_-8px_rgba(15,27,61,0.06)] md:border md:border-border">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
