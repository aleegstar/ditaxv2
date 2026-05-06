import React from 'react';
import { MessagesSquare, FolderClosed, Sparkles } from 'lucide-react';

interface HomeBottomNavProps {
  onChatClick: () => void;
  onDocumentsClick: () => void;
}

export const HomeBottomNav: React.FC<HomeBottomNavProps> = ({ onChatClick, onDocumentsClick }) => {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="mx-auto w-fit flex items-center gap-2.5 pointer-events-auto">
        {/* Liquid glass pill */}
        <div className="relative">
          {/* Ambient glow */}
          <div
            aria-hidden
            className="absolute -inset-3 rounded-full opacity-60 blur-2xl pointer-events-none"
            style={{
              background:
                'radial-gradient(60% 80% at 30% 50%, rgba(119,157,255,0.35) 0%, transparent 70%), radial-gradient(50% 80% at 80% 50%, rgba(255,180,200,0.25) 0%, transparent 70%)',
            }}
          />

          <div
            className="relative flex items-center gap-1.5 rounded-full px-2 py-2 overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.55) 100%)',
              backdropFilter: 'blur(28px) saturate(200%)',
              WebkitBackdropFilter: 'blur(28px) saturate(200%)',
              border: '1px solid rgba(255,255,255,0.7)',
              boxShadow:
                '0 20px 50px -12px rgba(15,23,42,0.22), 0 6px 16px -4px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
            }}
          >
            {/* Specular highlight */}
            <span
              aria-hidden
              className="absolute top-0 left-3 right-3 h-1/2 rounded-full pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
                filter: 'blur(2px)',
              }}
            />

            <button
              onClick={onChatClick}
              aria-label="Chat"
              className="group relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.92] hover:bg-white/60"
            >
              <MessagesSquare
                className="w-[22px] h-[22px] text-foreground/85 group-hover:text-foreground transition-colors"
                strokeWidth={1.75}
              />
            </button>

            <button
              onClick={onDocumentsClick}
              aria-label="Unterlagen"
              className="group relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.92] hover:bg-white/60"
            >
              <FolderClosed
                className="w-[22px] h-[22px] text-foreground/85 group-hover:text-foreground transition-colors"
                strokeWidth={1.75}
              />
            </button>
          </div>
        </div>

        {/* Primary floating action — Ditax accent */}
        <button
          onClick={onChatClick}
          aria-label="Ditax Assistent"
          className="relative w-14 h-14 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.93] hover:scale-[1.03]"
          style={{
            background: 'linear-gradient(135deg, #779DFF 0%, #2D68FF 100%)',
            boxShadow:
              '0 14px 32px -8px rgba(45,104,255,0.55), 0 4px 12px -2px rgba(45,104,255,0.35), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.10)',
          }}
        >
          <span
            aria-hidden
            className="absolute top-1 left-2 right-2 h-1/3 rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)',
              filter: 'blur(1px)',
            }}
          />
          <Sparkles className="w-6 h-6 text-white relative" strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
};
