import React from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

/**
 * Floating "Apple Intelligence"-style chat trigger pill.
 * Shows at the bottom center; opens the OverlayChatBar on click.
 */
export const AIChatTrigger: React.FC = () => {
  const { chatOverlayOpen, setChatOverlayOpen } = useSidebar();

  if (chatOverlayOpen) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none flex justify-center"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <button
        onClick={() => setChatOverlayOpen(true)}
        className="pointer-events-auto group relative flex items-center gap-3 rounded-full pl-6 pr-2 py-2 transition-all duration-300 active:scale-[0.98] hover:scale-[1.01] focus:outline-none"
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #1e3a8a 100%)',
          boxShadow:
            '0 10px 32px -6px rgba(30, 58, 138, 0.45), 0 4px 12px -2px rgba(30, 58, 138, 0.3), inset 0 1px 0 rgba(255,255,255,0.18)',
          minWidth: 240,
        }}
      >
        <span className="text-[15px] font-medium tracking-tight text-white whitespace-nowrap">
          Wie kann ich dir helfen?
        </span>
        <span className="ml-auto w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
          <video
            src="/sphere-animation.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-110"
          />
        </span>
      </button>
    </div>
  );
};
