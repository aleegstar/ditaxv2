import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DocumentsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// Lazy import the full Documents page
const LazyDocuments = React.lazy(() => import('@/pages/Documents'));

export const DocumentsOverlay: React.FC<DocumentsOverlayProps> = ({ isOpen, onClose }) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('hide-bottom-navbar');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-bottom-navbar');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-bottom-navbar');
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="documents-overlay"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9998] flex flex-col"
          style={{
            background: 'linear-gradient(180deg, hsl(222, 30%, 8%) 0%, hsl(222, 40%, 12%) 60%, hsl(220, 80%, 30%) 100%)',
          }}
        >
          {/* Top bar with close button */}
          <div 
            className="flex justify-end items-center gap-2 px-4 pb-1"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
          >
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.12)',
              }}
            >
              <X className="w-4 h-4 text-foreground" strokeWidth={2} />
            </button>
          </div>

          {/* Documents content area */}
          <div className="flex-1 overflow-y-auto rounded-t-[28px] bg-background mt-1">
            <React.Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-border border-t-foreground/40 rounded-full animate-spin" />
              </div>
            }>
              <LazyDocuments />
            </React.Suspense>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
