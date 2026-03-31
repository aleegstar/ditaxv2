import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DocsChatBotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DocsChatBot: React.FC<DocsChatBotProps> = ({ open, onOpenChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: Message = { role: 'user', content: q };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('docs-chatbot', {
        body: { messages: updatedMessages },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Entschuldigung, ich konnte keine Antwort generieren.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={() => onOpenChange(false)} />
      <div className="relative w-full sm:max-w-md h-[70vh] sm:h-[500px] bg-background border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">DiTax KI-Assistent</span>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-primary/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Frag mich etwas zur DiTax App!</p>
              <p className="text-xs text-muted-foreground/60 mt-1">z.B. &quot;Wie lade ich Dokumente hoch?&quot;</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/70 text-foreground'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted/70 rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border/40">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Frage stellen..."
              className="flex-1 h-10 px-4 rounded-xl bg-muted/50 border border-border/40 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
