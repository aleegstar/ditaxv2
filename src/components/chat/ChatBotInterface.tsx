import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, User, ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatDeleteConfirmDialog } from './ChatDeleteConfirmDialog';
import { useNavigate } from 'react-router-dom';
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

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, [userId, sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);

  // Check if chat is escalated on mount
  useEffect(() => {
    if (isEscalated) {
      setEscalatedMode(true);
    }
  }, [isEscalated]);

  // Check for bot handover requests
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

          // Add a bot message to indicate the handover
          const botHandoverMessage: ChatMessage = {
            id: uuidv4(),
            content: "Ich bin wieder für dich da! Wie kann ich dir weiterhelfen?",
            isBot: true,
            timestamp: new Date(),
            chat_type: 'bot'
          };
          setMessages(prev => [...prev, botHandoverMessage]);

          // Reset the handover flag
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

      // Load ALL messages where user is involved - FIXED: Removed the erroneous join
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
          bot_handover_requested
        `).or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', {
        ascending: true
      }).limit(100);
      if (error) {
        console.error('Error loading chat history:', error);
        throw error;
      }
      console.log(`Loaded ${data?.length || 0} chat messages:`, data);
      if (data && data.length > 0) {
        // Check for recent bot handover
        const recentHandover = data.find(msg => msg.bot_handover_requested && new Date(msg.created_at) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        );
        if (recentHandover) {
          setEscalatedMode(false);
        }

        // Get unique admin IDs for profile loading
        const adminIds = [...new Set(data.filter(msg => msg.sender_id && msg.sender_id !== userId && msg.chat_type === 'human').map(msg => msg.sender_id))].filter(Boolean);

        // Load admin profiles separately if we have admin messages
        let adminProfiles: Record<string, string> = {};
        if (adminIds.length > 0) {
          console.log('Loading admin profiles for IDs:', adminIds);
          const {
            data: profiles,
            error: profileError
          } = await supabase.from('profiles').select('id, first_name, last_name').in('id', adminIds);
          if (profileError) {
            console.error('Error loading admin profiles:', profileError);
          } else if (profiles) {
            adminProfiles = profiles.reduce((acc, profile) => {
              acc[profile.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin';
              return acc;
            }, {} as Record<string, string>);
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
            senderName: isAdmin && msg.sender_id ? adminProfiles[msg.sender_id] || 'Support-Team' : undefined
          };
        });
        setMessages(formattedMessages);

        // Check if chat has been escalated (but not recently handed over to bot)
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
      console.log('Starting complete chat deletion for user:', userId);

      // Delete all messages where user is involved, including bot messages
      // This includes: user sent messages, messages sent to user, and bot messages to user
      const {
        error: messagesError
      } = await supabase.from('chat_messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId},and(sender_id.is.null,recipient_id.eq.${userId})`);
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        throw messagesError;
      }

      // Also delete any chat attachments uploaded by this user
      const {
        error: attachmentsError
      } = await supabase.from('chat_attachments').delete().eq('uploaded_by', userId);
      if (attachmentsError) {
        console.error('Error deleting attachments:', attachmentsError);
        // Don't throw here, just log the error as attachments are secondary
      }

      // Clear local state
      setMessages([]);
      setEscalatedMode(false);
      console.log('Chat deletion completed successfully');
      toast({
        title: "Chat erfolgreich gelöscht",
        description: "Alle Nachrichten wurden entfernt."
      });
    } catch (error: any) {
      console.error('Error during chat deletion:', error);
      toast({
        title: "Fehler beim Löschen",
        description: error.message || "Der Chat konnte nicht vollständig gelöscht werden.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };
  const handleGoBack = () => {
    navigate(-1);
  };
  const sendMessage = async (messageContent: string, files?: File[]) => {
    if (!messageContent.trim() || isLoading) return;
    const userMessage: ChatMessage = {
      id: uuidv4(),
      content: messageContent.trim(),
      isBot: false,
      timestamp: new Date(),
      chat_type: 'human'
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    try {
      if (escalatedMode) {
        // Send message to admin
        const {
          error
        } = await supabase.from('chat_messages').insert({
          sender_id: userId,
          recipient_id: null,
          // Admin will pick this up
          content: messageContent.trim(),
          chat_type: 'human',
          escalation_requested: true
        });
        if (error) throw error;
        toast({
          title: "Nachricht gesendet",
          description: "Deine Nachricht wurde an das Support-Team weitergeleitet."
        });
      } else {
        // Send to bot
        console.log('Sending message to bot:', {
          messageContent,
          userId,
          sessionId
        });
        const {
          data,
          error
        } = await supabase.functions.invoke('chatbot-response', {
          body: {
            message: messageContent,
            userId,
            sessionId
          }
        });
        if (error) {
          console.error('Function invoke error:', error);
          throw error;
        }
        console.log('Bot function response:', data);
        if (data.error) {
          throw new Error(data.error);
        }
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

  // Set up realtime subscription for admin messages when escalated
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
        // Only show messages from others
        // Check if this is a bot handover message
        if (newMessage.bot_handover_requested) {
          console.log('Real-time bot handover detected');
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
  return <>
      <div className="flex flex-col h-full">
        {/* Header - Positioned below WelcomeHeader and sticky on scroll */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="p-1 h-8 w-8" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{
                backgroundColor: escalatedMode ? '#059669' : '#1d64ff'
              }}>
                  {escalatedMode ? <User className="h-5 w-5 text-white" /> : <img 
                    src="/bot-avatar.png" 
                    alt="AI Assistant" 
                    className="w-full h-full object-cover rounded-full"
                  />}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {escalatedMode ? 'Support-Team' : 'Steuer-Assistent'}
                </p>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>
            <div className="ml-auto">
              <DropdownMenu>
                
                <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg z-50">
                  <DropdownMenuItem onClick={handleDeleteClick} disabled={isDeleting} className="flex items-center gap-2 text-red-600 hover:bg-red-50 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                    Chat löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto pb-40 md:pb-32">
          {isLoadingHistory ? <div className="flex items-center justify-center h-64 text-gray-400">
              Chat wird geladen...
            </div> : messages.length === 0 ? <ChatEmptyState userId={userId} /> : <div className="p-4 space-y-4 max-w-4xl mx-auto">
              {messages.map(message => <div key={message.id} className={`flex ${message.isBot || message.isAdmin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-3xl px-4 py-3 ${message.isBot ? 'bg-white text-gray-800' : message.isAdmin ? 'bg-white text-green-800 border border-green-200' : ''}`} style={{
              backgroundColor: !message.isBot && !message.isAdmin ? 'hsl(45, 40%, 98%)' : undefined
            }}>
                    {message.isAdmin && message.senderName && <p className="text-xs font-medium mb-1 opacity-75">
                        {message.senderName}
                      </p>}
                    <p className="whitespace-pre-wrap text-sm" style={{ color: !message.isBot && !message.isAdmin ? '#3f3f46' : undefined }}>{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-70" style={{ color: !message.isBot && !message.isAdmin ? '#3f3f46' : undefined }}>
                        {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                      </span>
                    </div>
                  </div>
                </div>)}
              
              {isLoading && <div className="flex justify-start">
                  <div className={`rounded-3xl px-4 py-3 ${escalatedMode ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <div className="flex gap-1">
                      <div className={`w-2 h-2 rounded-full animate-bounce ${escalatedMode ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce ${escalatedMode ? 'bg-green-500' : 'bg-gray-500'}`} style={{
                  animationDelay: '0.1s'
                }}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce ${escalatedMode ? 'bg-green-500' : 'bg-gray-500'}`} style={{
                  animationDelay: '0.2s'
                }}></div>
                    </div>
                  </div>
                </div>}
              
              <div ref={messagesEndRef} />
            </div>}
        </div>

        {/* Input - Fixed at bottom with higher z-index and more bottom padding */}
        <div className="fixed bottom-0 left-0 right-0 p-4 z-30 md:pl-72 pb-8 md:pb-12">
          <div className="flex justify-center">
            <div className="w-full max-w-4xl" style={{ backgroundColor: 'hsl(45, 40%, 98%)', borderRadius: '1.5rem' }}>
              <PromptInputBox onSend={sendMessage} isLoading={isLoading} placeholder={escalatedMode ? "Schreibe dem Support-Team..." : "Frag mich etwas über Steuern..."} />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ChatDeleteConfirmDialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={clearMessagesCompletely} isDeleting={isDeleting} />
    </>;
};