import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "@/components/ui/use-toast";
import { ChatCard, ChatMessage } from '@/components/ui/chat-card';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { cn } from "@/lib/utils";

interface ChatMessageRecord {
  id: string;
  content: string | null;
  sender_id: string;
  recipient_id: string | null;
  created_at: string;
  read: boolean | null;
  attachment_id: string | null;
  [key: string]: any;
}

type RealtimePayload = RealtimePostgresChangesPayload<ChatMessageRecord>;

interface ModernChatWindowProps {
  selectedUserId?: string;
  isAdmin?: boolean;
  fullWidth?: boolean;
}

const ModernChatWindow: React.FC<ModernChatWindowProps> = ({ 
  selectedUserId: propUserId, 
  isAdmin = false, 
  fullWidth = false 
}) => {
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get('userId');
  
  const selectedUserId = urlUserId || propUserId;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipientName, setRecipientName] = useState<string>('');

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('ModernChatWindow: Session error:', sessionError);
          toast({
            title: "Fehler",
            description: "Sitzung konnte nicht geladen werden",
            variant: "destructive",
          });
          return;
        }

        if (session) {
          console.log('ModernChatWindow: Getting user session:', session.user.id);

          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          if (roleError && roleError.code !== 'PGRST116') {
            console.error('ModernChatWindow: Error fetching user role:', roleError);
          }

          const isAdmin = roleData?.role === 'admin';
          console.log('ModernChatWindow: User role check:', { roleData, isAdmin });

          setCurrentUser({ id: session.user.id, isAdmin });
        }
      } catch (error) {
        console.error('ModernChatWindow: Error fetching current user:', error);
        toast({
          title: "Fehler",
          description: "Benutzerinformationen konnten nicht geladen werden",
          variant: "destructive",
        });
      }
    };

    getCurrentUser();
  }, []);

  // Fetch recipient name
  useEffect(() => {
    const fetchRecipientName = async () => {
      if (selectedUserId) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', selectedUserId)
            .single();

          if (error) {
            console.error('Error fetching recipient name:', error);
            return;
          }

          setRecipientName(data.first_name && data.last_name 
            ? `${data.first_name} ${data.last_name}` 
            : 'User');
        } catch (error) {
          console.error('Error fetching recipient name:', error);
        }
      } else {
        setRecipientName('Allgemeiner Chat');
      }
    };

    fetchRecipientName();
  }, [selectedUserId]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        console.log('ModernChatWindow: Fetching messages for user:', currentUser.id, 'selectedUserId:', selectedUserId);

        // First, get the basic message data
        let query = supabase.from('chat_messages')
          .select('id, content, sender_id, recipient_id, created_at, read, attachment_id')
          .order('created_at', { ascending: true });

        if (selectedUserId) {
          // Direct messages between current user and selected user
          query = query.or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},recipient_id.eq.${currentUser.id})`);
        } else {
          // General chat messages (recipient_id is null)
          query = query.is('recipient_id', null);
        }

        const { data: messagesData, error: messagesError } = await query;

        if (messagesError) {
          console.error('ModernChatWindow: Error fetching messages:', messagesError);
          throw messagesError;
        }

        console.log('ModernChatWindow: Fetched messages:', messagesData);

        if (!messagesData || messagesData.length === 0) {
          setMessages([]);
          setLoading(false);
          return;
        }

        // Get sender names for messages
        const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', senderIds);

        if (profilesError) {
          console.error('ModernChatWindow: Error fetching profiles:', profilesError);
        }

        const senderNamesMap = profiles?.reduce((acc, profile) => {
          acc[profile.id] = profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : 'User';
          return acc;
        }, {} as Record<string, string>) || {};

        // Get attachments for messages that have them
        const messageIdsWithAttachments = messagesData
          .filter(msg => msg.attachment_id)
          .map(msg => msg.attachment_id);

        let attachmentsMap: Record<string, any> = {};
        if (messageIdsWithAttachments.length > 0) {
          const { data: attachments, error: attachmentsError } = await supabase
            .from('chat_attachments')
            .select('id, file_name, file_type, file_path, original_size')
            .in('id', messageIdsWithAttachments);

          if (attachmentsError) {
            console.error('ModernChatWindow: Error fetching attachments:', attachmentsError);
          } else if (attachments) {
            attachmentsMap = attachments.reduce((acc, attachment) => {
              acc[attachment.id] = attachment;
              return acc;
            }, {} as Record<string, any>);
          }
        }

        const formattedMessages: ChatMessage[] = messagesData.map(msg => ({
          id: msg.id,
          content: msg.content || undefined,
          sender_id: msg.sender_id,
          recipient_id: msg.recipient_id || undefined,
          created_at: new Date(msg.created_at),
          read: msg.read || false,
          attachment: msg.attachment_id && attachmentsMap[msg.attachment_id] ? {
            id: attachmentsMap[msg.attachment_id].id,
            file_name: attachmentsMap[msg.attachment_id].file_name,
            file_type: attachmentsMap[msg.attachment_id].file_type,
            file_path: attachmentsMap[msg.attachment_id].file_path,
            original_size: attachmentsMap[msg.attachment_id].original_size || 0,
          } : undefined,
          senderName: senderNamesMap[msg.sender_id] || 'User',
          isCurrentUser: msg.sender_id === currentUser.id
        }));

        setMessages(formattedMessages);

        // Mark received messages as read
        const unreadMsgIds = messagesData
          .filter(msg => msg.recipient_id === currentUser.id && !msg.read)
          .map(msg => msg.id);

        if (unreadMsgIds.length > 0) {
          console.log('ModernChatWindow: Marking messages as read:', unreadMsgIds);
          const { error: updateError } = await supabase
            .from('chat_messages')
            .update({ read: true })
            .in('id', unreadMsgIds);

          if (updateError) {
            console.error('ModernChatWindow: Error marking messages as read:', updateError);
          }
        }
      } catch (error) {
        console.error('ModernChatWindow: Error fetching messages:', error);
        toast({
          title: "Fehler",
          description: "Konnte Nachrichten nicht abrufen. Bitte versuchen Sie es erneut.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Set up realtime subscription
    if (currentUser) {
      console.log('ModernChatWindow: Setting up realtime subscription');
      
      const channel = supabase
        .channel('modern_chat_messages_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          async (payload: RealtimePayload) => {
            console.log('ModernChatWindow: Realtime message received:', payload);
            
            if (!payload.new || typeof payload.new !== 'object') {
              return;
            }
            
            const newMsg = payload.new as ChatMessageRecord;
            
            // Check if this message belongs to the current chat
            const belongsToChat = selectedUserId 
              ? (newMsg.sender_id === currentUser.id && newMsg.recipient_id === selectedUserId) || 
                (newMsg.sender_id === selectedUserId && newMsg.recipient_id === currentUser.id)
              : newMsg.recipient_id === null;

            if (belongsToChat) {
              // Get sender name
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', newMsg.sender_id)
                .single();

              const senderName = profile?.first_name && profile?.last_name 
                ? `${profile.first_name} ${profile.last_name}` 
                : 'User';

              // Get attachment info if present
              let attachment;
              if (newMsg.attachment_id) {
                const { data } = await supabase
                  .from('chat_attachments')
                  .select('id, file_name, file_type, file_path')
                  .eq('id', newMsg.attachment_id)
                  .single();
                
                if (data) {
                  attachment = {
                    id: data.id,
                    file_name: data.file_name,
                    file_type: data.file_type,
                    file_path: data.file_path,
                  };
                }
              }

              // Mark as read if current user is recipient
              if (newMsg.recipient_id === currentUser.id) {
                await supabase
                  .from('chat_messages')
                  .update({ read: true })
                  .eq('id', newMsg.id);
              }

              setMessages(prev => {
                if (prev.some(msg => msg.id === newMsg.id)) {
                  return prev.map(msg => 
                    msg.id === newMsg.id 
                      ? { 
                          ...msg, 
                          read: newMsg.recipient_id === currentUser.id ? true : msg.read,
                          attachment,
                          senderName
                        } 
                      : msg
                  );
                }
                return [...prev, {
                  id: newMsg.id,
                  content: newMsg.content || undefined,
                  sender_id: newMsg.sender_id,
                  recipient_id: newMsg.recipient_id || undefined,
                  created_at: new Date(newMsg.created_at),
                  read: newMsg.recipient_id === currentUser.id ? true : newMsg.read || false,
                  attachment,
                  senderName,
                  isCurrentUser: newMsg.sender_id === currentUser.id
                }];
              });
            }
          }
        )
        .subscribe();
      
      return () => {
        console.log('ModernChatWindow: Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser, selectedUserId]);

  const handleSendMessage = async (content: string, file?: File) => {
    if ((!content.trim() && !file) || !currentUser) return;

    try {
      let attachmentId = null;

      console.log('ModernChatWindow: Sending message:', { content, hasFile: !!file });

      // Upload file if selected
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        console.log('ModernChatWindow: Uploading file:', filePath);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('ModernChatWindow: File upload error:', uploadError);
          throw uploadError;
        }

        // Create attachment record
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('chat_attachments')
          .insert({
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: currentUser.id
          })
          .select()
          .single();

        if (attachmentError) {
          console.error('ModernChatWindow: Attachment record error:', attachmentError);
          throw attachmentError;
        }
        
        attachmentId = attachmentData.id;
        console.log('ModernChatWindow: Attachment created:', attachmentId);
      }

      // Create message
      const messageData = {
        content: content.trim() || null,
        sender_id: currentUser.id,
        recipient_id: selectedUserId || null,
        attachment_id: attachmentId
      };

      console.log('ModernChatWindow: Creating message:', messageData);

      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert(messageData);

      if (messageError) {
        console.error('ModernChatWindow: Message creation error:', messageError);
        throw messageError;
      }

      console.log('ModernChatWindow: Message sent successfully');
    } catch (error) {
      console.error('ModernChatWindow: Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('chat_attachments')
        .download(filePath);
      
      if (error) throw error;
      
      // Create download link
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
        description: "Datei konnte nicht heruntergeladen werden",
        variant: "destructive",
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Lade Chat...</div>
      </div>
    );
  }

  return (
    <div className={cn("h-full", fullWidth ? "w-full" : "")}>
      <ChatCard
        messages={messages}
        currentUserId={currentUser.id}
        recipientName={recipientName}
        onSendMessage={handleSendMessage}
        onDownloadFile={handleDownloadFile}
        loading={loading}
        className="h-full"
      />
    </div>
  );
};

export default ModernChatWindow;
