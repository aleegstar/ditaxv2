import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { HelpCircle, Settings, Shield, Cookie, Users, LogOut, Menu, X, FileText, MessageCircle, MapPin, ChevronDown, User as UserIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatIconWithBadge } from "./chat-icon-with-badge";
import { useOnboardingTour } from '@/contexts/OnboardingTourContext';
import { useDocumentsTour } from '@/contexts/DocumentsTourContext';

// Custom Home Icon Component for Steuern
const CustomHomeIcon: React.FC<{
  className?: string;
}> = ({
  className
}) => <svg viewBox="0 0 48 48" fill="currentColor" className={className}>
  <path d="M7.56317 11.1166L23.1065 4.20841C23.6753 3.95559 24.3247 3.95559 24.8935 4.20841L40.4368 11.1166C42.6036 12.0796 44 14.2283 44 16.5994V35.9999C44 40.4182 40.4183 43.9999 36 43.9999H12C7.58172 43.9999 4 40.4182 4 35.9999V16.5994C4 14.2283 5.3964 12.0796 7.56317 11.1166ZM24 8.18857L9.18772 14.7718C8.46547 15.0928 8 15.8091 8 16.5994V35.9999C8 38.2091 9.79086 39.9999 12 39.9999H36C38.2091 39.9999 40 38.2091 40 35.9999V16.5994C40 15.8091 39.5345 15.0928 38.8123 14.7718L24 8.18857ZM28 25.9999C28 24.8954 27.1046 23.9999 26 23.9999H22C20.8954 23.9999 20 24.8954 20 25.9999V29.9999C20 31.1045 20.8954 31.9999 22 31.9999H26C27.1046 31.9999 28 31.1045 28 29.9999V25.9999Z" fill="currentColor" />
</svg>;

// Custom Folder Icon Component for Documents
const CustomFolderIcon: React.FC<{
  className?: string;
}> = ({
  className
}) => <svg viewBox="0 0 48 48" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M44 34V22C44 17.5817 40.4183 14 36 14H29.7082C28.1931 14 26.8081 13.144 26.1305 11.7889L24.8944 9.31672C23.8781 7.28401 21.8005 6 19.5279 6H10C6.68629 6 4 8.68629 4 12V34C4 38.4183 7.58172 42 12 42H36C40.4183 42 44 38.4183 44 34ZM22.5528 13.5777C22.6246 13.7213 22.7004 13.8621 22.7799 14H14C12.8954 14 12 14.8954 12 16C12 17.1046 12.8954 18 14 18H36C38.2091 18 40 19.7909 40 22V34C40 36.2091 38.2091 38 36 38H12C9.79086 38 8 36.2091 8 34V12C8 10.8954 8.89543 10 10 10H19.5279C20.2854 10 20.9779 10.428 21.3167 11.1056L22.5528 13.5777Z" fill="currentColor" />
  </svg>;

// Custom Chat Icon Component  
const CustomChatIcon: React.FC<{
  className?: string;
}> = ({
  className
}) => <svg viewBox="0 0 48 48" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M6.10879 20.0815L18.5715 29.4285L27.9185 41.8912C29.2439 43.6585 31.7511 44.0167 33.5185 42.6912C34.2398 42.1501 34.7573 41.3812 34.9867 40.5091L43.0616 9.82461C43.6238 7.68821 42.3477 5.50055 40.2113 4.93834C39.544 4.76274 38.8426 4.76274 38.1754 4.93834L7.49082 13.0132C5.35442 13.5754 4.07828 15.7631 4.6405 17.8995C4.86998 18.7715 5.3874 19.5405 6.10879 20.0815ZM31.1185 39.4912L22.6408 28.1876L27.4142 23.4142C28.1953 22.6331 28.1953 21.3668 27.4142 20.5857C26.6332 19.8047 25.3669 19.8047 24.5858 20.5857L19.8124 25.3592L8.50879 16.8815L39.1933 8.80664L31.1185 39.4912Z" fill="currentColor" />
  </svg>;

