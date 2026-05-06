import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, ChevronRight, Paperclip, UserRound, MoreHorizontal } from 'lucide-react';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useI18n } from '@/contexts/I18nContext';

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const bubbleVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, damping: 25, stiffness: 350 } },
  exit: { opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.15 } },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

const Chat: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, isLoadingHistory, escalatedMode, sendMessage, clearMessages } =
    useChatMessages(userId || '');

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [messages]);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handleSend = async () => {
    const msg = inputValue.trim();
    if (!msg || isLoading) return;
    setInputValue('');
    const formatted = showEscalation ? `[Mit Mitarbeitern sprechen: ${msg}]` : msg;
    if (showEscalation) setShowEscalation(false);
    await sendMessage(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isValid || !userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  const lastMessages = messages.slice(-50);

  return (
    <div
      className="fixed inset-0 z-[40] flex flex-col overflow-hidden"
      style={{ background: 'hsl(45, 40%, 98%)' }}
    >
      {/* Top bar */}
      <div
        className="flex justify-between items-center gap-2 px-4 pb-3 border-b border-border"
        style={{ paddingTop: 'calc(12px + var(--safe-area-top, env(safe-area-inset-top, 0px)))' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm relative overflow-hidden flex-shrink-0"
            style={{
              background: escalatedMode
                ? 'linear-gradient(to bottom right, hsl(160 84% 39%), hsl(162 83% 34%))'
                : 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.6))',
            }}
          >
            {escalatedMode ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <img src="/bot-avatar.png" alt="AI Assistant" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-semibold text-base tracking-tight text-foreground leading-tight truncate">
              {escalatedMode ? 'Support-Team' : 'Steuer-Assistent'}
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="relative w-2 h-2 bg-emerald-500 rounded-full">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
              </div>
              <span className="text-xs font-medium text-emerald-600">Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:outline-none bg-card"
              style={{
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.08)',
                border: '1px solid hsl(var(--border) / 0.6)',
              }}
            >
              <MoreHorizontal className="w-4 h-4 text-foreground" strokeWidth={2} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 rounded-xl overflow-hidden bg-card z-10"
                  style={{
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px -4px rgba(0,0,0,0.12)',
                    border: '1px solid hsl(var(--border) / 0.6)',
                  }}
                >
                  <button
                    onClick={() => {
                      clearMessages();
                      setShowMenu(false);
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 w-full text-left whitespace-nowrap transition-colors"
                  >
                    Chat löschen
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:outline-none bg-card"
            style={{
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.08)',
              border: '1px solid hsl(var(--border) / 0.6)',
            }}
          >
            <X className="w-4 h-4 text-foreground" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-2xl mx-auto space-y-3 pt-6"
        >
          {isLoadingHistory ? (
            <motion.div variants={bubbleVariants} className="flex justify-center py-8">
              <span className="text-sm text-muted-foreground">Nachrichten werden geladen...</span>
            </motion.div>
          ) : lastMessages.length === 0 ? (
            <motion.div variants={bubbleVariants} className="flex justify-center py-8">
              <div className="text-center">
                <p className="text-foreground text-sm font-medium">Wie kann ich dir helfen?</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Stelle mir eine Frage zu deiner Steuererklärung
                </p>
              </div>
            </motion.div>
          ) : (
            lastMessages.map((message) => (
              <motion.div
                key={message.id}
                variants={bubbleVariants}
                className={`flex ${message.isBot || message.isAdmin ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`flex items-end gap-1.5 sm:gap-2 ${
                    message.isBot || message.isAdmin
                      ? 'max-w-[90%] sm:max-w-[85%]'
                      : 'max-w-[85%] sm:max-w-[80%] flex-row-reverse'
                  }`}
                >
                  {(message.isBot || message.isAdmin) && (
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden mb-1"
                      style={{
                        background: message.isAdmin
                          ? 'linear-gradient(to bottom right, hsl(160 84% 39%), hsl(162 83% 34%))'
                          : 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.6))',
                      }}
                    >
                      {message.isAdmin ? (
                        <User className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <img src="/bot-avatar.png" alt="Ditax" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    {message.isAdmin && message.senderName && (
                      <span className="text-[10px] text-muted-foreground ml-1">{message.senderName}</span>
                    )}
                    <div
                      className={`px-3.5 py-2.5 rounded-[20px] text-[13px] leading-relaxed ${
                        message.isBot || message.isAdmin ? 'text-foreground' : 'text-white'
                      }`}
                      style={
                        message.isBot || message.isAdmin
                          ? {
                              background: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border) / 0.6)',
                              boxShadow: '0 1px 2px hsl(var(--foreground) / 0.04)',
                            }
                          : {
                              background: 'linear-gradient(160deg, rgb(31, 98, 255) 0%, rgb(0, 67, 224) 100%)',
                              border: '1px solid hsl(222 100% 65% / 0.4)',
                            }
                      }
                    >
                      <p
                        className={`whitespace-pre-wrap ${
                          message.isBot || message.isAdmin ? 'text-foreground' : 'text-white'
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] text-muted-foreground/70 ${
                        message.isBot || message.isAdmin ? 'ml-1' : 'mr-1 text-right'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {isLoading && (
            <motion.div variants={bubbleVariants} className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <video
                    src="/sphere-animation.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
                <div
                  className="px-4 py-3 rounded-[20px] bg-card border border-border/60"
                  style={{ boxShadow: '0 1px 2px hsl(var(--foreground) / 0.04)' }}
                >
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Input */}
      <div
        className="px-4 pt-2"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 84px + 12px)' }}
      >
        <div className="max-w-2xl mx-auto">
          <div
            className="relative rounded-full bg-card"
            style={{
              border: '1px solid hsl(var(--border) / 0.7)',
              boxShadow: '0 2px 12px -2px hsl(var(--foreground) / 0.06)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-[18px] py-[14px]">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  showEscalation
                    ? 'Mit Mitarbeitern sprechen...'
                    : escalatedMode
                    ? 'Nachricht an Support...'
                    : 'Schreib eine Nachricht...'
                }
                rows={1}
                className="flex-1 min-w-0 bg-transparent text-[15px] font-medium tracking-tight outline-none resize-none placeholder:text-muted-foreground/60 text-foreground min-h-[24px] max-h-24"
                style={{ lineHeight: '1.5' }}
                onInput={(e) => {
                  const ta = e.target as HTMLTextAreaElement;
                  ta.style.height = 'auto';
                  ta.style.height = Math.min(ta.scrollHeight, 96) + 'px';
                }}
              />

              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button className="focus:outline-none transition-colors">
                  <Paperclip className="w-5 h-5 text-muted-foreground/60" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEscalation(!showEscalation)}
                  className={`rounded-full transition-all flex items-center gap-1 px-1.5 sm:px-2 py-1 border h-8 ${
                    showEscalation
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-transparent border-transparent text-muted-foreground/60 hover:text-foreground'
                  }`}
                >
                  <UserRound className={`w-4 h-4 ${showEscalation ? 'text-primary' : ''}`} strokeWidth={1.5} />
                  <AnimatePresence>
                    {showEscalation && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 'auto', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs overflow-hidden whitespace-nowrap text-primary flex-shrink-0 hidden sm:inline"
                      >
                        Mit Mitarbeitern sprechen
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none disabled:opacity-30 text-primary-foreground"
                  style={{
                    background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(221 100% 47%) 100%)',
                    boxShadow: '0 2px 8px -2px hsl(var(--primary) / 0.4)',
                  }}
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
