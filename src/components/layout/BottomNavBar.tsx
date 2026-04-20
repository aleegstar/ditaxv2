import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, MessageCircle, LucideIcon } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface NavItemProps {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon: Icon, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-full transition-all duration-300 active:scale-[0.96] focus:outline-none',
        active
          ? 'px-4 py-2'
          : 'px-3 py-2 opacity-70 hover:opacity-100'
      )}
      style={
        active
          ? {
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(80, 65, 45, 0.08)',
            }
          : undefined
      }
    >
      <Icon
        className={cn('w-[18px] h-[18px]', active ? 'text-foreground' : 'text-foreground/70')}
        strokeWidth={1.6}
      />
      {active && (
        <span className="text-[13px] font-medium tracking-tight text-foreground whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  );
};

export const BottomNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    documentsOverlayOpen,
    setDocumentsOverlayOpen,
    chatOverlayOpen,
    setChatOverlayOpen,
  } = useSidebar();

  const isHome = location.pathname === '/' && !documentsOverlayOpen && !chatOverlayOpen;

  const handleHome = () => {
    setChatOverlayOpen(false);
    setDocumentsOverlayOpen(false);
    if (location.pathname !== '/') navigate('/');
  };

  const handleDocs = () => {
    setChatOverlayOpen(false);
    setDocumentsOverlayOpen(true);
  };

  const handleChat = () => {
    setDocumentsOverlayOpen(false);
    setChatOverlayOpen(true);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none flex justify-center"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div
        className="pointer-events-auto rounded-full flex items-center gap-1 px-2 py-1.5"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 8px 28px rgba(80, 65, 45, 0.10), 0 2px 8px rgba(80, 65, 45, 0.05)',
        }}
      >
        <NavItem label="Home" icon={Home} active={isHome} onClick={handleHome} />
        <NavItem
          label="Unterlagen"
          icon={FileText}
          active={documentsOverlayOpen}
          onClick={handleDocs}
        />
        <NavItem
          label="Chat"
          icon={MessageCircle}
          active={chatOverlayOpen}
          onClick={handleChat}
        />
      </div>
    </nav>
  );
};
