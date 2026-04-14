import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { EncryptedChatService } from '@/services/EncryptedChatService';

interface ChatAttachmentData {
  id: string;
  file_name: string;
  file_type: string;
  original_size: number;
}

export interface ChatMessage {
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

export function useChatMessages(userId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [sessionId] = useState(() => uuidv4());
  const [escalatedMode, setEscalatedMode] = useState(false);
  const { toast } = useToast();

  const loadChatHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`id, content, created_at, chat_type, sender_id, recipient_id, escalation_requested, handled_by_admin, bot_handover_requested, attachment_id`)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const recentHandover = data.find(msg => msg.bot_handover_requested && new Date(msg.created_at) > new Date(Date.now() - 5 * 60 * 1000));
        if (recentHandover) setEscalatedMode(false);

        const adminIds = [...new Set(data.filter(msg => msg.sender_id && msg.sender_id !== userId && msg.chat_type === 'human').map(msg => msg.sender_id))].filter(Boolean);
        let adminProfiles: Record<string, string> = {};
        if (adminIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', adminIds);
          if (profiles) {
            adminProfiles = profiles.reduce((acc, p) => {
              acc[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Admin';
              return acc;
            }, {} as Record<string, string>);
          }
        }

        const attachmentIds = data.filter(msg => msg.attachment_id).map(msg => msg.attachment_id as string);
        let attachmentMap: Record<string, ChatAttachmentData> = {};
        if (attachmentIds.length > 0) {
          const { data: attachments } = await supabase.from('chat_attachments').select('id, file_name, file_type, original_size').in('id', attachmentIds);
          if (attachments) {
            attachmentMap = attachments.reduce((acc, att) => {
              acc[att.id] = { id: att.id, file_name: att.file_name, file_type: att.file_type, original_size: att.original_size || 0 };
              return acc;
            }, {} as Record<string, ChatAttachmentData>);
          }
        }

        const formatted: ChatMessage[] = data.map(msg => {
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
            attachment: msg.attachment_id ? attachmentMap[msg.attachment_id] : undefined,
          };
        });
        setMessages(formatted);

        const hasEscalation = data.some(msg => msg.escalation_requested || msg.handled_by_admin);
        if (hasEscalation && !recentHandover) setEscalatedMode(true);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Real-time admin messages
  useEffect(() => {
    if (!escalatedMode || !userId) return;
    const subscription = supabase.channel('overlay_admin_messages').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `recipient_id=eq.${userId}`
    }, payload => {
      const msg = payload.new as any;
      if (msg.sender_id !== userId) {
        if (msg.bot_handover_requested) {
          setEscalatedMode(false);
          setMessages(prev => [...prev, {
            id: uuidv4(),
            content: "Ich bin wieder für dich da! Wie kann ich dir weiterhelfen?",
            isBot: true,
            timestamp: new Date(),
            chat_type: 'bot'
          }]);
          return;
        }
        setMessages(prev => [...prev, {
          id: msg.id,
          content: msg.content || '',
          isBot: false,
          isAdmin: true,
          timestamp: new Date(msg.created_at),
          senderName: 'Support-Team',
          chat_type: msg.chat_type,
        }]);
      }
    }).subscribe();
    return () => { subscription.unsubscribe(); };
  }, [escalatedMode, userId]);

  const sendMessage = useCallback(async (messageContent: string, files?: File[]) => {
    if (!userId || ((!messageContent.trim() && (!files || files.length === 0)) || isLoading)) return;

    const hasFilesOnly = !messageContent.trim() && files && files.length > 0;
    const encryptedChatService = EncryptedChatService.getInstance();
    let attachmentId: string | undefined;
    let attachmentData: ChatAttachmentData | undefined;

    if (files && files.length > 0) {
      try {
        const file = files[0];
        const attachment = await encryptedChatService.uploadEncryptedChatAttachment(file, userId);
        attachmentId = attachment.id;
        attachmentData = { id: attachment.id, file_name: attachment.fileName, file_type: attachment.fileType, original_size: attachment.originalSize };
      } catch (err: any) {
        toast({ title: "Upload-Fehler", description: err.message || "Datei konnte nicht hochgeladen werden.", variant: "destructive" });
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      content: messageContent.trim(),
      isBot: false,
      timestamp: new Date(),
      chat_type: 'human',
      attachment: attachmentData,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (escalatedMode) {
        const { error } = await supabase.from('chat_messages').insert({
          sender_id: userId,
          recipient_id: null,
          content: messageContent.trim() || null,
          chat_type: 'human',
          escalation_requested: true,
          attachment_id: attachmentId || null,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.functions.invoke('chatbot-response', {
          body: { message: hasFilesOnly ? 'Ich habe eine Datei gesendet.' : messageContent, userId, sessionId, attachmentId: attachmentId || null },
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
          chat_type: 'bot',
        };
        setMessages(prev => [...prev, botMessage]);

        if (data.escalated) {
          setEscalatedMode(true);
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: uuidv4(),
        content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.",
        isBot: true,
        timestamp: new Date(),
        chat_type: 'bot',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading, escalatedMode, sessionId, toast]);

  const requestEscalation = useCallback(async () => {
    if (!userId || escalatedMode) return;
    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: userId,
        recipient_id: null,
        content: 'Ich möchte mit einem Mitarbeiter verbunden werden.',
        chat_type: 'human',
        escalation_requested: true,
      });
      if (error) throw error;
      setEscalatedMode(true);
      const escalationMsg: ChatMessage = {
        id: uuidv4(),
        content: 'Ich möchte mit einem Mitarbeiter verbunden werden.',
        isBot: false,
        timestamp: new Date(),
        chat_type: 'human',
      };
      setMessages(prev => [...prev, escalationMsg]);
      toast({ title: "An Mitarbeiter weitergeleitet", description: "Ein Mitarbeiter wird sich in Kürze bei Ihnen melden." });
    } catch (error) {
      console.error('Error requesting escalation:', error);
      toast({ title: "Fehler", description: "Weiterleitung fehlgeschlagen. Bitte versuche es erneut.", variant: "destructive" });
    }
  }, [userId, escalatedMode, toast]);

  return { messages, isLoading, isLoadingHistory, escalatedMode, sendMessage, loadChatHistory, requestEscalation };
}
