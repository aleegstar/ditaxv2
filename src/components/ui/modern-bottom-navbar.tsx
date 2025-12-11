
import React, { useState, useEffect } from 'react';
import { Home, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { ElementsIcon } from './ElementsIcon';
import { ChatIconWithBadge } from './chat-icon-with-badge';
import { useIntelligentNavbar } from '@/hooks/useIntelligentNavbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type IconComponentType = React.ElementType<{ className?: string }>;

export interface BottomNavItem {
  label: string;
  icon: IconComponentType | 'ChatIconWithBadge';
  route: string;
}

export interface BottomNavbarProps {
  items?: BottomNavItem[];
  className?: string;
}

const defaultItems: BottomNavItem[] = [
  { label: 'Home', icon: Home, route: '/' },
  { label: 'Dokumente', icon: ElementsIcon, route: '/documents' },
  { label: 'Chat', icon: 'ChatIconWithBadge', route: '/chat' },
];

export const BottomNavbar: React.FC<BottomNavbarProps> = ({ 
  items = defaultItems,
  className 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMobileOpen } = useSidebar();
  const isMobile = useIsMobile();
  
  // Intelligent navbar behavior
  const {
    isVisible,
    shouldAnimate,
    isKeyboardOpen,
    bottomPosition,
    animationClass
  } = useIntelligentNavbar({
    hideOnScroll: true,
    hideOnKeyboard: true,
    showOnScrollUp: true,
    debounceMs: 150
  });

  const [activeIndex, setActiveIndex] = useState(() => {
    const currentRoute = location.pathname;
    const index = items.findIndex(item => item.route === currentRoute);
    return index >= 0 ? index : 0;
  });

  useEffect(() => {
    const currentRoute = location.pathname;
    const index = items.findIndex(item => item.route === currentRoute);
    if (index >= 0) {
      setActiveIndex(index);
    }
  }, [location.pathname, items]);

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    const route = items[index].route;
    
    // Close sidebar when navigating to other routes
    setMobileOpen(false);
    
    navigate(route);
  };

  // Scroll to top after navigation completes
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/documents') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname]);

  // Hide navbar on certain routes and when no tax years exist
  const showOnRoutes = ['/', '/documents', '/chat', '/help', '/feedback', '/roadmap'];
  const shouldShowNavbar = showOnRoutes.includes(location.pathname);
  
  // Check if tax year selector is present (indicates no tax years exist)
  const [hasNoTaxYears, setHasNoTaxYears] = React.useState(false);
  // Check if document editing is active
  const [isDocumentEditing, setIsDocumentEditing] = React.useState(false);
  // Check if document viewer is open
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = React.useState(false);
  // Check if uploader preview is showing
  const [isUploaderPreviewOpen, setIsUploaderPreviewOpen] = React.useState(false);
  
  React.useEffect(() => {
    const checkForTaxYearSelector = () => {
      const taxYearSelector = document.querySelector('[data-tax-year-selector]');
      setHasNoTaxYears(!!taxYearSelector);
    };
    
    const checkForDocumentEditing = () => {
      // Check for active document name editing (input fields in document components)
      const documentEditInput = document.querySelector('input[type="text"]:focus');
      const isInDocumentsPage = location.pathname === '/documents';
      setIsDocumentEditing(isInDocumentsPage && !!documentEditInput);
    };
    
    const checkForDocumentViewer = () => {
      // Check if DocumentViewer dialog is open by looking for data-document-viewer attribute
      const documentViewer = document.querySelector('[data-document-viewer="true"][data-state="open"]');
      setIsDocumentViewerOpen(!!documentViewer);
    };
    
    const checkForUploaderPreview = () => {
      // Check if uploader preview is showing by looking for data-uploader-preview attribute
      const uploaderPreview = document.querySelector('[data-uploader-preview="true"]');
      setIsUploaderPreviewOpen(!!uploaderPreview);
    };
    
    // Check immediately and set up observer
    checkForTaxYearSelector();
    checkForDocumentEditing();
    checkForDocumentViewer();
    checkForUploaderPreview();
    
    const observer = new MutationObserver(() => {
      checkForTaxYearSelector();
      checkForDocumentEditing();
      checkForDocumentViewer();
      checkForUploaderPreview();
    });
    
    // Listen for focus/blur events on input fields
    const handleFocusChange = () => {
      setTimeout(checkForDocumentEditing, 0); // Delay to ensure focus state is updated
    };
    
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tax-year-selector']
    });
    
    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, [location.pathname]);
  
  // Don't render on desktop or when conditions don't match
  if (!isMobile || !shouldShowNavbar || hasNoTaxYears || isDocumentEditing || isDocumentViewerOpen || isUploaderPreviewOpen) {
    return null;
  }

  return (
    <nav 
      data-bottom-navbar
      className={cn(
        "fixed left-1/2 transform -translate-x-1/2 z-[9999]",
        "flex items-center justify-center gap-2 px-6 py-4",
        "bg-white/20 backdrop-blur-xl border border-white/30",
        "rounded-full shadow-2xl shadow-black/20",
        animationClass,
        // Visibility and transform based on intelligent behavior
        isVisible 
          ? "translate-y-0 opacity-100" 
          : "translate-y-full opacity-0 pointer-events-none",
        className
      )}
      style={{
        bottom: `${bottomPosition}px`,
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        transform: `translateX(-50%) ${isVisible ? 'translateY(0)' : 'translateY(100%)'}`,
        transition: shouldAnimate ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
      }}
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex;

        return (
          <button
            key={item.label}
            onClick={() => handleItemClick(index)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 transition-all duration-500 ease-out",
              "text-sm font-medium rounded-full",
              isActive 
                ? "bg-white/90 text-blue-600 shadow-lg min-w-[120px] justify-center" 
                : "text-white/80 hover:text-white hover:bg-white/10 w-12 h-12 justify-center"
            )}
            data-tour={
              item.route === '/chat' ? 'bottom-navbar-chat' : 
              item.route === '/documents' ? 'documents-nav' : 
              undefined
            }
            style={isActive ? {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)',
            } : {}}
          >
            {item.icon === 'ChatIconWithBadge' ? (
              <ChatIconWithBadge 
                className={cn(
                  "transition-all duration-300",
                  isActive ? "text-blue-600" : "text-white/80"
                )}
                size={20}
              />
            ) : (
              React.createElement(item.icon as IconComponentType, {
                className: cn(
                  "w-5 h-5 transition-all duration-300",
                  isActive ? "text-blue-600" : "text-white/80"
                )
              })
            )}
            {isActive && (
              <span className="text-blue-600 font-semibold whitespace-nowrap">
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