// Custom Tour Icon Component (same as in TourStartButton)
const CustomTourIcon: React.FC<{
  className?: string;
}> = ({
  className
}) => <svg viewBox="0 0 48 48" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M24 44C12.9543 44 4 35.0457 4 24C4 12.9543 12.9543 4 24 4C35.0457 4 44 12.9543 44 24C44 35.0457 35.0457 44 24 44ZM24 8C27.6974 8 31.1019 9.25416 33.8113 11.3603L29.5148 15.6568C27.9339 14.6098 26.0382 14 24 14C21.9618 14 20.0661 14.6098 18.4852 15.6568L14.1887 11.3603C16.8981 9.25416 20.3026 8 24 8ZM32.3432 18.4852L36.6397 14.1887C38.7458 16.8981 40 20.3026 40 24C40 27.6974 38.7458 31.1019 36.6397 33.8113L32.3432 29.5148C33.3902 27.9339 34 26.0382 34 24C34 21.9618 33.3902 20.0661 32.3432 18.4852ZM14.1887 36.6397C16.8981 38.7458 20.3026 40 24 40C27.6974 40 31.1019 38.7458 33.8113 36.6397L29.5148 32.3432C27.9339 33.3902 26.0382 34 24 34C21.9618 34 20.0661 33.3902 18.4852 32.3432L14.1887 36.6397ZM15.6568 29.5148L11.3603 33.8113C9.25416 31.1019 8 27.6974 8 24C8 20.3026 9.25416 16.8981 11.3603 14.1887L15.6568 18.4852C14.6098 20.0661 14 21.9618 14 24C14 26.0382 14.6098 27.9339 15.6568 29.5148ZM30 24C30 27.3137 27.3137 30 24 30C20.6863 30 18 27.3137 18 24C18 20.6863 20.6863 18 24 18C27.3137 18 30 20.6863 30 24Z" fill="currentColor" />
  </svg>;
