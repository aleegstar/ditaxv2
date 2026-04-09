import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { toast } from '@/components/ui/use-toast';
import { User } from 'lucide-react';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';

interface Message {
  id: string;
  content: string | null;
  sender_id: string;
  recipient_id: string | null;
  created_at: string;
  attachment_id?: string | null;
  chat_type: string;
  read: boolean;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface SimpleChatWindowProps {
  selectedUserId: string;
  isAdmin: boolean;
  fullWidth?: boolean;
  hideInput?: boolean;
  onMessagesRead?: () => void;
}

const SimpleChatWindow = ({ 
  selectedUserId, 
  isAdmin, 
  fullWidth = false, 
  hideInput = false,
  onMessagesRead 
}: SimpleChatWindowProps) => {
  const { userId, isValid } = useAuthValidation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Record<string, Attachment>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mark messages as read
  const markMessagesAsRead = async (messagesToMark: Message[]) => {
    if (!messagesToMark.length) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .in('id', messagesToMark.map(msg => msg.id));

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      setMessages(prev => prev.map(msg => 
        messagesToMark.find(m => m.id === msg.id) 
          ? { ...msg, read: true }
          : msg
      ));

      onMessagesRead?.();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Load messages
  useEffect(() => {
    if (!isValid || !userId) {
      setLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let allMessages: Message[] = [];

        if (isAdmin && selectedUserId) {
          const { data, error } = await supabase
            .from('chat_messages')
            .select(`
              *,
              chat_attachments (
                id,
                file_name,
                file_type,
                file_path
              )
            `)
            .or(`and(sender_id.eq.${userId},recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.eq.${userId}),and(sender_id.is.null,recipient_id.eq.${selectedUserId})`)
            .order('created_at', { ascending: true });
          
          if (error) throw error;
          allMessages = data || [];
        } else {
          const { data: adminData } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
            .limit(1)
            .single();

          const adminId = adminData?.user_id;
          if (adminId) {
            const { data, error } = await supabase
              .from('chat_messages')
              .select(`
                *,
                chat_attachments (
                  id,
                  file_name,
                  file_type,
                  file_path
                )
              `)
              .or(`and(sender_id.eq.${userId},recipient_id.eq.${adminId}),and(sender_id.eq.${adminId},recipient_id.eq.${userId}),and(sender_id.is.null,recipient_id.eq.${userId})`)
              .order('created_at', { ascending: true });

            if (error) throw error;
            allMessages = data || [];
          }
        }
        
        const attachmentsMap: Record<string, Attachment> = {};
        allMessages.forEach((msg: any) => {
          if (msg.chat_attachments && msg.chat_attachments.length > 0) {
            attachmentsMap[msg.attachment_id] = msg.chat_attachments[0];
          }
        });
        
        setMessages(allMessages);
        setAttachments(attachmentsMap);
        
        const unreadMessages = allMessages.filter((msg: Message) => {
          return !msg.read && msg.sender_id !== userId;
        });
        
        if (unreadMessages.length > 0) {
          setTimeout(() => markMessagesAsRead(unreadMessages), 500);
        }
        
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error loading messages:', error);
        setError('Fehler beim Laden der Nachrichten');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [userId, selectedUserId, isValid, isAdmin]);

  // Load profiles
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url');
        
        if (error) return;
        
        const profilesMap = (data || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, Profile>);
        
        setProfiles(profilesMap);
      } catch (error) {
        console.error('Error loading profiles:', error);
      }
    };

    if (isValid) {
      loadProfiles();
    }
  }, [isValid]);

