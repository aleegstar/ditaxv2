import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Paperclip, UserRound, X } from 'lucide-react';

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onFiles: (files: File[]) => void;
  placeholder: string;
  isLoading: boolean;
  showEscalation: boolean;
  onToggleEscalation: () => void;
  onCloseEscalation: () => void;
  /** Called whenever the composer's measured height changes (incl. keyboard inset) */
  onHeightChange?: (totalBottomReserve: number) => void;
}

/**
 * Standalone, portal-rendered chat composer that anchors itself exactly to the
 * bottom of the visual viewport. This is robust against mobile/WebView quirks
 * where the layout viewport doesn't shrink when the on-screen keyboard appears
 * (iOS Safari, Despia WebView, some Android browsers).
 *
 * Strategy:
 *  - Render into document.body via portal so no ancestor transform/overflow can
 *    break `position: fixed`.
 *  - Use `transform: translateY(-bottomInset)` instead of `bottom` so we never
 *    fight against safe-area-inset values.
 *  - Measure our own height with ResizeObserver and report it up so the
 *    message list can reserve exactly the right amount of bottom padding.
 */
export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChange,
  onSend,
  onFiles,
  placeholder,
  isLoading,
  showEscalation,
  onToggleEscalation,
  onCloseEscalation,
  onHeightChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [bottomInset, setBottomInset] = useState(0);

  // Track visualViewport bottom inset (keyboard height) directly here.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf: number | null = null;

    const compute = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setBottomInset(0);
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setBottomInset(inset);
    };

    const schedule = () => {
      if (raf != null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = null;
        compute();
      });
    };

    compute();
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('focusin', schedule, true);
    document.addEventListener('focusout', schedule, true);

    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.removeEventListener('focusin', schedule, true);
      document.removeEventListener('focusout', schedule, true);
    };
  }, []);

  // Autofocus
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Report measured height (incl. inset) upward.
  useLayoutEffect(() => {
    if (!wrapperRef.current || !onHeightChange) return;
    const el = wrapperRef.current;
    const report = () => onHeightChange(el.offsetHeight + bottomInset + 16);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bottomInset, onHeightChange, showEscalation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    e.target.value = '';
    onFiles(arr);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={wrapperRef}
      className="fixed left-0 right-0 bottom-0 z-[60] px-5 pt-3 border-t border-border/40 bg-background/95 backdrop-blur-sm"
      style={{
        // Use transform instead of `bottom` so safe-area-inset doesn't fight us.
        transform: `translateY(-${bottomInset}px)`,
        paddingBottom:
          bottomInset > 0
            ? '10px'
            : 'calc(14px + var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)))',
        willChange: 'transform',
      }}
    >
      <div className="max-w-[680px] mx-auto">
        {showEscalation && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-[11.5px] text-emerald-700">
            <UserRound className="w-3 h-3" strokeWidth={2} />
            <span className="font-medium">Deine Nachricht geht direkt an unser Support-Team</span>
            <button
              onClick={onCloseEscalation}
              className="ml-auto text-emerald-700/60 hover:text-emerald-700"
            >
              <X className="w-3 h-3" strokeWidth={2.25} />
            </button>
          </div>
        )}
        <div className="relative rounded-2xl bg-card border border-border shadow-[0_2px_12px_-4px_rgba(15,27,61,0.08)] focus-within:border-foreground/20 focus-within:shadow-[0_4px_20px_-6px_rgba(15,27,61,0.12)] transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full bg-transparent text-[14px] leading-[1.55] tracking-[-0.005em] outline-none resize-none placeholder:text-muted-foreground/55 text-foreground px-4 pt-3.5 pb-1 min-h-[44px] max-h-[160px]"
            onInput={(e) => {
              const ta = e.target as HTMLTextAreaElement;
              ta.style.height = 'auto';
              ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
            }}
          />
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <div className="flex items-center gap-0.5">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Anhang"
              >
                <Paperclip className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={onToggleEscalation}
                className={`h-8 inline-flex items-center gap-1.5 px-2 rounded-lg text-[11.5px] font-medium transition-colors ${
                  showEscalation
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <UserRound className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span className="hidden sm:inline">Support</span>
              </button>
            </div>
            <button
              onClick={onSend}
              disabled={!value.trim() || isLoading}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1B3D 100%)' }}
              aria-label="Senden"
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
        <p className="text-[10.5px] text-muted-foreground/50 mt-2 text-center tracking-[-0.005em]">
          KI-Antworten können Fehler enthalten · Drücke Enter zum Senden
        </p>
      </div>
    </div>,
    document.body
  );
};
