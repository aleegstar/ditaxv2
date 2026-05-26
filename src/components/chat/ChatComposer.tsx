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
  const composerTop = Math.max(0, viewportBottom - resolvedHeight);

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
              'overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-[0_10px_30px_-18px_rgba(15,27,61,0.18)] backdrop-blur-sm transition-all duration-200',
              isDragging && 'border-primary/30 bg-accent/70 shadow-[0_14px_36px_-18px_rgba(15,27,61,0.22)]'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-end gap-2 px-3 pb-3 pt-3">
              <div className="flex items-center gap-1 self-end pb-1">
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
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Datei anhängen"
                >
                  <Paperclip className="h-4 w-4" strokeWidth={1.9} />
                </button>

                <button
                  type="button"
                  onClick={onToggleEscalation}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-[12px] font-medium transition-colors',
                    showEscalation
                      ? 'border-primary/20 bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  aria-pressed={showEscalation}
                >
                  <UserRound className="h-3.5 w-3.5" strokeWidth={1.9} />
                  <span className="hidden sm:inline">Support</span>
                </button>
              </div>

              <div className="min-w-0 flex-1 rounded-[24px] border border-border bg-background px-4 py-3 shadow-sm transition-colors focus-within:border-primary/20 focus-within:bg-card">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={1}
                  className="min-h-[24px] max-h-[160px] w-full resize-none bg-transparent text-[15px] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground/70"
                  onInput={(e) => {
                    const textarea = e.currentTarget;
                    textarea.style.height = 'auto';
                    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
                  }}
                />

                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground/75">
                  <span className="truncate">{isDragging ? 'Datei hier ablegen' : 'Enter zum Senden'}</span>
                  <span className="shrink-0">Anhänge, PDF, Word, Excel</span>
                </div>
              </div>

              <Button
                type="button"
                size="icon"
                onClick={onSend}
                disabled={!value.trim() || isLoading}
                className="h-11 w-11 self-end rounded-2xl shadow-none"
                aria-label="Nachricht senden"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.1} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};