  // Real-time subscription
  useEffect(() => {
    if (!userId || !isValid) return;

    const channel = supabase
      .channel('chat_messages_simple')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          let shouldShow = false;
          
          if (isAdmin && selectedUserId) {
            shouldShow = (
              (newMsg.sender_id === userId && newMsg.recipient_id === selectedUserId) ||
              (newMsg.sender_id === selectedUserId && newMsg.recipient_id === userId) ||
              (newMsg.sender_id === null && newMsg.recipient_id === selectedUserId)
            );
          } else {
            shouldShow = (
              newMsg.sender_id === userId ||
              newMsg.recipient_id === userId ||
              (newMsg.sender_id === null && newMsg.recipient_id === userId)
            );
          }
            
          if (shouldShow) {
            if (newMsg.attachment_id) {
              try {
                const { data: attachmentData } = await supabase
                  .from('chat_attachments')
                  .select('id, file_name, file_type, file_path')
                  .eq('id', newMsg.attachment_id)
                  .single();
                
                if (attachmentData) {
                  setAttachments(prev => ({
                    ...prev,
                    [newMsg.attachment_id!]: attachmentData
                  }));
                }
              } catch (error) {
                console.error('Error loading attachment:', error);
              }
            }
            
            setMessages(prev => {
              const exists = prev.find(msg => msg.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
            
            if (newMsg.sender_id !== userId && !newMsg.read) {
              setTimeout(() => markMessagesAsRead([newMsg]), 500);
            }
            
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMsg.id ? { ...msg, read: updatedMsg.read } : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const deletedMsg = payload.old as Message;
          setMessages(prev => prev.filter(msg => msg.id !== deletedMsg.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedUserId, isAdmin, isValid]);

  const getSenderName = (senderId: string) => {
    const profile = profiles[senderId];
    if (profile) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unbekannt';
    }
    return 'Unbekannt';
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!userId || !isValid || !content.trim()) return;

    setIsSending(true);
    try {
      const messageData = {
        content: content.trim(),
        sender_id: userId,
        recipient_id: selectedUserId,
        chat_type: 'human'
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert([messageData]);

      if (error) throw error;
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isValid) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Bitte melden Sie sich an, um den Chat zu nutzen</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Nachrichten werden geladen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-2">Fehler beim Laden des Chats</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Get selected user's name for header
  const selectedUserProfile = profiles[selectedUserId];
  const selectedUserName = selectedUserProfile 
    ? `${selectedUserProfile.first_name || ''} ${selectedUserProfile.last_name || ''}`.trim() || 'Benutzer'
    : 'Benutzer';

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div className="z-20 w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex items-center gap-3 sm:gap-4 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm relative overflow-hidden"
            style={{ background: 'linear-gradient(to bottom right, hsl(222, 100%, 60%), hsl(222, 100%, 47%))' }}
          >
            <User className="w-5 h-5 text-primary-foreground" />
          </div>

          <div className="flex flex-col">
            <h1 className="font-semibold text-base tracking-tight text-foreground leading-tight">
              {selectedUserName}
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="relative w-2 h-2 bg-emerald-500 rounded-full">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
              </div>
              <span className="text-xs font-medium text-emerald-600">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth bg-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <div className="text-center">
              <p className="text-slate-500 text-lg">
                Noch keine Nachrichten
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Schreiben Sie die erste Nachricht!
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Time Divider */}
            <div className="flex justify-center mb-4">
              <span className="text-[10px] font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                Heute
              </span>
            </div>

            {messages.map(message => {
              const isOwnMessage = message.sender_id === userId;
              const isBot = message.sender_id === null && message.chat_type === 'bot';
              const senderName = !isOwnMessage && !isBot ? getSenderName(message.sender_id) : undefined;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${!isOwnMessage ? 'items-start gap-3' : 'flex-col items-end'} ${!isOwnMessage ? 'max-w-[90%]' : 'ml-auto max-w-[85%]'}`}
                >
                  {/* Sender Avatar */}
                  {!isOwnMessage && (
                    <div 
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-1 overflow-hidden"
                      style={{ 
                        background: isBot 
                          ? 'linear-gradient(to bottom right, #1D64FF, #0B2566)' 
                          : 'linear-gradient(to bottom right, #059669, #047857)' 
                      }}
                    >
                      {isBot ? (
                        <img src="/bot-avatar.png" alt="Bot" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    {senderName && (
                      <p className="text-xs font-medium text-slate-500 ml-1">{senderName}</p>
                    )}
                    <div 
                      className={`px-4 py-3.5 rounded-[24px] text-sm leading-relaxed ${
                        !isOwnMessage 
                          ? 'bg-white border border-slate-200 text-slate-700 shadow-sm' 
                          : 'bg-gradient-to-br from-[#2F75FF] to-[#0055FF] border border-white/10 text-white shadow-md'
                      }`}
                    >
                      <p className={`whitespace-pre-wrap ${!isOwnMessage ? 'text-[#1d283a]' : 'text-white'}`}>
                        {message.content}
                      </p>
                    </div>
                    <span className={`text-[10px] text-slate-400 font-medium ${!isOwnMessage ? 'ml-1' : 'mr-1'}`}>
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-start gap-3 max-w-[90%]">
                <div 
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm mt-1 overflow-hidden"
                  style={{ background: 'linear-gradient(to bottom right, #059669, #047857)' }}
                >
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-[24px] px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="flex space-x-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      {!hideInput && (
        <div className="border-t border-slate-100 bg-white p-4">
          <div className="max-w-2xl mx-auto">
            <PromptInputBox 
              onSend={handleSendMessage}
              placeholder="Schreib eine Nachricht..."
              isLoading={isSending}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleChatWindow;
