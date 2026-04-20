
import React, { createContext, useContext, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarContextType {
  collapsed: boolean;
  mobileOpen: boolean;
  desktopOpen: boolean;
  menuSheetOpen: boolean;
  documentsOverlayOpen: boolean;
  chatOverlayOpen: boolean;
  toggleSidebar: () => void;
  setMobileOpen: (open: boolean) => void;
  setDesktopOpen: (open: boolean) => void;
  setMenuSheetOpen: (open: boolean) => void;
  setDocumentsOverlayOpen: (open: boolean) => void;
  setChatOverlayOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);
  const [documentsOverlayOpen, setDocumentsOverlayOpen] = useState(false);
  const [chatOverlayOpen, setChatOverlayOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setMenuSheetOpen(!menuSheetOpen);
    }
  };

  return (
    <SidebarContext.Provider value={{ 
      collapsed, 
      mobileOpen, 
      desktopOpen,
      menuSheetOpen,
      documentsOverlayOpen,
      chatOverlayOpen,
      toggleSidebar, 
      setMobileOpen,
      setDesktopOpen,
      setMenuSheetOpen,
      setDocumentsOverlayOpen,
      setChatOverlayOpen,
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
