import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  User,
  X,
  MoreHorizontal,
  Sparkles,
  FileText,
  FolderOpen,
  Headphones,
  ArrowUpRight,
} from 'lucide-react';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { useChatMessages } from '@/hooks/useChatMessages';

import { useI18n } from '@/contexts/I18nContext';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import assistantAvatar from '@/assets/ditax-logo-icon.png';

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const bubbleVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.2, 0.8, 0.2, 1] as any } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const Chat: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { activeTaxFiler } = useTaxFiler();
  const [inputValue, setInputValue] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, isLoading, isLoadingHistory, escalatedMode, sendMessage, clearMessages } =
    useChatMessages(userId || '');

  const currentTaxYear = new Date().getFullYear() - 1;

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (override?: string) => {
      const msg = (override ?? inputValue).trim();
      if (!msg || isLoading) return;
      if (!override) setInputValue('');
      const formatted = showEscalation ? `[Mit Mitarbeitern sprechen: ${msg}]` : msg;
      if (showEscalation) setShowEscalation(false);
      await sendMessage(formatted);
    },
    [inputValue, isLoading, showEscalation, sendMessage]
  );

  const handleFiles = useCallback(
    async (fileArr: File[]) => {
      const caption = inputValue.trim();
      if (caption) setInputValue('');
      const content = caption || fileArr[0].name;
      const formatted = showEscalation ? `[Mit Mitarbeitern sprechen: ${content}]` : content;
      if (showEscalation) setShowEscalation(false);
      await sendMessage(formatted, fileArr);
    },
    [inputValue, showEscalation, sendMessage]
  );


  if (!isValid || !userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  const lastMessages = messages.slice(-50);

  const suggestions = [
    { label: 'Welche Unterlagen brauche ich?', icon: FileText },
    { label: 'Wo lade ich Dokumente hoch?', icon: FolderOpen },
    { label: 'Was kann ich abziehen?', icon: Sparkles },
    { label: 'Mit Support sprechen', icon: Headphones, escalate: true },
  ];

  const quickActions = useMemo(
    () => [
      { label: 'Dokumente öffnen', onClick: () => navigate('/documents') },
      { label: 'Steuererklärung', onClick: () => navigate('/') },
      { label: 'Hilfe-Center', onClick: () => navigate('/help') },
    ],
    [navigate]
  );

  // Group messages by sender to reduce avatar repetition
  const groupedMessages = useMemo(() => {
    return lastMessages.map((m, i) => {
      const prev = lastMessages[i - 1];
      const sameAuthor =
        prev &&
        prev.isBot === m.isBot &&
        prev.isAdmin === m.isAdmin &&
        m.timestamp.getTime() - prev.timestamp.getTime() < 2 * 60 * 1000;
      return { ...m, isGrouped: !!sameAuthor };
    });
  }, [lastMessages]);

  const filerLabel = activeTaxFiler
    ? [activeTaxFiler.first_name, activeTaxFiler.last_name].filter(Boolean).join(' ')
    : null;
  

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background md:h-full md:flex-none md:min-h-0">


      {/* Header */}
      <div
        className="border-b border-border/70 bg-background/95 backdrop-blur-sm"
        style={{ paddingTop: 'calc(10px + var(--safe-area-top, env(safe-area-inset-top, 0px)))' }}
      >
        <div className="max-w-[720px] mx-auto px-5 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden flex-shrink-0 ring-1 ring-border bg-white"
            >
              {escalatedMode ? (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(162 83% 30%))' }}
                >
                  <User className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
              ) : (
                <img src={assistantAvatar} alt="Steuer-Assistent" className="w-7 h-7 object-contain" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground leading-tight truncate">
                  {escalatedMode ? 'Support-Team' : 'Steuer-Assistent'}
                </h1>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] text-muted-foreground/85 truncate">
                  {escalatedMode ? 'Antwortzeit < 4 Std' : 'Antwortet in Sekunden'}
                  {filerLabel && <span className="text-muted-foreground/45"> · {filerLabel}</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-background border border-border hover:bg-muted/50 transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-10 min-w-[180px] rounded-xl overflow-hidden bg-background border border-border shadow-lg z-10"
                  >
                    <button
                      onClick={() => {
                        clearMessages();
                        setShowMenu(false);
                      }}
                      className="px-3.5 py-2.5 text-[12.5px] font-medium text-destructive hover:bg-destructive/[0.06] w-full text-left whitespace-nowrap transition-colors"
                    >
                      Chatverlauf löschen
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-background border border-border hover:bg-muted/50 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages (scroll container — Despia fixed-frame middle zone) */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto"
      >

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-[680px] mx-auto px-5 pt-8 space-y-1"
          style={{
            paddingBottom:
              'calc(16px + var(--keyboard-inset, 0px) + var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)))',
          }}
        >
          {isLoadingHistory ? (
            <div className="flex justify-center py-12">
              <span className="text-[12.5px] text-muted-foreground/70">Nachrichten werden geladen...</span>
            </div>
          ) : lastMessages.length === 0 ? (
            <motion.div variants={bubbleVariants} className="py-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full ring-1 ring-border bg-white flex-shrink-0 flex items-center justify-center">
                  <img src={assistantAvatar} alt="Steuer-Assistent" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-foreground tracking-[-0.012em]">
                    Wie kann ich dir helfen?
                  </p>
                  <p className="text-[12.5px] text-muted-foreground/80 mt-0.5">
                    Dein persönlicher Assistent für die Steuererklärung {currentTaxYear}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      if (s.escalate) setShowEscalation(true);
                      handleSend(s.label);
                    }}
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
            </motion.div>
          ) : (
            groupedMessages.map((message, idx) => {
              const isAssistant = message.isBot || message.isAdmin;
              const isLast = idx === groupedMessages.length - 1;
              return (
                <motion.div
                  key={message.id}
                  variants={bubbleVariants}
                  className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} ${
                    message.isGrouped ? 'pt-1' : 'pt-4'
                  }`}
                >
                  <div
                    className={`flex gap-2.5 ${
                      isAssistant ? 'max-w-[92%]' : 'max-w-[80%] flex-row-reverse'
                    }`}
                  >
                    {isAssistant && (
                      <div className="w-7 flex-shrink-0 pt-0.5">
                        {!message.isGrouped && (
                          message.isAdmin ? (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center ring-1 ring-border"
                              style={{ background: 'linear-gradient(135deg, hsl(160 84% 39%), hsl(162 83% 30%))' }}
                            >
                              <User className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-border bg-white">
                              <img src={assistantAvatar} alt="" className="w-full h-full object-cover" />
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-1 min-w-0">
                      {!message.isGrouped && (
                        <div
                          className={`flex items-center gap-1.5 text-[10.5px] ${
                            isAssistant ? '' : 'justify-end'
                          }`}
                        >
                          <span className="font-semibold text-foreground/80 tracking-[-0.005em]">
                            {message.isAdmin
                              ? message.senderName || 'Support'
                              : message.isBot
                              ? 'Assistent'
                              : 'Du'}
                          </span>
                          <span className="text-muted-foreground/55 tabular-nums">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      )}

                      {isAssistant ? (
                        <div className="text-[13.5px] leading-[1.65] text-foreground/90 prose-chat">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => (
                                <ul className="my-2 space-y-1 list-none pl-0">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="my-2 space-y-1 list-decimal pl-5 marker:text-muted-foreground/60">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="flex gap-2 [ol_&]:block">
                                  <span className="text-primary/60 mt-[7px] w-1 h-1 rounded-full bg-primary/60 flex-shrink-0 [ol_&]:hidden" />
                                  <span className="flex-1">{children}</span>
                                </li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-foreground">{children}</strong>
                              ),
                              code: ({ children }) => (
                                <code className="px-1 py-0.5 rounded bg-muted text-[12px] font-mono text-foreground">
                                  {children}
                                </code>
                              ),
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                                >
                                  {children}
                                </a>
                              ),
                              h1: ({ children }) => (
                                <h3 className="text-[14px] font-semibold text-foreground mt-3 mb-1.5 tracking-[-0.01em]">
                                  {children}
                                </h3>
                              ),
                              h2: ({ children }) => (
                                <h3 className="text-[13.5px] font-semibold text-foreground mt-3 mb-1.5 tracking-[-0.01em]">
                                  {children}
                                </h3>
                              ),
                              h3: ({ children }) => (
                                <h4 className="text-[13px] font-semibold text-foreground mt-2.5 mb-1">
                                  {children}
                                </h4>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>

                          {message.isBot && isLast && !isLoading && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/60">
                              {quickActions.map((a) => (
                                <button
                                  key={a.label}
                                  onClick={a.onClick}
                                  className="text-[11.5px] font-medium px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
                                >
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className="px-3.5 py-2.5 rounded-2xl rounded-tr-md text-[13.5px] leading-[1.55] text-white whitespace-pre-wrap"
                          style={{
                            background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1B3D 100%)',
                          }}
                        >
                          {message.content}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {isLoading && (
            <motion.div variants={bubbleVariants} className="flex justify-start pt-4">
              <div className="flex gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center ring-1 ring-black/[0.06] flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0F1B3D 100%)' }}
                >
                  <Sparkles className="w-3 h-3 text-white animate-pulse" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-2 pt-1.5">
                  <span className="text-[12.5px] text-muted-foreground/75 italic">Denkt nach</span>
                  <span className="flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce" />
                    <span
                      className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <span
                      className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Composer — native Despia autoscroll lifts the focused input above the keyboard */}
      <div className="flex-shrink-0 border-t border-border/60 bg-background">
        <ChatComposer
          value={inputValue}
          onChange={setInputValue}
          onSend={() => handleSend()}
          onFiles={handleFiles}
          placeholder={
            showEscalation
              ? 'Beschreibe dein Anliegen für unser Team...'
              : escalatedMode
              ? 'Nachricht an Support...'
              : `Frage zur Steuererklärung ${currentTaxYear}...`
          }
          isLoading={isLoading}
          showEscalation={showEscalation}
          onToggleEscalation={() => setShowEscalation((v) => !v)}
          onCloseEscalation={() => setShowEscalation(false)}
        />
      </div>
    </div>
  );
};

export default Chat;
