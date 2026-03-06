
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ChatBotInterface } from './ChatBotInterface';
import { supabase } from '@/integrations/supabase/client';

export const EnhancedModernUserChatWindow: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const { markAsRead, unreadCount } = useUnreadMessages();
  const [isEscalated, setIsEscalated] = useState(false);
  const [loading, setLoading] = useState(true);
  const isChatActiveRef = useRef(true);

  useEffect(() => {
    if (!isValid || !userId) return;
    if (unreadCount > 0 && isChatActiveRef.current) {
      console.log('Chat is active, marking messages as read:', unreadCount);
      markAsRead();
      
      supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('type', 'new_message')
        .eq('read', false)
        .then(({ error }) => {
          if (error) console.error('Error marking chat notifications as read:', error);
        });
    }
  }, [userId, isValid, unreadCount, markAsRead]);

  useEffect(() => {
    isChatActiveRef.current = true;
    return () => {
      isChatActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isValid || !userId) return;
    checkEscalationStatus();
  }, [userId, isValid]);

  const checkEscalationStatus = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('escalation_requested, handled_by_admin')
        .eq('sender_id', userId)
        .eq('escalation_requested', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking escalation status:', error);
        return;
      }

      if (data && data.length > 0) {
        setIsEscalated(true);
      }
    } catch (error) {
      console.error('Error checking escalation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = () => {
    setIsEscalated(true);
  };

  if (!isValid || !userId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          Bitte melden Sie sich an, um den Chat zu nutzen.
        </motion.p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          Chat wird geladen...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ChatBotInterface
        userId={userId}
        onEscalate={handleEscalate}
        isEscalated={isEscalated}
      />
    </div>
  );
};
