import React from 'react';
import { MessageCircle, FolderOpen } from 'lucide-react';

interface HomeBottomNavProps {
  onChatClick: () => void;
  onDocumentsClick: () => void;
}

export const HomeBottomNav: React.FC<HomeBottomNavProps> = ({ onChatClick, onDocumentsClick }) => {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="mx-auto w-fit flex items-center gap-2 pointer-events-auto">
        {/* Pill with icon buttons */}
        <div
          className="flex items-center gap-1 rounded-full px-2 py-2"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow:
              '0 16px 40px -12px rgba(0,0,0,0.18), 0 4px 12px -2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          <button
            onClick={onChatClick}
            aria-label="Chat"
            className="w-11 h-11 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 active:scale-[0.94]"
          >
            <MessageCircle className="w-[22px] h-[22px]" strokeWidth={1.8} />
          </button>
          <button
            onClick={onDocumentsClick}
            aria-label="Unterlagen"
            className="w-11 h-11 flex items-center justify-center rounded-2xl text-foreground bg-foreground/5 hover:bg-foreground/10 transition-all duration-200 active:scale-[0.94]"
          >
            <FolderOpen className="w-[22px] h-[22px]" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </nav>
  );
};
