import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Home, Plus, MessageCircle, Menu, X, FileText, User, HelpCircle, MessageSquare, Settings, LogOut, ChevronUp, ChevronDown, Shield, FileCheck, Cookie, MapPin, Send, Folder, LifeBuoy, Gift, Globe, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIntelligentNavbar } from '@/hooks/useIntelligentNavbar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useOnboardingTour } from '@/contexts/OnboardingTourContext';
import { useDocumentsTour } from '@/contexts/DocumentsTourContext';
import { useFormTourSafe } from '@/contexts/FormTourContext';
import { useI18n } from '@/contexts/I18nContext';
import { LanguageDropdown } from '@/components/ui/language-dropdown';
type IconComponentType = React.ElementType<{
  className?: string;
}>;
export interface InteractiveMenuItem {
  label: string;
  icon: IconComponentType;
  route: string;
}
export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[];
  accentColor?: string;
}

// Custom Home Icon Component for Steuern
const CustomHomeIcon: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({
  className,
  style
}) => <svg viewBox="0 0 48 48" fill="currentColor" className={className} style={style}>
  <path d="M7.56317 11.1166L23.1065 4.20841C23.6753 3.95559 24.3247 3.95559 24.8935 4.20841L40.4368 11.1166C42.6036 12.0796 44 14.2283 44 16.5994V35.9999C44 40.4182 40.4183 43.9999 36 43.9999H12C7.58172 43.9999 4 40.4182 4 35.9999V16.5994C4 14.2283 5.3964 12.0796 7.56317 11.1166ZM24 8.18857L9.18772 14.7718C8.46547 15.0928 8 15.8091 8 16.5994V35.9999C8 38.2091 9.79086 39.9999 12 39.9999H36C38.2091 39.9999 40 38.2091 40 35.9999V16.5994C40 15.8091 39.5345 15.0928 38.8123 14.7718L24 8.18857ZM28 25.9999C28 24.8954 27.1046 23.9999 26 23.9999H22C20.8954 23.9999 20 24.8954 20 25.9999V29.9999C20 31.1045 20.8954 31.9999 22 31.9999H26C27.1046 31.9999 28 31.1045 28 29.9999V25.9999Z" fill="currentColor" />
</svg>;

// Custom Folder Icon Component for Documents
const CustomFolderIcon: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({
  className,
  style
}) => <svg viewBox="0 0 48 48" fill="currentColor" className={className} style={style}>
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

// Custom icons for menu
const CustomSendIcon: React.FC<{
  className?: string;
}> = ({
  className
}) => <svg viewBox="0 0 48 48" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M6.10879 20.0815L18.5715 29.4285L27.9185 41.8912C29.2439 43.6585 31.7511 44.0167 33.5185 42.6912C34.2398 42.1501 34.7573 41.3812 34.9867 40.5091L43.0616 9.82461C43.6238 7.68821 42.3477 5.50055 40.2113 4.93834C39.544 4.76274 38.8426 4.76274 38.1754 4.93834L7.49082 13.0132C5.35442 13.5754 4.07828 15.7631 4.6405 17.8995C4.86998 18.7715 5.3874 19.5405 6.10879 20.0815ZM31.1185 39.4912L22.6408 28.1876L27.4142 23.4142C28.1953 22.6331 28.1953 21.3668 27.4142 20.5857C26.6332 19.8047 25.3669 19.8047 24.5858 20.5857L19.8124 25.3592L8.50879 16.8815L39.1933 8.80664L31.1185 39.4912Z" fill="currentColor" />
  </svg>;
