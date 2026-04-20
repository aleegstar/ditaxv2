import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { OverlayChatBar } from '@/components/chat/OverlayChatBar';
import { DocumentsOverlay } from '@/components/documents/DocumentsOverlay';

/**
 * Global app shell: bottom navbar + chat overlay + documents overlay.
 * Hidden on auth, welcome, onboarding-style routes.
 */
export const GlobalAppShell: React.FC = () => {
  const { userId } = useAuth();
  const location = useLocation();
  const {
    documentsOverlayOpen,
    setDocumentsOverlayOpen,
    setMenuSheetOpen,
  } = useSidebar();

  const hiddenRoutes = ['/auth', '/welcome', '/select-person', '/login', '/signup'];
  const shouldHide =
    !userId ||
    hiddenRoutes.some((p) => location.pathname.startsWith(p)) ||
    location.pathname.startsWith('/admin');

  if (shouldHide) return null;

  return (
    <>
      <OverlayChatBar userId={userId} onMenuOpen={() => setMenuSheetOpen(true)} />
      <DocumentsOverlay
        isOpen={documentsOverlayOpen}
        onClose={() => setDocumentsOverlayOpen(false)}
      />
    </>
  );
};
