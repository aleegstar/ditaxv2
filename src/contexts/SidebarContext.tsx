
import React, { createContext, useContext, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarContextType {
  collapsed: boolean;
  mobileOpen: boolean;
  desktopOpen: boolean;
  menuSheetOpen: boolean;
  toggleSidebar: () => void;
  setMobileOpen: (open: boolean) => void;
  setDesktopOpen: (open: boolean) => void;
  setMenuSheetOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      // On desktop, open the menu sheet
      setMenuSheetOpen(!menuSheetOpen);
    }
  };

  return (
    <SidebarContext.Provider value={{ 
      collapsed, 
      mobileOpen, 
      desktopOpen,
      menuSheetOpen,
      toggleSidebar, 
      setMobileOpen,
      setDesktopOpen,
      setMenuSheetOpen
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
