import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Menu, User, X, ChevronRight, Paperclip, UserRound, MoreHorizontal } from 'lucide-react';
import { useChatMessages, ChatMessage } from '@/hooks/useChatMessages';

interface OverlayChatBarProps {
  userId: string;
  onMenuOpen: () => void;
}

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

export const OverlayChatBar: React.FC<OverlayChatBarProps> = ({ userId, onMenuOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showEscalation, setShowEscalation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, isLoadingHistory, escalatedMode, sendMessage, requestEscalation, clearMessages } = useChatMessages(userId);
  const [showMenu, setShowMenu] = useState(false);

  // Auto-scroll when messages change
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [messages, isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setInputValue('');
    setShowMenu(false);
  };

  const handleSend = async () => {
    const msg = inputValue.trim();
    if (!msg || isLoading) return;
    setInputValue('');
    const formattedMsg = showEscalation ? `[Mit Mitarbeitern sprechen: ${msg}]` : msg;
    if (showEscalation) setShowEscalation(false);
    await sendMessage(formattedMsg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastMessages = messages.slice(-15);

  return (
    <>
      {/* Dark Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[9998]"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Chat Bubbles */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-bubbles"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-0 bottom-0 z-[9999] flex flex-col pointer-events-none"
            style={{
              background: 'linear-gradient(160deg, rgb(31, 98, 255) 0%, rgb(0, 67, 224) 50%, rgb(15, 56, 138) 100%)',
            }}
          >
            {/* Top bar with menu + close */}
            <div className="pointer-events-auto flex justify-end items-center gap-2 px-4 pb-1" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:outline-none"
                  style={{
                    background: 'rgb(255,255,255)',
                    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.12)',
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
                      className="absolute right-0 top-12 rounded-xl overflow-hidden pointer-events-auto"
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px -4px rgba(0,0,0,0.18)',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <button
                        onClick={() => { clearMessages(); setShowMenu(false); }}
                        className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left whitespace-nowrap transition-colors"
                      >
                        Chat löschen
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] focus:outline-none"
                style={{
                  background: 'rgb(255,255,255)',
                  boxShadow: '0 4px 16px -2px rgba(0,0,0,0.12)',
                }}
              >
                <X className="w-4 h-4 text-foreground" strokeWidth={2} />
              </button>
            </div>

            {/* Messages scroll area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 pb-2 pointer-events-auto"
            >
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="max-w-2xl mx-auto space-y-3 pt-6"
              >
                {isLoadingHistory ? (
                  <motion.div variants={bubbleVariants} className="flex justify-center py-8">
                    <span className="text-sm text-white/60">Nachrichten werden geladen...</span>
                  </motion.div>
                ) : lastMessages.length === 0 ? (
                  <motion.div variants={bubbleVariants} className="flex justify-center py-8">
                    <div className="text-center">
                      <p className="text-white/80 text-sm font-medium">Wie kann ich dir helfen?</p>
                      <p className="text-white/50 text-xs mt-1">Stelle mir eine Frage zu deiner Steuererklärung</p>
                    </div>
                  </motion.div>
                ) : (
                  lastMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      variants={bubbleVariants}
                      className={`flex ${message.isBot || message.isAdmin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`flex items-end gap-1.5 sm:gap-2 ${message.isBot || message.isAdmin ? 'max-w-[90%] sm:max-w-[85%]' : 'max-w-[85%] sm:max-w-[80%] flex-row-reverse'}`}>
                        {/* Avatar for bot/admin */}
                        {(message.isBot || message.isAdmin) && (
                          <div
                            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden mb-1"
                            style={{
                              background: message.isAdmin
                                ? 'linear-gradient(to bottom right, hsl(160 84% 39%), hsl(162 83% 34%))'
                                : 'transparent',
                            }}
                          >
                            {message.isAdmin ? (
                              <User className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <video
                                src="/sphere-animation.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover scale-110"
                              />
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-0.5">
                          {message.isAdmin && message.senderName && (
                            <span className="text-[10px] text-white/50 ml-1">{message.senderName}</span>
                          )}
                          <div
                            className={`px-3.5 py-2.5 rounded-[20px] text-[13px] leading-relaxed text-white`}
                            style={
                              message.isBot || message.isAdmin
                                ? {
                                    background: 'linear-gradient(160deg, rgb(0, 46, 153) 0%, rgb(0, 34, 112) 100%)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                  }
                                : {
                                    background: 'linear-gradient(160deg, rgb(31, 98, 255) 0%, rgb(0, 67, 224) 100%)',
                                    border: '1px solid hsl(222 100% 65% / 0.4)',
                                  }
                            }
                          >
                            <p className="whitespace-pre-wrap !text-white">{message.content}</p>
                          </div>
                          <span className={`text-[9px] text-white/35 ${message.isBot || message.isAdmin ? 'ml-1' : 'mr-1 text-right'}`}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}

                {/* Typing indicator */}
                {isLoading && (
                  <motion.div variants={bubbleVariants} className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.6))' }}
                      >
                        <img src="/bot-avatar.png" alt="AI" className="w-full h-full object-cover" />
                      </div>
                      <div className="px-4 py-3 rounded-[20px] bg-white/15" style={{ backdropFilter: 'blur(12px)' }}>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
                          <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Input bar (always visible at bottom when open) */}
            <div className="pointer-events-auto px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
              <div className="max-w-2xl mx-auto">
                <div
                  className="relative rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    boxShadow: '0 2px 12px -2px rgba(0,0,0,0.1)',
                  }}
                >
                  {/* Single row: textarea + icons + send */}
                  <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-[18px] py-[14px]">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={showEscalation ? "Mit Mitarbeitern sprechen..." : escalatedMode ? "Nachricht an Support..." : "Schreib eine Nachricht..."}
                      rows={1}
                      className="flex-1 min-w-0 bg-transparent text-[15px] font-medium tracking-tight outline-none resize-none placeholder:text-white/40 text-white min-h-[24px] max-h-24"
                      style={{ lineHeight: '1.5' }}
                      onInput={(e) => {
                        const textarea = e.target as HTMLTextAreaElement;
                        textarea.style.height = 'auto';
                        textarea.style.height = Math.min(textarea.scrollHeight, 96) + 'px';
                      }}
                    />

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <button className="focus:outline-none transition-colors">
                        <Paperclip className="w-5 h-5 text-white/30" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEscalation(!showEscalation)}
                        className={`rounded-full transition-all flex items-center gap-1 px-1.5 sm:px-2 py-1 border h-8 ${
                          showEscalation
                            ? 'bg-blue-500/20 border-blue-400/40 text-blue-400'
                            : 'bg-transparent border-transparent text-white/30 hover:text-white/50'
                        }`}
                      >
                        <UserRound className={`w-4 h-4 ${showEscalation ? 'text-blue-400' : ''}`} strokeWidth={1.5} />
                        <AnimatePresence>
                          {showEscalation && (
                            <motion.span
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: 'auto', opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-xs overflow-hidden whitespace-nowrap text-blue-400 flex-shrink-0 hidden sm:inline"
                            >
                              Mit Mitarbeitern sprechen
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>

                      <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none disabled:opacity-30"
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <ChevronRight className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed / Resting Input Bar */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="resting-bar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-[9999] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none"
          >
            <div className="max-w-2xl mx-auto flex items-center gap-3 pointer-events-auto">
              {/* Glass input pill */}
              <div
                onClick={handleOpen}
                className="group relative flex-1 flex items-center gap-3 sm:gap-4 rounded-full px-4 sm:px-[18px] py-[21px] h-[60px] cursor-pointer transition-all duration-200 active:scale-[0.98] overflow-hidden"
                style={{
                  background: 'linear-gradient(160deg, rgb(31, 98, 255) 0%, rgb(0, 0, 0) 100%)',
                  boxShadow: 'rgba(0, 0, 0, 0.15) 0px 6px 24px -4px, rgba(0, 0, 0, 0.1) 0px 2px 8px',
                }}
              >

                <span className="text-[15px] flex-1 select-none font-medium tracking-tight text-white truncate">
                  Wie kann ich dir helfen?
                </span>

                {/* AI Sphere */}
                <div className="flex-shrink-0 w-10 h-10 overflow-hidden" style={{ borderRadius: '9999px' }}>
                  <video
                    src="/sphere-animation.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
