import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';

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
          className="flex items-center rounded-full bg-white pl-8 pr-2 py-2 ring-1 ring-black/[0.04]"
          style={{
            boxShadow:
              '0 30px 60px -20px rgba(0,0,0,0.18), 0 12px 24px -8px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04), inset 0 2px 4px rgba(255,255,255,1)',
          }}
        >
          <div className="flex items-center pr-6">
            <button
              onClick={onChatClick}
              aria-label="Chat"
              className="group flex items-center justify-center focus:outline-none transition-transform active:scale-[0.94]"
            >
              <MessageSquare
                className="w-8 h-8 text-foreground transition-transform duration-200 group-hover:-translate-y-0.5"
                strokeWidth={2}
                fill="currentColor"
                strokeLinejoin="round"
              />
            </button>
          </div>

          <button
            onClick={onActionClick ?? onDocumentsClick}
            aria-label="Hinzufügen"
            className="flex items-center justify-center w-16 h-16 rounded-full bg-white ring-1 ring-black/[0.05] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none shrink-0"
            style={{
              boxShadow:
                '0 14px 32px -8px rgba(0,0,0,0.18), 0 4px 12px -2px rgba(0,0,0,0.10), inset 0 1px 1px rgba(255,255,255,1)',
            }}
          >
            <Plus className="w-9 h-9 text-foreground" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </nav>
  );
};
