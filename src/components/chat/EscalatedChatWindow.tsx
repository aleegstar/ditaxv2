import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Clock, CheckCircle, Bot } from 'lucide-react';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import UserChatBubble from './UserChatBubble';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
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
      } = await supabase.from('chat_messages').select(`
          *,
          chat_attachments!left (
            id,
            file_name,
            file_type,
            original_size,
            encrypted
          )
        `).or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', {
        ascending: true
      });
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

      // Check if chat is currently escalated and handled by checking the most recent escalation status
      const escalatedMessages = messagesData.filter(m => m.escalation_requested === true && m.handled_by_admin);
      const mostRecentEscalation = escalatedMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Check if there's a bot handover after the most recent escalation
      if (mostRecentEscalation) {
        const handoverMessages = messagesData.filter(m => m.bot_handover_requested === true && new Date(m.created_at) > new Date(mostRecentEscalation.created_at));
        if (handoverMessages.length > 0) {
          // Bot handover occurred after escalation, chat is no longer escalated
          setIsHandled(false);
          setHandledBy(null);
        } else {
          // No handover after escalation, chat is still handled
          setIsHandled(true);
          setHandledBy(mostRecentEscalation.handled_by_admin);
        }
      } else {
        // No escalated messages with admin handler
        setIsHandled(false);
        setHandledBy(null);
      }
      const formattedMessages: ChatMessage[] = messagesData.map(msg => ({
        id: msg.id,
        content: msg.content || undefined,
        sender_id: msg.sender_id || 'bot',
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
        senderName: msg.sender_id ? profileMap[msg.sender_id] || 'Benutzer' : 'Assistent',
        isCurrentUser: isAdmin ? msg.sender_id === adminId : msg.sender_id === userId
      }));
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
  const handleSendMessage = async (inputMessage?: string, files?: File[]) => {
    if (!inputMessage?.trim() && (!files || files.length === 0)) return;
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
  return <div className="flex flex-col h-full relative">
      {/* Header with user info and status */}
      <div className="border-b border-gray-200 p-4 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{userName}</h3>
              <div className="flex items-center gap-2">
                {isHandled ? <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Wird bearbeitet
                  </Badge> : <Badge variant="destructive" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Wartet auf Support
                  </Badge>}
              </div>
            </div>
          </div>

          {isAdmin && <div className="flex gap-2">
              {!isHandled && <Button 
                  onClick={handleTakeOverInternal} 
                  size="sm" 
                  className="bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200"
                  style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
                >
                  Chat übernehmen
                </Button>}
              {isHandled && <>
                  <Button onClick={handleHandoverToBot} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                    <Bot className="w-4 h-4 mr-2" />
                    An Bot zurückgeben
                  </Button>
                  <Button onClick={handleResolveChat} size="sm" variant="outline" className="text-gray-600 border-gray-200">
                    Abschließen
                  </Button>
                </>}
            </div>}
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {loading ? <div className="flex justify-center items-center h-64 text-gray-500">
              Nachrichten werden geladen...
            </div> : messages.length === 0 ? <div className="flex justify-center items-center h-64 text-gray-500">
              Keine Nachrichten vorhanden.
            </div> : messages.map(msg => <UserChatBubble key={msg.id} message={msg} onDownloadFile={handleDownloadFile} />)}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
          <PromptInputBox onSend={handleSendMessage} placeholder="Nachricht eingeben..." isLoading={uploading} />
        </div>
      </div>
    </div>;
};