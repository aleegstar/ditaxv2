
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EscalatedChatWindow } from './EscalatedChatWindow';
import { Bot, User, Clock, CheckCircle, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  hasBotMessages: boolean;
}

export const EnhancedAdminChatOverview: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const markMessagesAsRead = async (partnerId: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('sender_id', partnerId)
        .or(`recipient_id.eq.${userId},recipient_id.is.null`)
        .eq('read', false);

      if (error) { console.error('Error marking messages as read:', error); return; }
      
      setUsers(prevUsers => 
        prevUsers.map(user => user.id === partnerId ? { ...user, unreadCount: 0 } : user)
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleUserSelect = async (uid: string) => {
    setSelectedUserId(uid);
    const user = users.find(u => u.id === uid);
    if (user && user.unreadCount > 0) await markMessagesAsRead(uid);
  };

  useEffect(() => {
    if (!isValid || !userId) return;
    loadChatUsers();
    const subscription = supabase
      .channel('admin_chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => loadChatUsers())
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [userId, isValid]);

  const loadChatUsers = async () => {
    if (!userId) return;
    const currentAdminId = userId;
    try {
      setLoading(true);
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('sender_id, recipient_id, content, created_at, read, chat_type, escalation_requested, handled_by_admin')
        .not('sender_id', 'is', null)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;
      if (!messagesData || messagesData.length === 0) { setUsers([]); return; }

      const userMessagesMap = new Map<string, any[]>();
      messagesData.forEach(msg => {
        if (msg.sender_id && msg.sender_id !== userId) {
          if (!userMessagesMap.has(msg.sender_id)) userMessagesMap.set(msg.sender_id, []);
          userMessagesMap.get(msg.sender_id)?.push(msg);
        }
      });

      const userIds = Array.from(userMessagesMap.keys());
      if (userIds.length === 0) { setUsers([]); return; }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      if (profilesError) throw profilesError;

      const chatUsers: ChatUser[] = [];
      userIds.forEach(uid => {
        const userMessages = userMessagesMap.get(uid) || [];
        const profile = profiles?.find(p => p.id === uid);
        if (!profile) return;

        const lastMessage = userMessages[0];
        const escalatedMessages = userMessages.filter(m => m.escalation_requested);
        const botMessages = userMessages.filter(m => m.chat_type === 'bot');

        let escalationStatus: 'none' | 'requested' | 'handled' = 'none';
        let chatType: 'bot' | 'escalated' | 'human' = 'human';
        if (escalatedMessages.length > 0) {
          escalationStatus = escalatedMessages[0].handled_by_admin ? 'handled' : 'requested';
          chatType = 'escalated';
        } else if (botMessages.length > 0) { chatType = 'bot'; }

        const unreadCount = userMessages.filter(m => 
          !m.read && m.sender_id === uid && m.sender_id !== currentAdminId &&
          (m.recipient_id === currentAdminId || m.recipient_id === null)
        ).length;

        chatUsers.push({
          id: uid,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unbekannt',
          email: profile.email || '',
          lastMessage: lastMessage?.content || 'Keine Nachrichten',
          lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : undefined,
          escalationStatus,
          handledBy: escalatedMessages[0]?.handled_by_admin,
          unreadCount, chatType,
          totalMessages: userMessages.length,
          hasBotMessages: botMessages.length > 0,
        });
      });

      chatUsers.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      setUsers(chatUsers);
    } catch (error) {
      console.error('Error loading chat users:', error);
      toast({ title: "Fehler", description: "Chat-Übersicht konnte nicht geladen werden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadChatUsers();
    toast({ title: "Aktualisiert", description: "Chat-Übersicht wurde neu geladen." });
  };

  const handleTakeOver = () => { loadChatUsers(); };
  const handleResolve = () => { setSelectedUserId(null); loadChatUsers(); };

  const getFilteredUsers = () => {
    switch (activeTab) {
      case 'bot': return users.filter(u => u.hasBotMessages);
      case 'escalated': return users.filter(u => u.escalationStatus === 'requested');
      case 'active': return users.filter(u => u.escalationStatus === 'handled');
      default: return users;
    }
  };

  const getStatusIcon = (user: ChatUser) => {
    switch (user.escalationStatus) {
      case 'requested': return <AlertCircle className="w-3.5 h-3.5 text-foreground/60" />;
      case 'handled': return <CheckCircle className="w-3.5 h-3.5 text-foreground/40" />;
      default: return user.chatType === 'bot' ? 
        <Bot className="w-3.5 h-3.5 text-muted-foreground/50" /> : 
        <User className="w-3.5 h-3.5 text-muted-foreground/50" />;
    }
  };

  const getStatusLabel = (user: ChatUser) => {
    switch (user.escalationStatus) {
      case 'requested': return 'Eskaliert';
      case 'handled': return 'Aktiv';
      default: return user.chatType === 'bot' ? 'Bot' : 'Chat';
    }
  };

  if (!isValid) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Bitte melde dich an.</p>
      </div>
    );
  }

  const filteredUsers = getFilteredUsers();
  const tabs = [
    { key: 'all', label: 'Alle', count: users.length },
    { key: 'escalated', label: 'Eskaliert', count: users.filter(u => u.escalationStatus === 'requested').length },
    { key: 'active', label: 'Aktiv', count: users.filter(u => u.escalationStatus === 'handled').length },
    { key: 'bot', label: 'Bot', count: users.filter(u => u.hasBotMessages).length },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-background">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-end justify-between max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chat</h1>
            <p className="text-sm text-muted-foreground mt-1">{users.length} Konversationen</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 max-w-6xl mx-auto w-full px-6 pb-6 gap-4">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col border border-border/60 rounded-xl overflow-hidden bg-card">
          <div className="p-3 border-b border-border/40">
            <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all",
                    activeTab === t.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  {t.count > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{t.count}</span>}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-1.5">
              {loading ? (
                <div className="text-center text-muted-foreground py-12">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-30" />
                  <p className="text-xs">Lade Chats...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Keine Chats</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors mb-0.5",
                      selectedUserId === user.id
                        ? "bg-foreground/[0.06]"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusIcon(user)}
                        <span className="text-sm font-medium text-foreground truncate">
                          {user.name}
                        </span>
                        {user.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-semibold flex items-center justify-center">
                            {user.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {getStatusLabel(user)}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-muted-foreground truncate ml-[22px]">
                      {user.lastMessage}
                    </p>
                    
                    {user.lastMessageTime && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-1 ml-[22px]">
                        <Clock className="w-2.5 h-2.5" />
                        {user.lastMessageTime.toLocaleString('de-CH', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
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
        <div className="flex-1 border border-border/60 rounded-xl overflow-hidden bg-card">
          {selectedUserId ? (
            <EscalatedChatWindow
              userId={selectedUserId}
              adminId={userId}
              isAdmin={true}
              onTakeOver={handleTakeOver}
              onResolve={handleResolve}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-foreground">Chat auswählen</p>
                <p className="text-xs text-muted-foreground mt-1">Klicke auf eine Konversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
