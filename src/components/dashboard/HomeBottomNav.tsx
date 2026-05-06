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
        className="mx-auto max-w-md flex items-center gap-2 rounded-full p-1.5 pointer-events-auto"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid hsl(var(--border) / 0.6)',
          boxShadow: '0 14px 40px -10px hsl(var(--foreground) / 0.18), 0 2px 10px hsl(var(--foreground) / 0.04)',
        }}
      >
        <button
          onClick={onChatClick}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-foreground transition-all duration-200 active:scale-[0.97] hover:bg-muted/60"
        >
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <span>Chat</span>
        </button>
        <button
          onClick={onDocumentsClick}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-primary-foreground transition-all duration-200 active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #779DFF 0%, #2D68FF 100%)' }}
        >
          <FolderOpen className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <span>Unterlagen</span>
        </button>
      </div>
    </nav>
  );
};
