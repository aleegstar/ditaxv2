import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { User, ChevronLeft, MoreHorizontal, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatDeleteConfirmDialog } from './ChatDeleteConfirmDialog';
import { MissingItemsPanel } from './MissingItemsPanel';
import { useNavigate } from 'react-router-dom';
import { EncryptedChatService } from '@/services/EncryptedChatService';
import ChatAttachment from './ChatAttachment';
interface ChatAttachmentData {
  id: string;
  file_name: string;
  file_type: string;
  original_size: number;
}

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  escalated?: boolean;
  suggestsEscalation?: boolean;
  isAdmin?: boolean;
  senderName?: string;
  chat_type?: string;
  attachment?: ChatAttachmentData;
}
interface ChatBotInterfaceProps {
  userId: string;
  onEscalate: () => void;
  isEscalated: boolean;
}
export const ChatBotInterface: React.FC<ChatBotInterfaceProps> = ({
  userId,
  onEscalate,
  isEscalated
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [sessionId] = useState(() => uuidv4());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [escalatedMode, setEscalatedMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    loadChatHistory();
  }, [userId, sessionId]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);
  useEffect(() => {
    if (isEscalated) {
      setEscalatedMode(true);
    }
  }, [isEscalated]);
  useEffect(() => {
    const checkBotHandover = async () => {
      if (!escalatedMode) return;
      try {
        const {
          data,
          error
        } = await supabase.from('chat_messages').select('bot_handover_requested, id').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).eq('bot_handover_requested', true).order('created_at', {
          ascending: false
        }).limit(1);
        if (error) {
          console.error('Error checking bot handover:', error);
          return;
        }
        if (data && data.length > 0) {
          console.log('Bot handover detected, switching back to bot mode');
          setEscalatedMode(false);
          const botHandoverMessage: ChatMessage = {
            id: uuidv4(),
            content: "Ich bin wieder für dich da! Wie kann ich dir weiterhelfen?",
            isBot: true,
            timestamp: new Date(),
            chat_type: 'bot'
          };
          setMessages(prev => [...prev, botHandoverMessage]);
          await supabase.from('chat_messages').update({
            bot_handover_requested: false
          }).eq('id', data[0].id);
          toast({
            title: "Zurück zum Assistenten",
            description: "Der Chat wurde an den Assistenten zurückgegeben."
          });
        }
      } catch (error) {
        console.error('Error checking bot handover:', error);
      }
    };
    const interval = setInterval(checkBotHandover, 2000);
    return () => clearInterval(interval);
  }, [escalatedMode, userId]);
  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      console.log('Loading complete chat history for user:', userId);
      const {
        data,
        error
      } = await supabase.from('chat_messages').select(`
          id, 
          content, 
          created_at, 
          chat_type, 
          sender_id, 
          recipient_id,
          escalation_requested,
          handled_by_admin,
          bot_handover_requested,
          attachment_id
        `).or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', {
        ascending: true
      }).limit(100);
      if (error) {
        console.error('Error loading chat history:', error);
        throw error;
      }
      console.log(`Loaded ${data?.length || 0} chat messages:`, data);
      if (data && data.length > 0) {
        const recentHandover = data.find(msg => msg.bot_handover_requested && new Date(msg.created_at) > new Date(Date.now() - 5 * 60 * 1000));
        if (recentHandover) {
          setEscalatedMode(false);
        }
        const adminIds = [...new Set(data.filter(msg => msg.sender_id && msg.sender_id !== userId && msg.chat_type === 'human').map(msg => msg.sender_id))].filter(Boolean);
        let adminProfiles: Record<string, string> = {};
        if (adminIds.length > 0) {
          const {
            data: profiles,
            error: profileError
          } = await supabase.from('profiles').select('id, first_name, last_name').in('id', adminIds);
          if (!profileError && profiles) {
            adminProfiles = profiles.reduce((acc, profile) => {
              acc[profile.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin';
              return acc;
            }, {} as Record<string, string>);
          }
        }
        // Load attachment metadata for messages that have attachment_id
        const attachmentIds = data
          .filter(msg => msg.attachment_id)
          .map(msg => msg.attachment_id as string);
        
        let attachmentMap: Record<string, ChatAttachmentData> = {};
        if (attachmentIds.length > 0) {
          const { data: attachments, error: attachError } = await supabase
            .from('chat_attachments')
            .select('id, file_name, file_type, original_size')
            .in('id', attachmentIds);
          
          if (!attachError && attachments) {
            attachmentMap = attachments.reduce((acc, att) => {
              acc[att.id] = {
                id: att.id,
                file_name: att.file_name,
                file_type: att.file_type,
                original_size: att.original_size || 0
              };
              return acc;
            }, {} as Record<string, ChatAttachmentData>);
          }
        }

        const formattedMessages: ChatMessage[] = data.map(msg => {
          const isBot = msg.sender_id === null && msg.chat_type === 'bot';
          const isAdmin = msg.sender_id !== null && msg.sender_id !== userId && msg.chat_type === 'human';
          return {
            id: msg.id,
            content: msg.content || '',
            isBot,
            isAdmin,
            timestamp: new Date(msg.created_at),
            escalated: msg.escalation_requested || false,
            chat_type: msg.chat_type,
            senderName: isAdmin && msg.sender_id ? adminProfiles[msg.sender_id] || 'Support-Team' : undefined,
            attachment: msg.attachment_id ? attachmentMap[msg.attachment_id] : undefined
          };
        });
        setMessages(formattedMessages);
        const hasEscalation = data.some(msg => msg.escalation_requested || msg.handled_by_admin);
        if (hasEscalation && !recentHandover) {
          setEscalatedMode(true);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast({
        title: "Fehler",
        description: "Chat-Verlauf konnte nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const clearMessagesCompletely = async () => {
    setIsDeleting(true);
    try {
      console.log('Deleting chat attachments for user:', userId);
      
      // First delete attachments (to avoid FK constraints if any)
      const { error: attachmentsError } = await supabase
        .from('chat_attachments')
        .delete()
        .eq('uploaded_by', userId);
      
      if (attachmentsError) {
        console.error('Attachments delete error:', attachmentsError);
        throw attachmentsError;
      }

      console.log('Deleting chat messages for user:', userId);
      
      // Then delete messages where user is sender OR recipient
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
      
      if (messagesError) {
        console.error('Messages delete error:', messagesError);
        throw messagesError;
      }

      setMessages([]);
      setEscalatedMode(false);
      
      toast({
        title: "Chat erfolgreich gelöscht",
        description: "Alle Nachrichten wurden entfernt."
      });
    } catch (error: any) {
      console.error('Error during chat deletion:', error);
      toast({
        title: "Fehler beim Löschen",
        description: error.message || "Der Chat konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  const handleDeleteClick = () => setIsDeleteDialogOpen(true);
  const handleGoBack = () => navigate(-1);
  const sendMessage = async (messageContent: string, files?: File[]) => {
    if ((!messageContent.trim() && (!files || files.length === 0)) || isLoading) return;
    
    // If only a file is sent with no text, use a default message for the bot
    const hasFilesOnly = !messageContent.trim() && files && files.length > 0;
    
    const encryptedChatService = EncryptedChatService.getInstance();
    let attachmentId: string | undefined;
    let attachmentData: ChatAttachmentData | undefined;

    // Upload file first if provided
    if (files && files.length > 0) {
      try {
        const file = files[0];
        const attachment = await encryptedChatService.uploadEncryptedChatAttachment(file, userId);
        attachmentId = attachment.id;
        attachmentData = {
          id: attachment.id,
          file_name: attachment.fileName,
          file_type: attachment.fileType,
          original_size: attachment.originalSize
        };
      } catch (err: any) {
        console.error('Error uploading file:', err);
        toast({
          title: "Upload-Fehler",
          description: err.message || "Datei konnte nicht hochgeladen werden.",
          variant: "destructive"
        });
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      content: messageContent.trim(),
      isBot: false,
      timestamp: new Date(),
      chat_type: 'human',
      attachment: attachmentData
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    try {
      if (escalatedMode) {
        const {
          error
        } = await supabase.from('chat_messages').insert({
          sender_id: userId,
          recipient_id: null,
          content: messageContent.trim() || null,
          chat_type: 'human',
          escalation_requested: true,
          attachment_id: attachmentId || null
        });
        if (error) throw error;
        toast({
          title: "Nachricht gesendet",
          description: "Deine Nachricht wurde an das Support-Team weitergeleitet."
        });
      } else {
        const {
          data,
          error
        } = await supabase.functions.invoke('chatbot-response', {
          body: {
            message: hasFilesOnly ? 'Ich habe eine Datei gesendet.' : messageContent,
            userId,
            sessionId,
            attachmentId: attachmentId || null
          }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        const botMessage: ChatMessage = {
          id: uuidv4(),
          content: data.response,
          isBot: true,
          timestamp: new Date(),
          escalated: data.escalated,
          suggestsEscalation: data.suggestsEscalation,
          chat_type: 'bot'
        };
        setMessages(prev => [...prev, botMessage]);
        if (data.escalated) {
          setEscalatedMode(true);
          onEscalate();
          toast({
            title: "An Mitarbeiter weitergeleitet",
            description: "Dein Chat wurde an unser Support-Team weitergeleitet."
          });
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        content: "Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Nachricht. Bitte versuche es erneut.",
        isBot: true,
        timestamp: new Date(),
        chat_type: 'bot'
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "Fehler",
        description: error.message || "Nachricht konnte nicht gesendet werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (!escalatedMode || !userId) return;
    const subscription = supabase.channel('admin_messages').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `recipient_id=eq.${userId}`
    }, payload => {
      const newMessage = payload.new as any;
      if (newMessage.sender_id !== userId) {
        if (newMessage.bot_handover_requested) {
          setEscalatedMode(false);
          const botHandoverMessage: ChatMessage = {
            id: uuidv4(),
            content: "Ich bin wieder für dich da! Wie kann ich dir weiterhelfen?",
            isBot: true,
            timestamp: new Date(),
            chat_type: 'bot'
          };
          setMessages(prev => [...prev, botHandoverMessage]);
          toast({
            title: "Zurück zum Assistenten",
            description: "Der Chat wurde an den Assistenten zurückgegeben."
          });
          return;
        }
        const adminMessage: ChatMessage = {
          id: newMessage.id,
          content: newMessage.content || '',
          isBot: false,
          isAdmin: true,
          timestamp: new Date(newMessage.created_at),
          senderName: 'Support-Team',
          chat_type: newMessage.chat_type
        };
        setMessages(prev => [...prev, adminMessage]);
      }
    }).subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [escalatedMode, userId]);
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return <>
      <div className="flex flex-col h-full relative overflow-hidden">
        {/* Glass Header */}
        <div
          className="z-20 w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex items-center gap-3 sm:gap-4 shrink-0 bg-background border-b border-border"
        >
          <button onClick={handleGoBack} className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0" style={{ background: 'hsla(var(--foreground) / 0.05)', border: '1px solid hsla(var(--foreground) / 0.08)' }}>
            <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </button>

          <div className="flex items-center gap-3">
            {/* Bot Avatar */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm relative overflow-hidden" style={{
            background: escalatedMode ? 'linear-gradient(to bottom right, hsl(160 84% 39%), hsl(162 83% 34%))' : 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.6))'
          }}>
              {escalatedMode ? <User className="w-5 h-5 text-white" /> : <img src="/bot-avatar.png" alt="AI Assistant" className="w-full h-full object-cover" />}
            </div>

            <div className="flex flex-col">
              <h1 className="font-semibold text-base tracking-tight text-foreground leading-tight">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-auto w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border shadow-lg z-50">
              <DropdownMenuItem onClick={handleDeleteClick} disabled={isDeleting} className="flex items-center gap-2 text-destructive hover:bg-destructive/10 cursor-pointer">
                <Trash2 className="h-4 w-4" />
                Chat löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages Area */}
        <div className="z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth pb-[160px] md:pb-6">
          {isLoadingHistory ? <div className="flex items-center justify-center h-64 text-muted-foreground">
              Chat wird geladen...
            </div> : messages.length === 0 ? <ChatEmptyState userId={userId} /> : <div className="max-w-2xl mx-auto space-y-4">
              {/* Missing Items Panel */}
              <MissingItemsPanel userId={userId} onSubmitted={loadChatHistory} />
              
              {/* Time Divider */}
              <div className="flex justify-center mb-4">
                <span
                  className="text-[10px] font-medium text-muted-foreground px-3 py-1 rounded-full"
                  className="text-[10px] font-medium text-muted-foreground px-3 py-1 rounded-full bg-muted border border-border"
                >
                  Heute
                </span>
              </div>

              {messages.map(message => <div key={message.id} className={`flex ${message.isBot || message.isAdmin ? 'items-start gap-3' : 'flex-col items-end'} ${message.isBot || message.isAdmin ? 'max-w-[90%]' : 'ml-auto max-w-[85%]'}`}>
                  {/* Bot/Admin Avatar */}
                  {(message.isBot || message.isAdmin) && <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-1 overflow-hidden" style={{
              background: message.isAdmin ? 'linear-gradient(to bottom right, hsl(160 84% 39%), hsl(162 83% 34%))' : 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.6))'
            }}>
                      {message.isAdmin ? <User className="w-4 h-4 text-white" /> : <img src="/bot-avatar.png" alt="AI Assistant" className="w-full h-full object-cover" />}
                    </div>}

                  <div className="flex flex-col gap-1">
                    {message.isAdmin && message.senderName && <p className="text-xs font-medium text-muted-foreground ml-1">{message.senderName}</p>}
                    <div
                      className={`px-4 py-3.5 rounded-[24px] text-sm leading-relaxed ${
                        message.isBot || message.isAdmin
                          ? 'bg-muted text-foreground'
                          : 'text-white shadow-md'
                      }`}
                      style={
                        message.isBot || message.isAdmin
                          ? undefined
                          : {
                              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))',
                            }
                      }
                    >
                      {message.content && <p className={`whitespace-pre-wrap ${message.isBot || message.isAdmin ? 'text-foreground' : 'text-white'}`}>{message.content}</p>}
                      {message.attachment && (
                        <div className={message.content ? 'mt-2' : ''}>
                          <ChatAttachment
                            attachmentId={message.attachment.id}
                            fileName={message.attachment.file_name}
                            fileType={message.attachment.file_type}
                            originalSize={message.attachment.original_size}
                            userId={userId}
                            isCurrentUser={!message.isBot && !message.isAdmin}
                          />
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] text-muted-foreground font-medium ${message.isBot || message.isAdmin ? 'ml-1' : 'mr-1'}`}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>)}

              {isLoading && <div className="flex items-start gap-3 max-w-[90%]">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-1 overflow-hidden" style={{
              background: escalatedMode ? 'linear-gradient(to bottom right, hsl(160 84% 39%), hsl(162 83% 34%))' : 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.6))'
            }}>
                    {escalatedMode ? <User className="w-4 h-4 text-white" /> : <img src="/bot-avatar.png" alt="AI Assistant" className="w-full h-full object-cover" />}
                  </div>
                   <div className="px-4 py-3.5 rounded-[24px] bg-muted">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>}

              <div ref={messagesEndRef} />
            </div>}
        </div>

        {/* Glass Footer Input Area */}
        <div
          className="z-20 p-4 w-full shrink-0 fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom,8px)] md:relative md:pb-4 bg-background border-t border-border"
        >
          <div className="max-w-2xl mx-auto">
            <PromptInputBox
              onSend={sendMessage}
              isLoading={isLoading}
              placeholder={escalatedMode ? "Schreibe dem Support-Team..." : "Schreib eine Nachricht..."}
            />
            <div className="text-center mt-3">
              <p className="text-[10px] text-muted-foreground font-medium">
                Ditax AI kann Fehler machen. Überprüfe wichtige Infos.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ChatDeleteConfirmDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={clearMessagesCompletely} isDeleting={isDeleting} />
    </>;
};