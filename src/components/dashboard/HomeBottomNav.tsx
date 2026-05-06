import React from 'react';
import { MessageSquare, FolderClosed, Plus } from 'lucide-react';

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
          className="flex items-center rounded-full bg-white pl-7 pr-1.5 py-1.5 ring-1 ring-black/[0.04]"
          style={{
            boxShadow:
              '0 20px 40px -15px rgba(0,0,0,0.10), 0 4px 12px -2px rgba(0,0,0,0.04), inset 0 2px 4px rgba(255,255,255,1)',
          }}
        >
          <div className="flex items-center gap-7 pr-5">
            <button
              onClick={onChatClick}
              aria-label="Chat"
              className="group flex items-center justify-center focus:outline-none transition-transform active:scale-[0.94]"
            >
              <MessageSquare
                className="w-7 h-7 text-foreground transition-transform duration-200 group-hover:-translate-y-0.5"
                strokeWidth={1.5}
              />
            </button>
            <button
              onClick={onDocumentsClick}
              aria-label="Unterlagen"
              className="group flex items-center justify-center focus:outline-none transition-transform active:scale-[0.94]"
            >
              <FolderClosed
                className="w-7 h-7 text-foreground/55 transition-all duration-200 group-hover:text-foreground group-hover:-translate-y-0.5"
                strokeWidth={1.5}
              />
            </button>
          </div>

          <button
            onClick={onActionClick ?? onDocumentsClick}
            aria-label="Hinzufügen"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-white ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none shrink-0"
            style={{
              boxShadow:
                '0 8px 24px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,1)',
            }}
          >
            <Plus className="w-7 h-7 text-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </nav>
  );
};
