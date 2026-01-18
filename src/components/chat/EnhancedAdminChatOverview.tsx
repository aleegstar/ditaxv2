
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EscalatedChatWindow } from './EscalatedChatWindow';
import { AdminWelcomeHeader } from '../admin/AdminWelcomeHeader';
import { Bot, User, Clock, CheckCircle, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatUser {
  id: string;
  name: string;
  email: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  escalationStatus: 'none' | 'requested' | 'handled';
  handledBy?: string;
  unreadCount: number;
  chatType: 'bot' | 'escalated' | 'human';
  totalMessages: number;
  hasBotMessages: boolean; // Track if chat has bot messages
}

export const EnhancedAdminChatOverview: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  // Mark messages as read when admin selects a user
  const markMessagesAsRead = async (partnerId: string) => {
    if (!userId) return;

    try {
      // Mark both direct messages and pool messages as read
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('sender_id', partnerId)
        .or(`recipient_id.eq.${userId},recipient_id.is.null`)
        .eq('read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }
      
      console.log(`Marked messages (pool + direct) as read for user: ${partnerId}`);

      // Update the local state to reflect the change
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === partnerId 
            ? { ...user, unreadCount: 0 }
            : user
        )
      );

      console.log(`Marked messages as read for user: ${partnerId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Handle user selection and mark messages as read
  const handleUserSelect = async (userId: string) => {
    setSelectedUserId(userId);
    
    // Find the user and check if they have unread messages
    const user = users.find(u => u.id === userId);
    if (user && user.unreadCount > 0) {
      await markMessagesAsRead(userId);
    }
  };

  useEffect(() => {
    if (!isValid || !userId) return;
    
    loadChatUsers();
    
    // Set up realtime subscription
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
          console.log('Realtime update - reloading chat users');
          loadChatUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, isValid]);

  const loadChatUsers = async () => {
    if (!userId) return;
    
    const currentAdminId = userId; // Store admin ID for later use

    try {
      setLoading(true);
      console.log('Loading chat users for admin...');

      // Get all messages to analyze chat patterns
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          sender_id,
          recipient_id,
          content,
          created_at,
          read,
          chat_type,
          escalation_requested,
          handled_by_admin
        `)
        .not('sender_id', 'is', null)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        throw messagesError;
      }

      console.log(`Found ${messagesData?.length || 0} total messages`);

      if (!messagesData || messagesData.length === 0) {
        console.log('No messages found');
        setUsers([]);
        return;
      }

      // Group messages by user
      const userMessagesMap = new Map<string, any[]>();
      
      messagesData.forEach(msg => {
        if (msg.sender_id && msg.sender_id !== userId) { // Exclude admin's own messages as senders
          if (!userMessagesMap.has(msg.sender_id)) {
            userMessagesMap.set(msg.sender_id, []);
          }
          userMessagesMap.get(msg.sender_id)?.push(msg);
        }
      });

      const userIds = Array.from(userMessagesMap.keys());
      console.log(`Found ${userIds.length} unique users with messages:`, userIds);

      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      // Get user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      console.log(`Found ${profiles?.length || 0} user profiles`);

      // Build chat users list
      const chatUsers: ChatUser[] = [];

      userIds.forEach(userId => {
        const userMessages = userMessagesMap.get(userId) || [];
        const profile = profiles?.find(p => p.id === userId);
        
        if (!profile) {
          console.log(`No profile found for user ${userId}`);
          return;
        }

        const lastMessage = userMessages[0];
        const escalatedMessages = userMessages.filter(m => m.escalation_requested);
        const botMessages = userMessages.filter(m => m.chat_type === 'bot');
        const humanMessages = userMessages.filter(m => m.chat_type === 'human');
        
        let escalationStatus: 'none' | 'requested' | 'handled' = 'none';
        let chatType: 'bot' | 'escalated' | 'human' = 'human';
        
        if (escalatedMessages.length > 0) {
          const latestEscalation = escalatedMessages[0];
          escalationStatus = latestEscalation.handled_by_admin ? 'handled' : 'requested';
          chatType = 'escalated';
        } else if (botMessages.length > 0) {
          chatType = 'bot';
        }

        // Count unread messages from this user (excluding admin's own messages)
        const unreadCount = userMessages.filter(m => 
          !m.read && 
          m.sender_id === userId && 
          m.sender_id !== currentAdminId && // Exclude admin's own messages
          (m.recipient_id === currentAdminId || m.recipient_id === null)
        ).length;

        const chatUser: ChatUser = {
          id: userId,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unbekannt',
          email: profile.email || '',
          lastMessage: lastMessage?.content || 'Keine Nachrichten',
          lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : undefined,
          escalationStatus,
          handledBy: escalatedMessages[0]?.handled_by_admin,
          unreadCount,
          chatType,
          totalMessages: userMessages.length,
          hasBotMessages: botMessages.length > 0 // Track if chat has bot messages
        };

        console.log(`Chat user created:`, {
          id: chatUser.id,
          name: chatUser.name,
          chatType: chatUser.chatType,
          escalationStatus: chatUser.escalationStatus,
          totalMessages: chatUser.totalMessages,
          unreadCount: chatUser.unreadCount
        });

        chatUsers.push(chatUser);
      });

      // Sort by last message time
      chatUsers.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      console.log(`Final chat users list: ${chatUsers.length} users`);
      setUsers(chatUsers);
    } catch (error) {
      console.error('Error loading chat users:', error);
      toast({
        title: "Fehler",
        description: "Chat-Übersicht konnte nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadChatUsers();
    toast({
      title: "Aktualisiert",
      description: "Chat-Übersicht wurde neu geladen."
    });
  };

  const handleTakeOver = (userId: string) => {
    loadChatUsers(); // Refresh the list
    toast({
      title: "Chat übernommen",
      description: "Der Chat wurde erfolgreich übernommen.",
    });
  };

  const handleResolve = (userId: string) => {
    setSelectedUserId(null);
    loadChatUsers(); // Refresh the list
    toast({
      title: "Chat abgeschlossen",
      description: "Der Chat wurde erfolgreich abgeschlossen.",
    });
  };

  const getFilteredUsers = () => {
    switch (activeTab) {
      case 'bot':
        return users.filter(u => u.hasBotMessages); // Show all chats with bot messages
      case 'escalated':
        return users.filter(u => u.escalationStatus === 'requested');
      case 'active':
        return users.filter(u => u.escalationStatus === 'handled');
      case 'all':
      default:
        return users;
    }
  };

  const getStatusIcon = (user: ChatUser) => {
    switch (user.escalationStatus) {
      case 'requested':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'handled':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return user.chatType === 'bot' ? 
          <Bot className="w-4 h-4 text-blue-400" /> : 
          <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (user: ChatUser) => {
    switch (user.escalationStatus) {
      case 'requested':
        return <Badge variant="destructive" className="text-xs">Eskalation</Badge>;
      case 'handled':
        return <Badge variant="secondary" className="text-xs">Bearbeitung</Badge>;
      default:
        return user.chatType === 'bot' ? 
          <Badge variant="outline" className="text-xs">Bot ({user.totalMessages})</Badge> : 
          <Badge variant="outline" className="text-xs">Chat ({user.totalMessages})</Badge>;
    }
  };

  if (!isValid) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Bitte melde dich an.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 min-h-screen">
      <AdminWelcomeHeader
        title="Chat-Übersicht"
        subtitle="Verwalte Kundenbetreuung und Bot-Eskalationen"
        badge={{
          text: `${users.length} aktive Chats`,
          variant: 'secondary'
        }}
        onRefresh={loadChatUsers}
        showStats={false}
      />
      
      <div className="flex h-[calc(100vh-200px)]">
      {/* Users List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Chat-Übersicht</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
              className="text-gray-600 hover:bg-gray-100"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 h-auto gap-1 p-1 bg-white border border-[rgb(230,230,230)] rounded-full" style={{ boxShadow: 'rgba(0, 0, 0, 0.08) 0px 3px 8px 0px' }}>
              <TabsTrigger value="all" className="text-[11px] px-2 py-2 whitespace-nowrap">
                Alle ({users.length})
              </TabsTrigger>
              <TabsTrigger value="escalated" className="text-[11px] px-2 py-2 whitespace-nowrap">
                Eskaliert ({users.filter(u => u.escalationStatus === 'requested').length})
              </TabsTrigger>
              <TabsTrigger value="active" className="text-[11px] px-2 py-2 whitespace-nowrap">
                Aktiv ({users.filter(u => u.escalationStatus === 'handled').length})
              </TabsTrigger>
              <TabsTrigger value="bot" className="text-[11px] px-2 py-2 whitespace-nowrap">
                Bot ({users.filter(u => u.hasBotMessages).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="text-center text-gray-500 py-8">
                <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                <p>Lade Chats...</p>
              </div>
            ) : getFilteredUsers().length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Filter className="w-8 h-8 mx-auto mb-4 opacity-50" />
                <p>Keine Chats in dieser Kategorie</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="mt-2 text-gray-400 hover:text-gray-600"
                >
                  Neu laden
                </Button>
              </div>
            ) : (
              getFilteredUsers().map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                    selectedUserId === user.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(user)}
                      <span className="font-medium text-gray-900 text-sm">
                        {user.name}
                      </span>
                      {user.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          {user.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {getStatusBadge(user)}
                  </div>
                  
                  <p className="text-gray-600 text-xs truncate mb-1">
                    {user.email}
                  </p>
                  
                  <p className="text-gray-500 text-xs truncate mb-2">
                    {user.lastMessage}
                  </p>
                  
                  {user.lastMessageTime && (
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <Clock className="w-3 h-3" />
                      {user.lastMessageTime.toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-white">
        {selectedUserId ? (
          <EscalatedChatWindow
            userId={selectedUserId}
            adminId={userId}
            isAdmin={true}
            onTakeOver={handleTakeOver}
            onResolve={handleResolve}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Wähle einen Chat aus</p>
              <p className="text-sm">Klicke auf einen Benutzer, um den Chat zu öffnen.</p>
              <p className="text-xs mt-2 opacity-50">
                {users.length} Chats verfügbar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
