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
      <div
        className="mx-auto max-w-md flex items-stretch rounded-full pointer-events-auto overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow:
            '0 20px 48px -12px rgba(0,0,0,0.18), 0 4px 14px -2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <button
          onClick={onChatClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3.5 transition-all duration-200 active:scale-[0.96] hover:bg-foreground/5"
        >
          <MessageCircle className="w-6 h-6 text-foreground" strokeWidth={2.2} fill="currentColor" fillOpacity={0.05} />
          <span className="text-[13px] font-semibold text-foreground tracking-tight">Chat</span>
        </button>
        <button
          onClick={onDocumentsClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3.5 transition-all duration-200 active:scale-[0.96] hover:bg-foreground/5"
        >
          <FolderOpen className="w-6 h-6 text-muted-foreground/70" strokeWidth={2} />
          <span className="text-[13px] font-medium text-muted-foreground/80 tracking-tight">Unterlagen</span>
        </button>
      </div>
    </nav>
  );
};