const CustomSettingsIcon: React.FC<{
  className?: string;
}> = ({
  className
}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>;

// Mobile Menu Sheet Component
interface MobileMenuSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  navigate: (path: string) => void;
  location: {
    pathname: string;
  };
}
const MobileMenuSheet: React.FC<MobileMenuSheetProps> = ({
  isOpen,
  onOpenChange,
  navigate,
  location
}) => {
  const {
    profile
  } = useProfile();
  const {
    forceTour: startOnboardingTour
  } = useOnboardingTour();
  const {
    forceTour: startDocumentsTour
  } = useDocumentsTour();
  const formTourContext = useFormTourSafe();
  const startFormTour = formTourContext?.forceTour;
  const { t } = useI18n();
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(true);
  const [legalOpen, setLegalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigationItems = [{
    label: t.menu.taxes,
    icon: CustomHomeIcon,
    route: '/'
  }, {
    label: t.menu.documents,
    icon: CustomFolderIcon,
    route: '/documents'
  }, {
    label: t.menu.chat,
    icon: CustomSendIcon,
    route: '/chat'
  }, {
    label: t.menu.managePeople,
    icon: Users,
    route: '/tax-filers'
  }];
  const helpItems = [{
    label: t.menu.knowledgeBase,
    icon: HelpCircle,
    route: '/help'
  }, {
    label: t.menu.startGuide,
    icon: CustomSettingsIcon,
    action: () => {
      onOpenChange(false);
      setTimeout(() => startOnboardingTour(), 300);
    }
  }, {
    label: t.menu.startDocumentsGuide,
    icon: Folder,
    action: () => {
      onOpenChange(false);
      navigate('/documents');
      setTimeout(() => startDocumentsTour(), 500);
    }
  }, {
    label: t.menu.startFormGuide,
    icon: FileText,
    action: () => {
      onOpenChange(false);
      // Navigate to /form with startTour param — FormTourContext handles it on load
      navigate('/form?startTour=true');
    }
  }, {
    label: t.menu.feedback,
    icon: MessageSquare,
    route: '/feedback'
  }];
  const legalItems = [{
    label: t.menu.privacy,
    icon: Shield,
    route: '/privacy'
  }, {
    label: t.menu.terms,
    icon: FileCheck,
    route: '/terms'
  }, {
    label: t.menu.cookiePolicy,
    icon: Cookie,
    route: '/cookies'
  }, {
    label: t.menu.cookieSettings,
    icon: Cookie,
    action: () => {
      onOpenChange(false);
    }
  }, {
    label: t.menu.privacySettings,
    icon: Settings,
    route: '/privacy-settings'
  }];
  const handleNavigation = (item: {
    route?: string;
    action?: () => void;
  }) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
      navigate(item.route);
      onOpenChange(false);
    }
  };
  const MenuItem = ({
    item,
    isActive
  }: {
    item: {
      label: string;
      icon: React.ElementType;
      route?: string;
      action?: () => void;
    };
    isActive?: boolean;
  }) => {
    const IconComponent = item.icon;
    return <button onClick={() => handleNavigation(item)} className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all text-left ${isActive ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
        <IconComponent className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
        <span className="text-[15px]">{item.label}</span>
      </button>;
  };
  const SectionHeader = ({
    title,
    isOpen,
    onToggle
  }: {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
  }) => <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold text-muted-foreground/60 tracking-[0.08em] uppercase">
      {title}
      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
    </button>;
  return <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85%] max-w-[320px] p-0 flex flex-col bg-background/95 backdrop-blur-2xl border-r border-border/40">
        {/* Header with Logo */}
        <div className="flex items-center justify-between px-5 py-4">
          <img alt="Ditax" className="h-8" src="/ditax-logo-new.svg" />
          <button onClick={() => onOpenChange(false)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors">
            <X className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Menu Content */}
        <div className="flex-1 overflow-y-auto px-3">
          {/* Navigation Section */}
          <div className="pt-1">
            <SectionHeader title={t.menu.navigation} isOpen={navigationOpen} onToggle={() => setNavigationOpen(!navigationOpen)} />
            {navigationOpen && <div className="space-y-0.5 pb-2">
                {navigationItems.map(item => <MenuItem key={item.label} item={item} isActive={location.pathname === item.route} />)}
              </div>}
          </div>

          <div className="mx-1 border-t border-border/30" />

          {/* Help Section */}
          <div className="pt-1">
            <SectionHeader title={t.menu.help} isOpen={helpOpen} onToggle={() => setHelpOpen(!helpOpen)} />
            {helpOpen && <div className="space-y-0.5 pb-2">
                {helpItems.map(item => <MenuItem key={item.label} item={item} />)}
              </div>}
          </div>

          <div className="mx-1 border-t border-border/30" />

          {/* Legal Section */}
          <div className="pt-1">
            <SectionHeader title={t.menu.legal} isOpen={legalOpen} onToggle={() => setLegalOpen(!legalOpen)} />
            {legalOpen && <div className="space-y-0.5 pb-2">
                {legalItems.map(item => <MenuItem key={item.label} item={item} />)}
              </div>}
          </div>

          {/* Referral Banner */}
          <div className="py-4">
            <button
              onClick={() => {
                navigate('/invite-friends');
                onOpenChange(false);
              }}
              className="w-full relative overflow-hidden rounded-2xl p-4 text-primary-foreground shadow-md hover:shadow-lg transition-all hover:translate-y-[-1px] active:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, hsl(222, 100%, 60%), hsl(222, 100%, 47%))'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/20">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-[15px] text-white">{t.menu.inviteFriends}</div>
                  <div className="text-xs text-white/75 mt-0.5">CHF 20 für dich & deine Freunde</div>
                </div>
                <div className="flex-shrink-0 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                  <ChevronDown className="w-3.5 h-3.5 text-white -rotate-90" />
                </div>
              </div>
            </button>
          </div>

          {/* Language Selector */}
          <div className="pb-4">
            <LanguageDropdown />
          </div>
        </div>

        {/* User Profile Section */}
        <div className="border-t border-border/30 mx-3">
          <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-full flex items-center gap-3 px-2 py-3.5 hover:bg-muted/40 rounded-xl transition-colors">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.first_name || 'User'} className="w-10 h-10 rounded-full object-cover ring-1 ring-border/30" /> : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-medium ring-1 ring-border/30">
                {profile?.first_name?.charAt(0) || 'U'}
              </div>}
            <div className="flex-1 min-w-0 text-left">
              <div className="font-medium text-foreground text-[15px]">{profile?.first_name || 'User'}</div>
              <div className="text-[13px] text-muted-foreground truncate">{profile?.email}</div>
            </div>
            {userMenuOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          
          {userMenuOpen && <div className="pb-2 space-y-0.5">
              <button onClick={() => {
            navigate('/profile');
            onOpenChange(false);
          }} className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                <User className="w-5 h-5 text-muted-foreground/70" />
                <span className="text-[15px]">{t.menu.profile}</span>
              </button>
              <button onClick={async () => {
            await supabase.auth.signOut();
            onOpenChange(false);
            navigate('/auth');
          }} className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="text-[15px] font-medium">{t.menu.logout}</span>
              </button>
            </div>}
        </div>
      </SheetContent>
    </Sheet>;
};
const defaultItems: InteractiveMenuItem[] = [{
  label: 'Steuern',
  icon: CustomHomeIcon,
  route: '/'
}, {
  label: 'Dokumente',
  icon: CustomFolderIcon,
  route: '/documents'
}];
const defaultAccentColor = '#3B82F6'; // Blue color

