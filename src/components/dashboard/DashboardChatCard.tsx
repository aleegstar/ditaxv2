import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FolderOpen, Sparkles, Headphones, ArrowUpRight, Paperclip, User, ArrowUp } from 'lucide-react';
import assistantAvatar from '@/assets/assistant-avatar.webp';
import { useTaxFiler } from '@/contexts/TaxFilerContext';

const SUGGESTIONS = [
  { label: 'Welche Unterlagen brauche ich?', icon: FileText },
  { label: 'Wo lade ich Dokumente hoch?', icon: FolderOpen },
  { label: 'Was kann ich abziehen?', icon: Sparkles },
  { label: 'Mit Support sprechen', icon: Headphones, escalate: true },
];

export const DashboardChatCard: React.FC = () => {
  const navigate = useNavigate();
  const { activeTaxFiler } = useTaxFiler();
  const [input, setInput] = useState('');

  const currentTaxYear = new Date().getFullYear() - 1;
  const filerLabel = activeTaxFiler?.first_name || null;

  const openChat = (prefill?: string, escalate?: boolean) => {
    const params = new URLSearchParams();
    if (prefill) params.set('q', prefill);
    if (escalate) params.set('escalate', '1');
    const qs = params.toString();
    navigate(`/chat${qs ? `?${qs}` : ''}`);
  };

  return (
    <section className="hidden md:block mt-12 mb-8">
      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <div className="w-11 h-11 rounded-full ring-1 ring-border bg-muted flex items-center justify-center flex-shrink-0">
            <img src={assistantAvatar} alt="Steuer-Assistent" className="w-7 h-7 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-foreground tracking-[-0.012em] leading-tight">
              Wie kann ich dir helfen?
            </p>
            <p className="text-[12.5px] text-muted-foreground/80 mt-0.5">
              Dein persönlicher Assistent für die Steuererklärung {currentTaxYear}
              {filerLabel && <span className="text-muted-foreground/45"> · {filerLabel}</span>}
            </p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => openChat(s.label, s.escalate)}
              className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-card border border-border hover:border-foreground/15 hover:bg-muted/30 text-left transition-colors"
            >
              <s.icon className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-[12.5px] text-foreground/85 truncate flex-1">{s.label}</span>
              <ArrowUpRight
                className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors flex-shrink-0"
                strokeWidth={2}
              />
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-[#FAFAF7] px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              openChat(input.trim() || undefined);
            }}
            className="rounded-2xl bg-card border border-border focus-within:border-foreground/20 transition-colors"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  openChat(input.trim() || undefined);
                }
              }}
              rows={1}
              placeholder={`Frage zur Steuererklärung ${currentTaxYear}...`}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openChat()}
                  className="h-8 px-2 rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Anhang"
                >
                  <Paperclip className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => openChat(undefined, true)}
                  className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  <User className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Support
                </button>
              </div>
              <button
                type="submit"
                className="w-8 h-8 rounded-full bg-foreground/85 hover:bg-foreground text-background flex items-center justify-center transition-colors"
                aria-label="Senden"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.25} />
              </button>
            </div>
          </form>
          <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
            KI-Antworten können Fehler enthalten · Drücke Enter zum Senden
          </p>
        </div>
      </div>
    </section>
  );
};

export default DashboardChatCard;
