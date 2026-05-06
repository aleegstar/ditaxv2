import React from 'react';
import { Home, Folder, Menu } from 'lucide-react';

interface HomeBottomNavProps {
  onChatClick: () => void;
  onDocumentsClick: () => void;
  onActionClick?: () => void;
}

export const HomeBottomNav: React.FC<HomeBottomNavProps> = ({
  onChatClick,
  onDocumentsClick,
  onActionClick,
}) => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="mx-auto w-fit pointer-events-auto">
        <div
          className="group flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-xl ring-1 ring-gray-900/5 p-2 transition-all duration-500"
          style={{
            boxShadow:
              '0 30px 60px -12px rgba(17,24,39,0.25), 0 18px 36px -18px rgba(17,24,39,0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          {/* Active Pill: Steuern */}
          <button
            onClick={onActionClick}
            aria-label="Steuern"
            className="relative flex items-center gap-2 pl-3.5 pr-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full ring-1 ring-white/20 transition-all duration-300 active:scale-[0.98]"
            style={{
              boxShadow:
                '0 8px 16px -4px hsl(var(--primary) / 0.5), 0 4px 6px -2px hsl(var(--primary) / 0.3)',
            }}
          >
            <Home className="w-[18px] h-[18px]" strokeWidth={1.75} />
            <span className="text-[14px] font-medium">Steuern</span>
          </button>

          {/* Secondary: Dokumente */}
          <button
            onClick={onDocumentsClick}
            aria-label="Dokumente"
            className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 ring-1 ring-gray-200/60 rounded-full transition-all duration-300"
            style={{
              boxShadow:
                '0 4px 12px -2px rgba(17,24,39,0.08), 0 2px 6px -2px rgba(17,24,39,0.04)',
            }}
          >
            <Folder className="w-[18px] h-[18px] text-gray-400" strokeWidth={1.75} />
            <span className="text-[14px] font-medium">Dokumente</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200/80 mx-0.5" />

          {/* Menu */}
          <button
            onClick={onChatClick}
            aria-label="Menü"
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 ring-1 ring-gray-200/60 rounded-full transition-all duration-300 active:scale-95"
            style={{
              boxShadow:
                '0 4px 12px -2px rgba(17,24,39,0.08), 0 2px 6px -2px rgba(17,24,39,0.04)',
            }}
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </nav>
  );
};
