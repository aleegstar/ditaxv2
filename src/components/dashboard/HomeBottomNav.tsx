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
          className="flex items-center rounded-full bg-white pl-6 pr-1.5 py-1.5 ring-1 ring-black/[0.04]"
          style={{
            boxShadow:
              '0 20px 40px -16px rgba(0,0,0,0.16), 0 8px 16px -6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.03), inset 0 1.5px 3px rgba(255,255,255,1)',
          }}
        >
          <div className="flex items-center pr-4">
            <button
              onClick={onChatClick}
              aria-label="Chat"
              className="group flex items-center justify-center focus:outline-none transition-transform active:scale-[0.94]"
            >
              <MessageSquare
                className="w-[22px] h-[22px] text-foreground transition-transform duration-200 group-hover:-translate-y-0.5"
                strokeWidth={2}
                fill="currentColor"
                strokeLinejoin="round"
              />
            </button>
          </div>

          <button
            onClick={onActionClick ?? onDocumentsClick}
            aria-label="Hinzufügen"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-white ring-1 ring-black/[0.05] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none shrink-0"
            style={{
              boxShadow:
                '0 10px 24px -8px rgba(0,0,0,0.16), 0 3px 8px -2px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,1)',
            }}
          >
            <Plus className="w-[22px] h-[22px] text-foreground" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </nav>
  );
};
