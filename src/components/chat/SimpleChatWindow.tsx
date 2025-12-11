import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import ChatBubble from './ChatBubble';
import ModernChatInput from './ModernChatInput';

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // Delete all messages for current conversation
  const deleteAllMessages = async () => {
    if (!userId) return;

    try {
      console.log('Starting complete message deletion for user:', userId, 'isAdmin:', isAdmin);
      
      let deleteQuery;
      
      if (isAdmin && selectedUserId) {
        // Admin: delete messages between admin and selected user (including bot messages)
        console.log('Deleting admin conversation with user:', selectedUserId);
        deleteQuery = supabase
          .from('chat_messages')
          .delete()
          .or(`and(sender_id.eq.${userId},recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.eq.${userId}),and(sender_id.is.null,recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.is.null)`);
      } else {
        // Regular user: delete all messages involving the user (including bot messages)
        console.log('Deleting all messages for user:', userId);
        deleteQuery = supabase
          .from('chat_messages')
          .delete()
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId},and(sender_id.is.null,recipient_id.eq.${userId})`);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('Error deleting messages:', deleteError);
        throw deleteError;
      }

      // Clear local state
      setMessages([]);
      
      console.log('Messages deleted successfully');
      
      toast({
        title: "Chat erfolgreich gelöscht",
        description: "Alle Nachrichten wurden entfernt."
      });

    } catch (error: any) {
      console.error('Error during message deletion:', error);
      toast({
        title: "Fehler beim Löschen",
        description: error.message || "Die Nachrichten konnten nicht vollständig gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  // Mark messages as read - now also for admins
  const markMessagesAsRead = async (messagesToMark: Message[]) => {
    if (!messagesToMark.length) return;

    try {
      console.log('Marking messages as read:', messagesToMark.map(m => m.id));
      
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .in('id', messagesToMark.map(msg => msg.id));

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        messagesToMark.find(m => m.id === msg.id) 
          ? { ...msg, read: true }
          : msg
      ));

      // Notify parent component about read messages
      onMessagesRead?.();
      
      console.log('Successfully marked messages as read');
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Load messages with corrected query logic
  useEffect(() => {
    if (!isValid || !userId) {
      console.log('User not authenticated, skipping message load');
      setLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        console.log('Loading messages for user:', userId, 'isAdmin:', isAdmin);
        setLoading(true);
        setError(null);
        
        let allMessages: Message[] = [];

        if (isAdmin && selectedUserId) {
          // Admins see messages between them and the selected user only (including bot messages)
          console.log('Loading messages for admin with specific user:', selectedUserId);
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
          
          if (error) {
            console.error('Admin query error:', error);
            throw error;
          }
          allMessages = data || [];
          console.log('Admin loaded messages for user:', selectedUserId, 'count:', allMessages.length);
        } else {
          // Regular users: load messages with admin only (including bot messages)
          console.log('Loading messages for regular user - finding admin and loading conversation');
          
          // First, get admin user ID
          const { data: adminData, error: adminError } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
            .limit(1)
            .single();

          if (adminError) {
            console.error('Error finding admin:', adminError);
            throw adminError;
          }

          const adminId = adminData?.user_id;
          if (!adminId) {
            console.log('No admin found, loading empty messages');
            allMessages = [];
          } else {
            console.log('Loading conversation between user and admin:', adminId);
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

            if (error) {
              console.error('Error loading user-admin conversation:', error);
              throw error;
            }
            
            allMessages = data || [];
            console.log('User-admin conversation loaded:', allMessages.length);
          }
        }
        
        // Process messages and attachments
        const attachmentsMap: Record<string, Attachment> = {};
        
        allMessages.forEach((msg: any) => {
          if (msg.chat_attachments && msg.chat_attachments.length > 0) {
            attachmentsMap[msg.attachment_id] = msg.chat_attachments[0];
          }
        });
        
        console.log('Setting messages in state:', allMessages.length);
        setMessages(allMessages);
        setAttachments(attachmentsMap);
        
        // Mark appropriate messages as read for both users and admins
        const unreadMessages = allMessages.filter((msg: Message) => {
          return !msg.read && msg.sender_id !== userId;
        });
        
        if (unreadMessages.length > 0) {
          console.log('Marking unread messages as read:', unreadMessages.length);
          setTimeout(() => markMessagesAsRead(unreadMessages), 500);
        }
        
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Unexpected error loading messages:', error);
        setError('Unerwarteter Fehler beim Laden der Nachrichten');
        toast({
          title: "Fehler",
          description: "Unerwarteter Fehler beim Laden der Nachrichten",
          variant: "destructive",
        });
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
        console.log('Loading user profiles...');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url');
        
        if (error) {
          console.error('Error loading profiles:', error);
          return;
        }
        
        const profilesMap = (data || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, Profile>);
        
        console.log('Profiles loaded:', Object.keys(profilesMap).length);
        setProfiles(profilesMap);
      } catch (error) {
        console.error('Error loading profiles:', error);
      }
    };

    if (isValid) {
      loadProfiles();
    }
  }, [isValid]);

  // Real-time subscription with corrected logic
  useEffect(() => {
    if (!userId || !isValid) return;

    console.log('Setting up realtime subscription for user:', userId);

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          console.log('New message received via realtime:', newMsg.id, 'from sender:', newMsg.sender_id, 'to recipient:', newMsg.recipient_id);
          
          let shouldShow = false;
          
          if (isAdmin && selectedUserId) {
            // Admins only see messages for the selected user conversation (including bot messages to that user)
            shouldShow = (
              (newMsg.sender_id === userId && newMsg.recipient_id === selectedUserId) ||
              (newMsg.sender_id === selectedUserId && newMsg.recipient_id === userId) ||
              (newMsg.sender_id === null && newMsg.recipient_id === selectedUserId) // Bot messages to selected user
            );
            console.log('Admin - filtering for user:', selectedUserId, 'shouldShow:', shouldShow);
          } else {
            // Regular users: only show messages in their conversation with admin or bot messages to them
            shouldShow = (
              newMsg.sender_id === userId ||  // Messages they sent
              newMsg.recipient_id === userId || // Messages sent directly to them
              (newMsg.sender_id === null && newMsg.recipient_id === userId) // Bot messages to them
            );
            console.log('User shouldShow:', shouldShow, 'reasons:', {
              sentByUser: newMsg.sender_id === userId,
              sentToUser: newMsg.recipient_id === userId,
              botToUser: newMsg.sender_id === null && newMsg.recipient_id === userId
            });
          }
            
          if (shouldShow) {
            console.log('Adding new message to chat');
            // Load attachment if exists
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
              // Check if message already exists to avoid duplicates
              const exists = prev.find(msg => msg.id === newMsg.id);
              if (exists) {
                console.log('Message already exists, skipping');
                return prev;
              }
              console.log('Adding new message to state');
              return [...prev, newMsg];
            });
            
            // Mark as read if not own message (for both users and admins)
            if (newMsg.sender_id !== userId && !newMsg.read) {
              setTimeout(() => markMessagesAsRead([newMsg]), 500);
            }
            
            setTimeout(scrollToBottom, 100);
          } else {
            console.log('Message not relevant for this user, skipping');
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
          console.log('Message updated via realtime:', updatedMsg.id);
          
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
          console.log('Message deleted via realtime:', deletedMsg.id);
          
          setMessages(prev => prev.filter(msg => msg.id !== deletedMsg.id));
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription');
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

  const getSenderAvatarUrl = (senderId: string) => {
    const profile = profiles[senderId];
    return profile?.avatar_url || undefined;
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (!userId || !isValid) return;

    try {
      let messageData;
      
      if (isAdmin) {
        // Admin sending message
        messageData = {
          content: content.trim(),
          sender_id: userId,
          recipient_id: selectedUserId,
          chat_type: 'direct'
        };
      } else {
        // Regular user sending message to admin - find admin first
        const { data: adminData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        const adminId = adminData?.user_id;
        
        messageData = {
          content: content.trim(),
          sender_id: userId,
          recipient_id: adminId || null,
          chat_type: 'direct'
        };
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert([messageData]);

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      handleMessageSent();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    }
  };

  const handleMessageSent = () => {
    setTimeout(scrollToBottom, 100);
  };

  if (!isValid) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Bitte melden Sie sich an, um den Chat zu nutzen</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Nachrichten werden geladen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">Fehler beim Laden des Chats</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea 
          ref={scrollAreaRef} 
          className="h-full"
        >
          <div className="space-y-4 p-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                  <p className="text-muted-foreground text-lg">
                    Noch keine Nachrichten. Schreiben Sie die erste Nachricht!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  attachment={message.attachment_id ? attachments[message.attachment_id] || null : null}
                  senderName={getSenderName(message.sender_id)}
                  senderAvatarUrl={getSenderAvatarUrl(message.sender_id)}
                  isOwnMessage={message.sender_id === userId}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Input */}
      {!hideInput && (
        <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
          <ModernChatInput
            onSendMessage={handleSendMessage}
            placeholder="Nachricht eingeben..."
            userId={userId || ''}
          />
        </div>
      )}
    </div>
  );
};

export default SimpleChatWindow;
