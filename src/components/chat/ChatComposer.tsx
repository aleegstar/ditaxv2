import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Paperclip, UserRound, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useKeyboardDetection } from '@/hooks/useKeyboardDetection';
import { cn } from '@/lib/utils';

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
  onHeightChange?: (totalBottomReserve: number) => void;
}

const DEFAULT_COMPOSER_HEIGHT = 144;

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
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const {
    isKeyboardOpen,
    keyboardHeight,
    bottomInset,
    viewportBottom,
  } = useKeyboardDetection();

  const effectiveBottomInset = isKeyboardOpen ? keyboardHeight : bottomInset;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [value]);

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    const element = wrapperRef.current;
    const measure = () => {
      const nextHeight = element.offsetHeight || DEFAULT_COMPOSER_HEIGHT;
      setComposerHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [showEscalation, value]);

  useLayoutEffect(() => {
    if (!onHeightChange) return;
    onHeightChange(composerHeight + effectiveBottomInset + 20);
  }, [composerHeight, effectiveBottomInset, onHeightChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    onFiles(Array.from(files));
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = e.relatedTarget as Node | null;
    if (nextTarget && e.currentTarget.contains(nextTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (isLoading) return;

    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;

    onFiles(files);
  };

  if (typeof document === 'undefined') return null;

  const resolvedHeight = composerHeight || DEFAULT_COMPOSER_HEIGHT;
  // Primary positioning: anchor composer's bottom to visualViewport's bottom.
  // In Despia native we additionally clamp against (innerHeight - keyboardInset)
  // because the WebView's visualViewport can momentarily report inconsistent
  // values during keyboard animation – the clamp guarantees the input never
  // disappears behind the keyboard.
  let composerTop = Math.max(0, viewportBottom - resolvedHeight);
  if (typeof window !== 'undefined') {
    const safeMax = window.innerHeight - resolvedHeight - effectiveBottomInset;
    if (safeMax > 0 && composerTop > safeMax) composerTop = safeMax;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70]"
      style={{
        transform: `translate3d(0, ${composerTop}px, 0)`,
        willChange: 'transform',
      }}
    >
      <div
        ref={wrapperRef}
        className={cn(
          'pointer-events-auto px-4 pt-2 sm:px-5',
          isKeyboardOpen
            ? 'pb-2'
            : 'pb-[calc(12px+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]'
        )}
      >
        <div className="mx-auto max-w-[680px]">
          {showEscalation && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-[11.5px] text-foreground shadow-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-accent text-foreground">
                <UserRound className="h-3.5 w-3.5" strokeWidth={1.9} />
              </div>
              <span className="min-w-0 flex-1 font-medium leading-tight">
                Deine Nachricht geht direkt an unser Support-Team
              </span>
              <button
                type="button"
                onClick={onCloseEscalation}
                className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Support-Hinweis schliessen"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.1} />
              </button>
            </div>
          )}

          <div
            className={cn(
              'rounded-[28px] border border-border bg-card shadow-[0_8px_28px_-16px_rgba(15,27,61,0.18)] backdrop-blur-sm transition-all duration-200',
              isDragging && 'border-primary/40 bg-accent/60 shadow-[0_14px_36px_-18px_rgba(15,27,61,0.22)]'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={handleFileChange}
            />

            <div className="px-4 pt-3">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isDragging ? 'Datei hier ablegen …' : placeholder}
                rows={1}
                className="min-h-[24px] max-h-[160px] w-full resize-none bg-transparent text-[15px] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground/60"
                onInput={(e) => {
                  const textarea = e.currentTarget;
                  textarea.style.height = 'auto';
                  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Datei anhängen"
                >
                  <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </button>

                <button
                  type="button"
                  onClick={onToggleEscalation}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors',
                    showEscalation
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  aria-pressed={showEscalation}
                >
                  <UserRound className="h-[15px] w-[15px]" strokeWidth={1.9} />
                  <span>Support</span>
                </button>
              </div>

              <Button
                type="button"
                size="icon"
                onClick={onSend}
                disabled={!value.trim() || isLoading}
                className="h-9 w-9 rounded-full shadow-none disabled:opacity-40"
                aria-label="Nachricht senden"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};