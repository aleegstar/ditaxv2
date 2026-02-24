import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Clock, CheckCircle, Bot, Download, FileText, Image } from 'lucide-react';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { QuickReplySelector } from './QuickReplySelector';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';

interface ChatMessage {
  id: string;
  content?: string;
  sender_id: string;
  recipient_id?: string;
  created_at: Date;
  read?: boolean;
  attachment?: {
    id: string;
    file_name: string;
    file_type: string;
    file_path: string;
    original_size: number;
    encrypted?: boolean;
  };
  senderName: string;
  isCurrentUser: boolean;
}
interface EscalatedChatWindowProps {
  userId: string;
  adminId?: string;
  isAdmin?: boolean;
  onTakeOver?: (userId: string) => void;
  onResolve?: (userId: string) => void;
  onHandoverToBot?: (userId: string) => void;
}
export const EscalatedChatWindow: React.FC<EscalatedChatWindowProps> = ({
  userId,
  adminId,
  isAdmin = false,
  onTakeOver,
  onResolve,
  onHandoverToBot
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHandled, setIsHandled] = useState(false);
  const [handledBy, setHandledBy] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyQuery, setQuickReplyQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
  
  // Quick replies hook - only for admins
  const { quickReplies, searchQuickReplies } = useQuickReplies();
  useEffect(() => {
    loadMessages();
    loadUserProfile();
    if (isAdmin && adminId) {
      markMessagesAsRead();
    }
  }, [userId]);

  // Mark messages as read when admin opens chat
  const markMessagesAsRead = async () => {
    if (!isAdmin || !adminId || !userId) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('sender_id', userId)
        .or(`recipient_id.eq.${adminId},recipient_id.is.null`)
        .eq('read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        console.log(`Marked messages as read for user: ${userId}`);
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
    }
  };
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);
  const loadUserProfile = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('first_name, last_name, email').eq('id', userId).single();
      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };
  const loadMessages = async () => {
    try {
      setLoading(true);

      // Get all messages for this user (bot and human)
      const {
        data: messagesData,
        error
      } = await supabase.from('chat_messages').select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      if (!messagesData) {
        setMessages([]);
        return;
      }

      // Get sender names
      const senderIds = [...new Set(messagesData.map(m => m.sender_id).filter(Boolean))];
      let profiles: any[] = [];
      if (senderIds.length > 0) {
        const {
          data: profilesData
        } = await supabase.from('profiles').select('id, first_name, last_name').in('id', senderIds);
        profiles = profilesData || [];
      }
      const profileMap = profiles.reduce((acc, profile) => {
        acc[profile.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Benutzer';
        return acc;
      }, {} as Record<string, string>);

      // Fetch attachments separately using attachment_id (not message_id join)
      const attachmentIds = messagesData
        .filter(msg => msg.attachment_id)
        .map(msg => msg.attachment_id as string);

      let attachmentsMap: Record<string, any> = {};
      if (attachmentIds.length > 0) {
        const { data: attachments, error: attachmentsError } = await supabase
          .from('chat_attachments')
          .select('id, file_name, file_type, file_path, original_size, encrypted')
          .in('id', attachmentIds);

        if (attachmentsError) {
          console.error('Error fetching attachments:', attachmentsError);
        } else if (attachments) {
          attachmentsMap = attachments.reduce((acc, att) => {
            acc[att.id] = att;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Check if chat is currently escalated and handled by checking the most recent escalation status
      const escalatedMessages = messagesData.filter(m => m.escalation_requested === true && m.handled_by_admin);
      const mostRecentEscalation = escalatedMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Check if there's a bot handover after the most recent escalation
      if (mostRecentEscalation) {
        const handoverMessages = messagesData.filter(m => m.bot_handover_requested === true && new Date(m.created_at) > new Date(mostRecentEscalation.created_at));
        if (handoverMessages.length > 0) {
          setIsHandled(false);
          setHandledBy(null);
        } else {
          setIsHandled(true);
          setHandledBy(mostRecentEscalation.handled_by_admin);
        }
      } else {
        setIsHandled(false);
        setHandledBy(null);
      }

      const formattedMessages: ChatMessage[] = messagesData.map(msg => {
        const att = msg.attachment_id ? attachmentsMap[msg.attachment_id] : null;
        return {
          id: msg.id,
          content: msg.content || undefined,
          sender_id: msg.sender_id || 'bot',
          recipient_id: msg.recipient_id,
          created_at: new Date(msg.created_at),
          read: msg.read,
          attachment: att ? {
            id: att.id,
            file_name: att.file_name,
            file_type: att.file_type,
            file_path: att.file_path,
            original_size: att.original_size || 0,
            encrypted: att.encrypted
          } : undefined,
          senderName: msg.sender_id ? profileMap[msg.sender_id] || 'Benutzer' : 'Assistent',
          isCurrentUser: isAdmin ? msg.sender_id === adminId : msg.sender_id === userId
        };
      });
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Fehler",
        description: "Nachrichten konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle @-trigger detection for quick replies
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    
    // Only show quick replies for admins
    if (!isAdmin) {
      setShowQuickReplies(false);
      return;
    }

    // Check for @ trigger
    const atMatch = value.match(/@(\w*)$/);
    if (atMatch) {
      setQuickReplyQuery(atMatch[1]);
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
      setQuickReplyQuery('');
    }
  }, [isAdmin]);

  // Handle quick reply selection
  const handleQuickReplySelect = useCallback((reply: QuickReply) => {
    // Replace @trigger with the content
    const newValue = inputValue.replace(/@\w*$/, reply.content);
    setInputValue(newValue);
    setShowQuickReplies(false);
    setQuickReplyQuery('');
  }, [inputValue]);

  // Close quick replies dropdown
  const handleCloseQuickReplies = useCallback(() => {
    setShowQuickReplies(false);
    setQuickReplyQuery('');
  }, []);

  const handleSendMessage = async (inputMessage?: string, files?: File[]) => {
    if (!inputMessage?.trim() && (!files || files.length === 0)) return;
    
    // Close quick replies when sending
    setShowQuickReplies(false);
    setQuickReplyQuery('');
    setInputValue('');
    
    try {
      setUploading(true);
      const currentUserId = isAdmin ? adminId : userId;
      const recipientId = isAdmin ? userId : null;
      const {
        error
      } = await supabase.from('chat_messages').insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        content: inputMessage?.trim() || null,
        chat_type: 'human'
      });
      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Fehler",
          description: "Nachricht konnte nicht gesendet werden.",
          variant: "destructive"
        });
        return;
      }

      // If admin is taking over for the first time
      if (isAdmin && !isHandled) {
        await handleTakeOverInternal();
      }
      await loadMessages();
      toast({
        title: "Erfolgreich",
        description: "Nachricht wurde gesendet."
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: error.message || "Nachricht konnte nicht gesendet werden.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  const handleTakeOverInternal = async () => {
    if (!isAdmin || !adminId) return;
    try {
      // Update escalated messages to mark as handled
      const {
        error
      } = await supabase.from('chat_messages').update({
        handled_by_admin: adminId
      }).eq('sender_id', userId).eq('escalation_requested', true);
      if (error) {
        console.error('Error taking over chat:', error);
        return;
      }

      // Update pool messages to assign them to this admin and mark as read
      const { error: poolError } = await supabase
        .from('chat_messages')
        .update({ 
          recipient_id: adminId,
          read: true 
        })
        .eq('sender_id', userId)
        .is('recipient_id', null);

      if (poolError) {
        console.error('Error updating pool messages:', poolError);
      }

      setIsHandled(true);
      setHandledBy(adminId);
      onTakeOver?.(userId);
      toast({
        title: "Chat übernommen",
        description: "Sie haben den Chat erfolgreich übernommen."
      });
    } catch (error) {
      console.error('Error taking over chat:', error);
    }
  };
  const handleHandoverToBot = async () => {
    if (!isAdmin || !adminId) return;
    try {
      // Reset escalation status by updating all escalated messages
      const {
        error: resetError
      } = await supabase.from('chat_messages').update({
        escalation_requested: false,
        handled_by_admin: null
      }).or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).eq('escalation_requested', true);
      if (resetError) {
        console.error('Error resetting escalation status:', resetError);
      }

      // Set bot_handover_requested to true
      const {
        error
      } = await supabase.from('chat_messages').insert({
        sender_id: adminId,
        recipient_id: userId,
        content: 'Chat wird an den Assistenten zurückgegeben...',
        chat_type: 'human',
        bot_handover_requested: true
      });
      if (error) {
        console.error('Error handing over to bot:', error);
        toast({
          title: "Fehler",
          description: "Chat konnte nicht an den Bot zurückgegeben werden.",
          variant: "destructive"
        });
        return;
      }

      // Reset local escalation state
      setIsHandled(false);
      setHandledBy(null);
      onHandoverToBot?.(userId);
      toast({
        title: "An Bot zurückgegeben",
        description: "Der Chat wurde erfolgreich an den Assistenten zurückgegeben."
      });
      await loadMessages();
    } catch (error) {
      console.error('Error handing over to bot:', error);
    }
  };
  const handleResolveChat = async () => {
    if (!isAdmin || !adminId) return;
    try {
      // Mark all messages as resolved (you might want to add a resolved status)
      const {
        error
      } = await supabase.from('chat_messages').update({
        read: true
      }).or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
      if (error) {
        console.error('Error resolving chat:', error);
        return;
      }
      onResolve?.(userId);
      toast({
        title: "Chat abgeschlossen",
        description: "Der Chat wurde erfolgreich abgeschlossen."
      });
    } catch (error) {
      console.error('Error resolving chat:', error);
    }
  };
  const handleDownloadFile = async (filePath: string, fileName: string, attachmentId?: string) => {
    try {
      const {
        data,
        error
      } = await supabase.storage.from('chat_attachments').download(filePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Fehler",
        description: "Datei konnte nicht heruntergeladen werden.",
        variant: "destructive"
      });
    }
  };
  const userName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email || 'Benutzer' : 'Benutzer';
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <div className="z-20 w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex items-center gap-3 sm:gap-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm relative overflow-hidden"
            style={{ background: 'linear-gradient(to bottom right, #059669, #047857)' }}
          >
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-semibold text-base tracking-tight text-slate-800 leading-tight">
              {userName}
            </h1>
            <div className="flex items-center gap-1.5">
              {isHandled ? (
                <>
                  <div className="relative w-2 h-2 bg-emerald-500 rounded-full">
                    <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
                  </div>
                  <span className="text-xs font-medium text-emerald-600">Wird bearbeitet</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-xs font-medium text-amber-600">Wartet auf Support</span>
                </>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2 ml-auto">
            {!isHandled && (
              <Button onClick={handleTakeOverInternal} size="sm">
                Chat übernehmen
              </Button>
            )}
            {isHandled && (
              <>
                <Button onClick={handleHandoverToBot} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Bot className="w-4 h-4 mr-2" />
                  An Bot zurückgeben
                </Button>
                <Button onClick={handleResolveChat} size="sm" variant="outline" className="text-slate-600 border-slate-200">
                  Abschließen
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            Chat wird geladen...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            Keine Nachrichten vorhanden.
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map(msg => {
              const isMe = msg.isCurrentUser;
              const isBotMessage = msg.sender_id === 'bot' || (!msg.sender_id);
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'flex-col items-end ml-auto max-w-[85%]' : 'items-start gap-3 max-w-[90%]'}`}
                >
                  {/* Avatar for other user */}
                  {!isMe && (
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-1 overflow-hidden"
                      style={{
                        background: isBotMessage
                          ? 'linear-gradient(to bottom right, #1D64FF, #0B2566)'
                          : 'linear-gradient(to bottom right, #059669, #047857)'
                      }}
                    >
                      {isBotMessage ? (
                        <img src="/bot-avatar.png" alt="Bot" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    {!isMe && (
                      <p className="text-xs font-medium text-slate-500 ml-1">{msg.senderName}</p>
                    )}

                    {/* Text bubble */}
                    {msg.content && (
                      <div
                        className={`px-4 py-3.5 rounded-[24px] text-sm leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-br from-[#2F75FF] to-[#0055FF] border border-white/10 text-white shadow-md'
                            : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                        }`}
                      >
                        <p className={`whitespace-pre-wrap ${isMe ? 'text-white' : 'text-[#1d283a]'}`}>
                          {msg.content}
                        </p>
                      </div>
                    )}

                    {/* Attachment */}
                    {msg.attachment && (
                      <div
                        className={`px-3 py-2 rounded-[24px] text-sm ${
                          isMe
                            ? 'bg-gradient-to-br from-[#2F75FF] to-[#0055FF] border border-white/10 text-white shadow-md'
                            : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {msg.attachment.file_type?.startsWith('image/') ? (
                            <Image className={`h-5 w-5 flex-shrink-0 ${isMe ? 'text-white/80' : 'text-slate-500'}`} />
                          ) : (
                            <FileText className={`h-5 w-5 flex-shrink-0 ${isMe ? 'text-white/80' : 'text-slate-500'}`} />
                          )}
                          <span className={`text-sm flex-1 truncate ${isMe ? 'text-white' : 'text-slate-700'}`}>
                            {msg.attachment.file_name}
                          </span>
                          <button
                            onClick={() => handleDownloadFile(msg.attachment!.file_path, msg.attachment!.file_name, msg.attachment!.id)}
                            className={`flex-shrink-0 p-1 rounded-full transition-colors ${isMe ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <span className={`text-[10px] text-slate-400 font-medium ${isMe ? 'mr-1 text-right' : 'ml-1'}`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div ref={inputContainerRef} className="z-20 p-4 w-full bg-white shrink-0 border-t border-slate-100 relative">
        {/* Quick Reply Selector */}
        {isAdmin && showQuickReplies && quickReplies.length > 0 && (
          <QuickReplySelector
            replies={quickReplies}
            searchQuery={quickReplyQuery}
            onSelect={handleQuickReplySelect}
            onClose={handleCloseQuickReplies}
          />
        )}
        <div className="max-w-2xl mx-auto">
          <PromptInputBox
            onSend={handleSendMessage}
            placeholder={isAdmin ? "Nachricht eingeben... (@trigger für Schnellantworten)" : "Nachricht eingeben..."}
            isLoading={uploading}
            value={inputValue}
            onValueChange={handleInputChange}
            className="!bg-slate-50 !border-slate-200 hover:!border-slate-300 focus-within:!border-[#1D64FF]/50 focus-within:!ring-1 focus-within:!ring-[#1D64FF]/20 shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};