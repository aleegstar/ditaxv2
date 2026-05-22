import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FolderOpen, Sparkles, Headphones, ArrowUpRight, Paperclip, User, ArrowUp, Loader2, ChevronDown, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ditaxLogo from '@/assets/ditax-logo-icon.png';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface InlineMsg {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

const SUGGESTIONS = [
  { label: 'Welche Unterlagen brauche ich?', icon: FileText },
  { label: 'Wo lade ich Dokumente hoch?', icon: FolderOpen },
  { label: 'Was kann ich abziehen?', icon: Sparkles },
];

interface DashboardChatCardProps {
  taxYear?: number;
}

export const DashboardChatCard: React.FC<DashboardChatCardProps> = ({ taxYear }) => {
  const navigate = useNavigate();
  const { activeTaxFiler } = useTaxFiler();
  const { userId } = useAuthValidation();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<InlineMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentTaxYear = taxYear ?? new Date().getFullYear() - 1;
  const filerLabel = activeTaxFiler?.first_name || null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const goToSupport = () => {
    navigate('/chat?escalate=1');
  };

  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading || !userId) return;
    setInput('');

    const userMsg: InlineMsg = { id: uuidv4(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chatbot-response', {
        body: {
          message: text,
          sessionId,
          ephemeral: true,
          activeTaxFilerId: activeTaxFiler?.id ?? null,
          activeTaxFilerName: activeTaxFiler?.first_name ?? null,
          activeTaxYear: currentTaxYear,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages(prev => [...prev, { id: uuidv4(), role: 'bot', content: data.response }]);
    } catch (err: any) {
      console.error('Dashboard chat error:', err);
      toast({
        title: 'Fehler',
        description: 'Antwort konnte nicht geladen werden. Bitte versuche es erneut.',
        variant: 'destructive',
      });
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'bot',
        content: 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="hidden md:block mt-16 mb-8">
      <div className="mb-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.18em]">
          Hilfe & Assistent
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mb-5 text-center">
        <h2 className="text-[20px] font-semibold text-foreground tracking-[-0.018em]">
          Brauchst du Hilfe?
        </h2>
        <p className="text-[13px] text-muted-foreground/75 mt-1">
          Stell deine Frage – dein persönlicher Assistent antwortet sofort.
        </p>
      </div>

      <div className="rounded-3xl bg-card border border-border overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <div className="w-11 h-11 rounded-full ring-1 ring-border bg-muted flex items-center justify-center flex-shrink-0">
            <img src={ditaxLogo} alt="Ditax" className="w-7 h-7 object-contain" />
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

        {/* Suggestions OR conversation */}
        {messages.length === 0 && !isLoading ? (
          <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.label)}
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
            <button
              onClick={goToSupport}
              className="group flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-card border border-border hover:border-foreground/15 hover:bg-muted/30 text-left transition-colors sm:col-span-2"
            >
              <Headphones className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" strokeWidth={1.75} />
              <span className="text-[12.5px] text-foreground/85 truncate flex-1">Mit Support sprechen</span>
              <ArrowUpRight
                className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors flex-shrink-0"
                strokeWidth={2}
              />
            </button>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="px-6 pb-5 max-h-[340px] overflow-y-auto space-y-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'bg-muted/50 text-foreground border border-border'
                  }`}
                >
                  {m.role === 'bot' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-3.5 py-2.5 bg-muted/50 border border-border text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[12.5px]">Assistent denkt nach …</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-border bg-[#FAFAF7] px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="rounded-2xl bg-card border border-border focus-within:border-foreground/20 transition-colors"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder={`Frage zur Steuererklärung ${currentTaxYear}${filerLabel ? ` von ${filerLabel}` : ''}...`}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goToSupport}
                  className="h-8 px-2 rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Anhang via Support"
                >
                  <Paperclip className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={goToSupport}
                  className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  <User className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Support
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 rounded-full bg-foreground/85 hover:bg-foreground text-background flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Senden"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.25} />}
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
