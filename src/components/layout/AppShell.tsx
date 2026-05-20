import React from 'react';
import { useLocation } from 'react-router-dom';
import { UserSidebar } from './UserSidebar';

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
    return <div className="min-h-screen bg-white">{children}</div>;
  }

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

