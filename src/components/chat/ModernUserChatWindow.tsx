import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ChatCard, ChatMessage } from '@/components/ui/chat-card';
import { useToast } from '@/hooks/use-toast';
import { EncryptedChatService } from '@/services/EncryptedChatService';
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';

const ModernUserChatWindow: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const { markAsRead, unreadCount } = useUnreadMessages();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminRecipientId, setAdminRecipientId] = useState<string | null>(null);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
  const encryptedChatService = EncryptedChatService.getInstance();

  useEffect(() => {
    if (!isValid || !userId) return;
    
    loadMessages();
    findAdminRecipient();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel('user_chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=eq.${userId},recipient_id=eq.${userId}`
        },
        () => loadMessages()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, isValid]);

  // Separate useEffect for marking messages as read
  useEffect(() => {
    if (!isValid || !userId || hasMarkedAsRead) return;
    
    // Only mark as read if there are actually unread messages and messages are loaded
    if (unreadCount > 0 && !loading) {
      console.log('Marking chat messages as read, count:', unreadCount);
      markAsRead();
      setHasMarkedAsRead(true);
    }
  }, [userId, isValid, unreadCount, markAsRead, hasMarkedAsRead, loading]);

  const findAdminRecipient = async () => {
    try {
      // Find an admin user to send messages to
      const { data: adminUsers, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);

      if (error) {
        console.error('Error finding admin:', error);
        return;
      }

      if (adminUsers && adminUsers.length > 0) {
        setAdminRecipientId(adminUsers[0].user_id);
      }
    } catch (error) {
      console.error('Error finding admin recipient:', error);
    }
  };

  const loadMessages = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      console.log('Loading messages for user:', userId);

      // Load messages where user is sender or recipient
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          chat_attachments!left (
            id,
            file_name,
            file_type,
            original_size,
            encrypted
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Get sender names for messages
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', senderIds);

      const profileMap = profiles?.reduce((acc, profile) => {
        acc[profile.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Benutzer';
        return acc;
      }, {} as Record<string, string>) || {};

      const formattedMessages: ChatMessage[] = messagesData?.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        recipient_id: msg.recipient_id,
        created_at: new Date(msg.created_at),
        read: msg.read,
        attachment: msg.chat_attachments?.[0] ? {
          id: msg.chat_attachments[0].id,
          file_name: msg.chat_attachments[0].file_name,
          file_type: msg.chat_attachments[0].file_type,
          file_path: '', // Will be handled by encrypted service
          original_size: msg.chat_attachments[0].original_size || 0,
          encrypted: msg.chat_attachments[0].encrypted
        } : undefined,
        senderName: profileMap[msg.sender_id] || 'Unbekannt',
        isCurrentUser: msg.sender_id === userId
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Fehler",
        description: "Nachrichten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (!userId || (!content.trim() && !file)) return;

    try {
      let attachmentId: string | undefined;

      // Handle file upload if present
      if (file) {
        console.log('Uploading file:', file.name);
        const attachment = await encryptedChatService.uploadEncryptedChatAttachment(file, userId);
        attachmentId = attachment.id;
      }

      // Determine recipient - use admin if available, null for general chat if user is admin
      let recipientId = adminRecipientId;
      
      // Check if user is admin for general chat capability
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (userRole && !recipientId) {
        // Admin can send to general chat (null recipient)
        recipientId = null;
      }

      console.log('Sending message:', {
        sender_id: userId,
        recipient_id: recipientId,
        content: content.trim() || null,
        attachment_id: attachmentId
      });

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          content: content.trim() || null,
          attachment_id: attachmentId,
          chat_type: 'direct'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Fehler",
          description: `Nachricht konnte nicht gesendet werden: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Message sent successfully:', data);
      
      // Reload messages to show the new one
      await loadMessages();
      
      toast({
        title: "Erfolgreich",
        description: "Nachricht wurde gesendet.",
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: error.message || "Nachricht konnte nicht gesendet werden.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string, attachmentId?: string) => {
    if (!attachmentId || !userId) return;

    try {
      const { blob, filename } = await encryptedChatService.downloadDecryptedChatAttachment(attachmentId, userId);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Erfolgreich",
        description: "Datei wurde heruntergeladen.",
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Fehler",
        description: "Datei konnte nicht heruntergeladen werden.",
        variant: "destructive",
      });
    }
  };

  if (!isValid || !userId) {
    return (
      <AnimatedPageContainer className="flex items-center justify-center h-full text-white/70">
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          Bitte melden Sie sich an, um den Chat zu nutzen.
        </motion.p>
      </AnimatedPageContainer>
    );
  }

  return (
    <AnimatedPageContainer className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1"
      >
        <ChatCard
          messages={messages}
          currentUserId={userId}
          recipientName="Support Chat"
          onSendMessage={handleSendMessage}
          onDownloadFile={handleDownloadFile}
          loading={loading}
          className="flex-1"
        />
      </motion.div>
    </AnimatedPageContainer>
  );
};

export default ModernUserChatWindow;