const InteractiveMenu: React.FC<InteractiveMenuProps> = ({
  items = defaultItems,
  accentColor = defaultAccentColor
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const {
    menuSheetOpen,
    setMenuSheetOpen,
    setDocumentsOverlayOpen
  } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get tax year from URL params, localStorage, or use fallback
  const searchParams = new URLSearchParams(location.search);
  const taxYear = searchParams.get('year') || localStorage.getItem('selectedTaxYear') || String(new Date().getFullYear() - 1);

  // Intelligent navbar behavior
  const {
    isVisible,
    shouldAnimate,
    isKeyboardOpen,
    bottomPosition,
    animationClass
  } = useIntelligentNavbar({
    hideOnScroll: false,
    hideOnKeyboard: false,
    // We position above keyboard instead
    showOnScrollUp: true,
    debounceMs: 150
  });
  const finalItems = useMemo(() => {
    const isValid = items && Array.isArray(items) && items.length >= 2 && items.length <= 5;
    if (!isValid) {
      console.warn("InteractiveMenu: 'items' prop is invalid or missing. Using default items.", items);
      return defaultItems;
    }
    return items;
  }, [items]);

  // Set active index based on current route - use finalItems safely
  const getActiveIndex = useMemo(() => {
    const currentPath = location.pathname;
    const index = finalItems.findIndex(item => item.route === currentPath);
    return index >= 0 ? index : 0;
  }, [location.pathname, finalItems]);
  const [activeIndex, setActiveIndex] = useState(getActiveIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [routeAnimClass, setRouteAnimClass] = useState('');

  // Initial loading animation with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoaded(true);
    }, 150); // Quick initial appearance
    return () => clearTimeout(timer);
  }, []);

  // Route change float animation without hiding
  useEffect(() => {
    if (getActiveIndex !== activeIndex && isInitialLoaded) {
      // Update active index immediately and run a subtle float-up animation
      setActiveIndex(getActiveIndex);
      let raf1 = 0;
      let raf2 = 0;
      setRouteAnimClass('translate-y-2');
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setRouteAnimClass('');
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
  }, [getActiveIndex, activeIndex, isInitialLoaded]);
  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const setLineWidth = () => {
      const activeItemElement = itemRefs.current[activeIndex];
      const activeTextElement = textRefs.current[activeIndex];
      if (activeItemElement && activeTextElement) {
        const textWidth = activeTextElement.offsetWidth;
        activeItemElement.style.setProperty('--lineWidth', `${textWidth}px`);
      }
    };
    setLineWidth();
    window.addEventListener('resize', setLineWidth);
    return () => {
      window.removeEventListener('resize', setLineWidth);
    };
  }, [activeIndex, finalItems]);
  const navStyle = useMemo(() => {
    return {
      '--component-active-color': accentColor
    } as React.CSSProperties;
  }, [accentColor]);

  // Hide navbar on routes other than / and /documents - MOVED AFTER ALL HOOKS
  const showOnRoutes = ['/', '/documents'];
  const shouldShowNavbar = showOnRoutes.includes(location.pathname);

  // Also hide when TaxYearSelector is mounted, body has the hide class, or loaders are visible
  const [shouldHide, setShouldHide] = useState(() => {
    if (typeof document !== 'undefined') {
      const hasBodyClass = document.body.classList.contains('hide-bottom-navbar');
      const dialogOpen = document.querySelector('[role="dialog"][data-state="open"]');
      const documentsWelcomeOpen = document.body.hasAttribute('data-documents-welcome-open');
      const documentsTourOpen = document.body.hasAttribute('data-documents-tour-open');
      return hasBodyClass || !!dialogOpen || documentsWelcomeOpen || documentsTourOpen;
    }
    return false;
  });
  useEffect(() => {
    const check = () => {
      const hasBodyClass = document.body.classList.contains('hide-bottom-navbar');
      const dialogOpen = document.querySelector('[role="dialog"][data-state="open"]');
      const uploaderPreview = document.querySelector('[data-uploader-preview="true"]');
      const documentsWelcomeOpen = document.body.hasAttribute('data-documents-welcome-open');
      const documentsTourOpen = document.body.hasAttribute('data-documents-tour-open');
      setShouldHide(hasBodyClass || !!dialogOpen || !!uploaderPreview || documentsWelcomeOpen || documentsTourOpen);
    };

    // Initial check with a small delay to ensure DOM is ready
    const initialTimer = setTimeout(check, 100);
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-tax-year-selector', 'data-uploader-preview', 'data-documents-welcome-open', 'data-documents-tour-open']
    });
    window.addEventListener('focus', check);
    return () => {
      clearTimeout(initialTimer);
      observer.disconnect();
      window.removeEventListener('focus', check);
    };
  }, []);

  // Combine all visibility conditions with proper priority
  const shouldShow = shouldShowNavbar && !shouldHide && isVisible;
  if (!shouldShow) {
    return null;
  }
  const handleItemClick = (index: number) => {
    if (index !== activeIndex) {
      setActiveIndex(index);
      navigate(finalItems[index].route);
      setIsDropdownOpen(false);
      // Reset transition state after navigation
      setTimeout(() => setIsTransitioning(false), 200);
    }
  };
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  return <AnimatePresence>
      {isInitialLoaded && shouldShow && <motion.div initial={{
      y: 40,
      opacity: 0
    }} animate={{
      y: 0,
      opacity: 1
    }} exit={{
      y: 40,
      opacity: 0
    }} transition={{
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1]
    }} className="fixed left-6 right-6 bottom-4 z-[9999]">
          {/* Navbar */}
          <nav role="navigation" data-bottom-navbar style={navStyle} className="relative flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full px-3 py-2" style={{ 
              background: 'rgba(255,255,255,0.85)', 
              border: '1px solid rgba(0,0,0,0.06)', 
              boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)', 
              backdropFilter: 'blur(20px) saturate(180%)' 
            }}>
              {/* Home Button */}
              <motion.button onClick={() => navigate('/')} whileTap={{
            scale: 0.9
          }} className={`flex items-center justify-center rounded-full transition-all duration-200 ${location.pathname === '/' ? 'px-5 py-2.5' : 'px-4 py-2.5'}`} style={location.pathname === '/' ? { color: 'hsl(222, 100%, 56%)', background: 'hsl(222, 100%, 56%, 0.1)' } : { color: 'rgba(100,110,130,0.7)' }}>
                <CustomHomeIcon className="w-[21px] h-[21px]" />
              </motion.button>

              {/* Documents Button */}
              <motion.button onClick={() => {
                if (location.pathname === '/') {
                  setDocumentsOverlayOpen(true);
                } else {
                  navigate('/documents');
                }
              }} whileTap={{
            scale: 0.9
          }} data-tour="documents-nav" className={`flex items-center justify-center rounded-full transition-all duration-200 ${location.pathname === '/documents' ? 'px-5 py-2.5' : 'px-4 py-2.5'}`} style={location.pathname === '/documents' ? { color: 'hsl(222, 100%, 56%)', background: 'hsl(222, 100%, 56%, 0.1)' } : { color: 'rgba(100,110,130,0.7)' }}>
                <CustomFolderIcon className="w-[21px] h-[21px]" />
              </motion.button>

              {/* Menu Button */}
              <motion.button onClick={() => setMenuSheetOpen(true)} data-tour="mobile-menu-button" whileTap={{
            scale: 0.9
          }} className="flex items-center justify-center rounded-full px-4 py-2.5 transition-all duration-200" style={{ color: 'rgba(100,110,130,0.7)' }}>
                <Menu className="w-[21px] h-[21px]" strokeWidth={1.8} />
              </motion.button>
            </div>
          </nav>
        </motion.div>}

    </AnimatePresence>;
};
export { InteractiveMenu, MobileMenuSheet };