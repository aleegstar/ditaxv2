import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { ChatCard, ChatMessage } from '@/components/ui/chat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EncryptedChatService } from '@/services/EncryptedChatService';
import { User, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

const AdminChatOverview: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const encryptedChatService = EncryptedChatService.getInstance();

  useEffect(() => {
    if (!isValid || !userId) return;
    
    loadConversations();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel('admin_chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          loadConversations();
          if (selectedUserId) {
            loadMessagesForUser(selectedUserId);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, isValid]);

  const loadConversations = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Get all messages where admin is involved
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          sender_id,
          recipient_id,
          content,
          created_at,
          read
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, {
        lastMessage: string;
        lastMessageTime: Date;
        unreadCount: number;
      }>();

      messagesData?.forEach(msg => {
        const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        if (!partnerId) return; // Skip general chat messages
        
        const existing = conversationMap.get(partnerId);
        const messageTime = new Date(msg.created_at);
        
        if (!existing || messageTime > existing.lastMessageTime) {
          conversationMap.set(partnerId, {
            lastMessage: msg.content || '[Anhang]',
            lastMessageTime: messageTime,
            unreadCount: existing?.unreadCount || 0
          });
        }
        
        // Count unread messages from partner
        if (msg.recipient_id === userId && !msg.read) {
          const current = conversationMap.get(partnerId);
          if (current) {
            current.unreadCount++;
          }
        }
      });

      // Get user names
      const userIds = Array.from(conversationMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const conversationList: Conversation[] = Array.from(conversationMap.entries()).map(([userId, data]) => {
        const profile = profiles?.find(p => p.id === userId);
        const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Benutzer' : 'Unbekannt';
        
        return {
          userId,
          userName,
          lastMessage: data.lastMessage,
          lastMessageTime: data.lastMessageTime,
          unreadCount: data.unreadCount
        };
      });

      // Sort by last message time
      conversationList.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      
      setConversations(conversationList);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Fehler",
        description: "Unterhaltungen konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesForUser = async (partnerId: string) => {
    if (!userId) return;

    try {
      setMessagesLoading(true);
      
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
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Get sender names
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
          file_path: '',
          original_size: msg.chat_attachments[0].original_size || 0,
          encrypted: msg.chat_attachments[0].encrypted
        } : undefined,
        senderName: profileMap[msg.sender_id] || 'Unbekannt',
        isCurrentUser: msg.sender_id === userId
      })) || [];

      setMessages(formattedMessages);
      
      // Mark messages as read
      await markMessagesAsRead(partnerId);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Fehler",
        description: "Nachrichten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setMessagesLoading(false);
    }
  };

  const markMessagesAsRead = async (partnerId: string) => {
    if (!userId) return;

    try {
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('sender_id', partnerId)
        .eq('recipient_id', userId)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (content: string, file?: File) => {
    if (!userId || !selectedUserId || (!content.trim() && !file)) return;

    try {
      let attachmentId: string | undefined;

      if (file) {
        const attachment = await encryptedChatService.uploadEncryptedChatAttachment(file, userId);
        attachmentId = attachment.id;
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: userId,
          recipient_id: selectedUserId,
          content: content.trim() || null,
          attachment_id: attachmentId,
          chat_type: 'direct'
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Fehler",
          description: `Nachricht konnte nicht gesendet werden: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      await loadMessagesForUser(selectedUserId);
      await loadConversations();
      
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

  const selectConversation = (conversation: Conversation) => {
    setSelectedUserId(conversation.userId);
    loadMessagesForUser(conversation.userId);
  };

  const handleUserDetailsClick = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering conversation selection
    navigate(`/admin/user/${userId}`);
  };

  if (!isValid || !userId) {
    return (
      <div className="flex items-center justify-center h-full text-white/70">
        <p>Zugriff verweigert. Admin-Rechte erforderlich.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <Card className="w-80 bg-white/10 backdrop-blur-sm border-white/20 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-black font-semibold">Unterhaltungen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            {loading ? (
              <div className="p-4 text-black/70 text-center">
                Lade Unterhaltungen...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-black/70 text-center">
                Keine Unterhaltungen vorhanden
              </div>
            ) : (
              <div className="px-2 pb-2">
                {conversations.map((conversation, index) => (
                  <div
                    key={conversation.userId}
                    className={`mb-2 rounded-xl overflow-hidden transition-all duration-200 ${
                      index < conversations.length - 1 ? 'border-b border-black/10' : ''
                    }`}
                  >
                    <div className="relative">
                      <Button
                        variant="ghost"
                        className={`w-full justify-start p-4 text-left h-auto rounded-xl border transition-all duration-200 ${
                          selectedUserId === conversation.userId 
                            ? 'bg-white/20 text-black border-white/30 shadow-md transform scale-[1.02]' 
                            : 'text-black/70 hover:text-black hover:bg-white/10 border-transparent hover:border-white/20 hover:shadow-sm'
                        }`}
                        onClick={() => selectConversation(conversation)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm" 
                                style={{ backgroundColor: '#1d64ff', color: '#ffffff' }}
                              >
                                {conversation.userName?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <p className="font-semibold truncate text-base">{conversation.userName}</p>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="ml-2 bg-red-500 text-white shadow-sm">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="ml-13">
                            <p className="text-sm truncate opacity-70 mb-1">
                              {conversation.lastMessage}
                            </p>
                            <p className="text-xs opacity-50">
                              {conversation.lastMessageTime.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </Button>
                      
                      {/* User Details Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/40 text-black/70 hover:text-black rounded-lg transition-all duration-200"
                        onClick={(e) => handleUserDetailsClick(conversation.userId, e)}
                        title={`Benutzerdetails für ${conversation.userName} anzeigen`}
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Window */}
      <div className="flex-1 ml-4">
        {selectedUserId ? (
          <div className="relative">
            <ChatCard
              messages={messages}
              currentUserId={userId}
              recipientName={conversations.find(c => c.userId === selectedUserId)?.userName || 'Benutzer'}
              onSendMessage={handleSendMessage}
              onDownloadFile={handleDownloadFile}
              loading={messagesLoading}
              className="h-full"
            />
            
            {/* User Details Link in Chat Header */}
            <div className="absolute top-4 right-4 z-10">
              <Button
                size="sm"
                variant="ghost"
                className="bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/40 text-black/70 hover:text-black rounded-lg transition-all duration-200 flex items-center gap-2"
                onClick={() => navigate(`/admin/user/${selectedUserId}`)}
                title="Benutzerdetails anzeigen"
              >
                <User className="h-4 w-4" />
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Card className="h-full bg-white/10 backdrop-blur-sm border-white/20 shadow-lg">
            <CardContent className="flex items-center justify-center h-full">
              <p className="text-black/70 text-center">
                Wählen Sie eine Unterhaltung aus, um zu beginnen
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminChatOverview;
