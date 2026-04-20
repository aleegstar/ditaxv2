import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, MessageCircle } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface NavItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon: Icon, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-all duration-200 active:scale-[0.96]',
        active ? '' : 'opacity-60 hover:opacity-90'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-11 h-9 rounded-full transition-all duration-200',
          active ? 'bg-foreground/8' : 'bg-transparent'
        )}
        style={
          active
            ? {
                background: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 2px 6px rgba(80, 65, 45, 0.06)',
              }
            : undefined
        }
      >
        <Icon
          className={cn('w-[18px] h-[18px]', active ? 'text-foreground' : 'text-foreground/70')}
          strokeWidth={1.6}
        />
      </div>
      <span
        className={cn(
          'text-[11px] tracking-tight',
          active ? 'text-foreground font-medium' : 'text-foreground/70 font-normal'
        )}
      >
        {label}
      </span>
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
      className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-md px-4">
        <div
          className="pointer-events-auto rounded-full flex items-center justify-around px-2 py-1.5"
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
      </div>
    </nav>
  );
};