import { useAuthValidation } from "@/hooks/use-auth-validation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/contexts/I18nContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { SwissFlag, AmericanFlag } from "./flag-icons";
interface SidebarGroupProps {
  children: React.ReactNode;
  className?: string;
}
function SidebarGroup({
  children,
  className
}: SidebarGroupProps) {
  return <div className={`py-2 ${className}`}>{children}</div>;
}
interface SidebarGroupLabelProps {
  children: React.ReactNode;
  className?: string;
}
function SidebarGroupLabel({
  children,
  className
}: SidebarGroupLabelProps) {
  return <div className={`px-4 ${className}`}>{children}</div>;
}
interface SidebarGroupContentProps {
  children: React.ReactNode;
  className?: string;
}
function SidebarGroupContent({
  children,
  className
}: SidebarGroupContentProps) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}
interface SidebarMenuProps {
  children: React.ReactNode;
  className?: string;
}
function SidebarMenu({
  children,
  className
}: SidebarMenuProps) {
  return <ul className={`space-y-1 ${className}`}>{children}</ul>;
}
interface SidebarMenuItemProps {
  children: React.ReactNode;
  className?: string;
}
function SidebarMenuItem({
  children,
  className
}: SidebarMenuItemProps) {
  return <li className={className}>{children}</li>;
}
interface SidebarMenuButtonProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}
function SidebarMenuButton({
  children,
  className,
  asChild
}: SidebarMenuButtonProps) {
  if (asChild) {
    return <>{children}</>;
  }
  return <button className={`w-full ${className}`}>{children}</button>;
}
export function Sidebar() {
  const {
    mobileOpen,
    desktopOpen,
    setMobileOpen,
    setDesktopOpen,
    collapsed,
    toggleSidebar
  } = useSidebar();
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [navigationExpanded, setNavigationExpanded] = useState(true);
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [legalExpanded, setLegalExpanded] = useState(false);
  const {
    userId,
    isValid,
    email
  } = useAuthValidation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const {
    t,
    language,
    switchLanguage
  } = useI18n();
  const {
    showTour,
    forceTour
  } = useOnboardingTour();
  const {
    forceTour: forceDocumentsTour
  } = useDocumentsTour();

  // Load user avatar and name
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) return;
      try {
        const {
          data: profile,
          error
        } = await supabase.from('profiles').select('avatar_url, first_name, last_name').eq('id', userId).single();
        if (error) {
          console.error('Error loading profile:', error);
          return;
        }
        if (profile?.avatar_url) {
          setCurrentAvatarUrl(profile.avatar_url);
        }
        if (profile?.first_name) {
          setUserName(`${profile.first_name} ${profile.last_name || ''}`.trim());
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    loadUserProfile();
  }, [userId]);

  // Subscribe to profile changes for real-time avatar updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('profile-changes').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${userId}`
    }, payload => {
      console.log('Profile updated:', payload);
      if (payload.new && payload.new.avatar_url) {
        setCurrentAvatarUrl(payload.new.avatar_url);
      }
      if (payload.new && payload.new.first_name) {
        setUserName(`${payload.new.first_name} ${payload.new.last_name || ''}`.trim());
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: t.auth.successfulLogout,
        description: t.auth.successfulLogoutMessage
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        variant: "destructive",
        title: t.auth.logoutError,
        description: t.auth.logoutErrorMessage
      });
    }
  };

  // Function to handle navigation clicks (close sidebar after navigation)
  const handleNavigationClick = () => {
    // Only close sidebar on mobile
    if (isMobile) {
      handleClose();
    }
  };

  // Scroll to top after navigation completes
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/documents') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [location.pathname]);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (isMobile) {
        setMobileOpen(false);
      } else {
        setDesktopOpen(false);
      }
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  // Function to start onboarding tour
  const handleStartTour = () => {
    console.log('🎯 Sidebar: Starting tour button clicked');

    // Check if we're already on homepage
    if (location.pathname === '/') {
      // Already on homepage, start tour with consistent delay
      console.log('🎯 Sidebar: Already on homepage, starting tour with delay');

      // Only close sidebar on mobile
      if (isMobile) {
        setMobileOpen(false);
      }

      // Use consistent delay to ensure page elements are ready
      setTimeout(() => {
        console.log('🎯 Sidebar: Calling forceTour() on homepage');
        forceTour();
      }, 500); // Use same delay as navigation case for consistency
    } else {
      // Navigate to homepage first
      navigate('/');

      // Only close sidebar on mobile
      if (isMobile) {
        setMobileOpen(false);
      }

      // Start tour after navigation completes
      setTimeout(() => {
        console.log('🎯 Sidebar: Calling forceTour() after navigation');
        forceTour();
      }, 500);
    }
  };

  // Function to start documents tour
  const handleStartDocumentsTour = () => {
    console.log('🎯 Sidebar: Starting documents tour button clicked');

    // Check if we're already on documents page
    if (location.pathname === '/documents') {
      // Already on documents page, start tour with consistent delay
      console.log('🎯 Sidebar: Already on documents page, starting tour with delay');

      // Only close sidebar on mobile
      if (isMobile) {
        setMobileOpen(false);
      }

      // Use consistent delay to ensure page elements are ready
      setTimeout(() => {
        console.log('🎯 Sidebar: Calling forceDocumentsTour() on documents page');
        forceDocumentsTour();
      }, 500);
    } else {
      // Navigate to documents page first
      navigate('/documents');

      // Only close sidebar on mobile
      if (isMobile) {
        setMobileOpen(false);
      }

      // Start tour after navigation completes
      setTimeout(() => {
        console.log('🎯 Sidebar: Calling forceDocumentsTour() after navigation');
        forceDocumentsTour();
      }, 500);
    }
  };
  const getInitials = (name: string) => {
    if (!name) return 'DT';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const navigationItems = [{
    title: "Steuern",
    url: "/",
    icon: CustomHomeIcon
  }, {
    title: "Dokumente",
    url: "/documents",
    icon: CustomFolderIcon
  }, {
    title: "Chat",
    url: "/chat",
    icon: CustomChatIcon
  }];
  const helpItems = [{
    title: "Anleitung starten",
    onClick: handleStartTour,
    icon: CustomTourIcon
  }, {
    title: "Dokumenten Anleitung starten",
    onClick: handleStartDocumentsTour,
    icon: CustomFolderIcon
  }, {
    title: t.navigation.help,
    url: "/help",
    icon: HelpCircle
  }, {
    title: t.navigation.feedback,
    url: "/feedback",
    icon: MessageCircle
  }, {
    title: "Roadmap",
    url: "/roadmap",
    icon: MapPin
  }];
  const legalItems = [{
    title: t.legal.privacy,
    url: "/privacy",
    icon: Shield
  }, {
    title: t.legal.terms,
    url: "/terms",
    icon: FileText
  }, {
    title: t.legal.cookies,
    url: "/cookies",
    icon: Cookie
  }, {
    title: "Cookie-Einstellungen",
    url: "/privacy-settings",
    icon: Cookie
  }, {
    title: t.legal.privacySettings,
    url: "/privacy-settings",
    icon: Settings
  }];

  // Determine if sidebar should be shown
  const shouldShowSidebar = isMobile ? mobileOpen : desktopOpen;

  // Hide sidebar during onboarding process (Welcome flow or active tour on mobile only)
  const path = location.pathname.toLowerCase();
  if (path.startsWith('/welcome') || showTour && isMobile) {
    return null;
  }
  if (!shouldShowSidebar && !isClosing) {
    return null;
  }

  // Desktop: normal layout, Mobile: overlay
  if (!isMobile) {
    // Desktop sidebar - floating glass design
    return <aside data-sidebar className="hidden md:flex flex-col w-[280px] m-6 rounded-[2.5rem] relative z-20 transition-all duration-300 border border-white/60" style={{
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)'
    }}>
        <div className="p-6">
          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-8">
            <img src="/ditax-logo-new.png" alt="Ditax" className="h-7 w-auto" />
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navigationItems.map((item, index) => <NavLink key={item.title} to={item.url} data-sidebar-nav={item.title.toLowerCase()} data-sidebar-nav-index={index} data-tour={item.title === "Dokumente" ? "documents-nav" : undefined} className={({
            isActive
          }) => `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all group ${isActive ? 'text-slate-900 bg-white/60 shadow-md border border-white/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm'}`} style={({
            isActive
          }) => isActive ? {
            boxShadow: '0 4px 12px -2px rgba(148, 163, 184, 0.3)'
          } : {}}>
                {({
              isActive
            }) => <>
                    <item.icon className={`h-4 w-4 transition-colors ${isActive ? 'text-[#1d64ff]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span>{item.title}</span>
                  </>}
              </NavLink>)}
          </nav>

          {/* Hilfe Section - Collapsible */}
          <div className="mt-8 pt-8 border-t border-slate-200/50">
            <button onClick={() => setHelpExpanded(!helpExpanded)} className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
              <span>Hilfe</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${helpExpanded ? 'rotate-180' : ''}`} />
            </button>
            {helpExpanded && <div className="mt-1 space-y-1">
                {helpItems.map(item => item.url ? <NavLink key={item.title} to={item.url} onClick={handleNavigationClick} className={({
              isActive
            }) => `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-full transition-all ${isActive ? 'text-slate-900 bg-white/60' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm'}`}>
                      <item.icon className="w-4 h-4 text-slate-400" />
                      {item.title}
                    </NavLink> : <button key={item.title} onClick={item.onClick} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm rounded-full transition-all w-full text-left">
                      <item.icon className="w-4 h-4 text-slate-400" />
                      {item.title}
                    </button>)}
              </div>}
          </div>

          {/* Rechtliches Section - Collapsible */}
          <div className="mt-4 pt-4 border-t border-slate-200/50">
            <button onClick={() => setLegalExpanded(!legalExpanded)} className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
              <span>Rechtliches</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${legalExpanded ? 'rotate-180' : ''}`} />
            </button>
            {legalExpanded && <div className="mt-1 space-y-1">
                {legalItems.map(item => <NavLink key={item.title} to={item.url} onClick={handleNavigationClick} className={({
              isActive
            }) => `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-full transition-all ${isActive ? 'text-slate-900 bg-white/60' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm'}`}>
                    <item.icon className="w-4 h-4 text-slate-400" />
                    {item.title}
                  </NavLink>)}
              </div>}
          </div>

          {/* Admin Section */}
          {isValid && userId === '39849efd-bb69-4397-8494-93993a939ca5' && <div className="mt-4 pt-4 border-t border-slate-200/50">
              <h4 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Admin
              </h4>
              <NavLink to="/admin" onClick={handleNavigationClick} className={({
            isActive
          }) => `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-full transition-all ${isActive ? 'text-slate-900 bg-white/60' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 hover:shadow-sm'}`}>
                <Users className="w-4 h-4 text-slate-400" />
                {t.navigation.adminPanel}
              </NavLink>
            </div>}
        </div>

        {/* User Profile Section at Bottom */}
        <div className="mt-auto p-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="p-3 rounded-[2rem] flex items-center gap-3 cursor-pointer transition-all border border-white/60 hover:scale-[1.02]" style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 25px -5px rgba(148, 163, 184, 0.4)'
            }}>
                <Avatar className="h-10 w-10 rounded-full border border-white shadow-md">
                  <AvatarImage src={currentAvatarUrl || ''} alt={userName || email || ''} />
                  <AvatarFallback className="bg-gradient-to-tr from-slate-200 to-slate-100 text-slate-600 font-semibold text-xs">
                    {getInitials(userName || email || 'DT')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {userName || 'Ditax User'}
                  </span>
                  
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-400 ml-auto">
                  <path d="m7 15 5 5 5-5"></path>
                  <path d="m7 9 5-5 5 5"></path>
                </svg>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56 mb-2">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>{t.navigation.profile}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/privacy-settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Einstellungen</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t.navigation.logout}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>;
  }

  // Mobile sidebar - overlay pattern with light design
  return <>
    {/* Overlay - positioned behind the sidebar */}
    <div className={`fixed inset-0 z-[10000] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} style={{
      backgroundColor: 'rgba(0, 0, 0, 0.3)'
    }} onClick={handleClose} />
    
    {/* Sidebar - positioned in front of overlay with light design */}
    <div data-sidebar className={`fixed left-0 top-0 z-[10001] h-screen w-full flex flex-col transform ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`} style={{
      maxWidth: '85%',
      backgroundColor: '#ffffff'
    }}>
      <div className="flex items-center justify-between h-14 px-4 shrink-0 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <img src="/ditax-logo-new.png" alt="Ditax" className="h-5 w-auto" />
        </div>
        <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-colors">
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {/* Navigation Section */}
        <SidebarGroup>
          <button onClick={() => setNavigationExpanded(!navigationExpanded)} className="flex items-center justify-between w-full px-2 py-2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
            <span className="uppercase tracking-wide">Navigation</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${navigationExpanded ? 'rotate-180' : ''}`} />
          </button>
          {navigationExpanded && <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 pl-2 mt-1">
                {navigationItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} onClick={handleNavigationClick} className={({
                    isActive
                  }) => `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-[#1D64FF]/10 text-slate-900 border border-[#1D64FF]/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="ml-3">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>}
        </SidebarGroup>

        {/* Help Section */}
        <SidebarGroup className="mt-6">
          <button onClick={() => setHelpExpanded(!helpExpanded)} className="flex items-center justify-between w-full px-2 py-2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
            <span className="uppercase tracking-wide">Hilfe</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${helpExpanded ? 'rotate-180' : ''}`} />
          </button>
          {helpExpanded && <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 pl-2 mt-1">
                {helpItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      {item.url ? <NavLink to={item.url} onClick={handleNavigationClick} className={({
                    isActive
                  }) => `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-[#1D64FF]/10 text-slate-900 border border-[#1D64FF]/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span className="ml-3">{item.title}</span>
                        </NavLink> : <button onClick={item.onClick} className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 w-full text-left">
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span className="ml-3">{item.title}</span>
                        </button>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>}
        </SidebarGroup>

        {/* Legal Section */}
        <SidebarGroup className="mt-6">
          <button onClick={() => setLegalExpanded(!legalExpanded)} className="flex items-center justify-between w-full px-2 py-2 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
            <span className="uppercase tracking-wide">Rechtliches</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${legalExpanded ? 'rotate-180' : ''}`} />
          </button>
          {legalExpanded && <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 pl-2 mt-1">
                {legalItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} onClick={handleNavigationClick} className={({
                    isActive
                  }) => `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-[#1D64FF]/10 text-slate-900 border border-[#1D64FF]/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="ml-3">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>}
        </SidebarGroup>

        {/* Admin Section */}
        {isValid && userId === '39849efd-bb69-4397-8494-93993a939ca5' && <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-slate-400 text-[11px] font-medium mb-2 px-2">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" onClick={handleNavigationClick} className={({
                    isActive
                  }) => `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-[#1D64FF]/10 text-slate-900 border border-[#1D64FF]/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                      <Users className="h-5 w-5 flex-shrink-0" />
                      <span className="ml-3">{t.navigation.adminPanel}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}

      </nav>

      {/* User Profile Section at Bottom */}
      <div className="mt-auto shrink-0 p-4 border-t border-slate-200 bg-slate-50">
        <Sheet>
          <SheetTrigger asChild>
            <button className="w-full">
              <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={currentAvatarUrl || ''} alt={userName || email || ''} />
                  <AvatarFallback className="bg-[#1D64FF] text-white text-sm">
                    {getInitials(userName || email || 'DT')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {userName || 'Ditax User'}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {email}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </div>
            </button>
          </SheetTrigger>
          
          <SheetContent side="bottom" className="h-auto border-t border-slate-200 bg-white">
            <div className="flex flex-col gap-2 py-4">
              <Button variant="ghost" onClick={() => {
                navigate('/profile');
                handleNavigationClick();
              }} className="justify-start h-12 px-4 text-base text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <UserIcon className="mr-3 h-5 w-5" />
                <span>{t.navigation.profile}</span>
              </Button>
              
              <Button variant="ghost" onClick={() => {
                navigate('/privacy-settings');
                handleNavigationClick();
              }} className="justify-start h-12 px-4 text-base text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <Settings className="mr-3 h-5 w-5" />
                <span>Einstellungen</span>
              </Button>
              
              <div className="border-t border-slate-200 pt-2 mt-2">
                <Button variant="ghost" onClick={handleLogout} className="justify-start h-12 px-4 text-base text-red-500 hover:text-red-400 hover:bg-red-50 w-full">
                  <LogOut className="mr-3 h-5 w-5" />
                  <span>{t.navigation.logout}</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </>;
}