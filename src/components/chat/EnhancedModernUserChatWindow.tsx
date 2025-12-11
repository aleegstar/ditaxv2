
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { ChatBotInterface } from './ChatBotInterface';
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';
import { supabase } from '@/integrations/supabase/client';

export const EnhancedModernUserChatWindow: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const { markAsRead, unreadCount } = useUnreadMessages();
  const [isEscalated, setIsEscalated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);

  useEffect(() => {
    if (!isValid || !userId) return;
    
    checkEscalationStatus();
  }, [userId, isValid]);

  // Separate useEffect for marking messages as read
  useEffect(() => {
    if (!isValid || !userId || hasMarkedAsRead) return;
    
    // Only mark as read if there are actually unread messages
    if (unreadCount > 0) {
      console.log('Marking chat messages as read, count:', unreadCount);
      markAsRead();
      setHasMarkedAsRead(true);
    }
  }, [userId, isValid, unreadCount, markAsRead, hasMarkedAsRead]);

  const checkEscalationStatus = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Check if user has any escalated messages
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

      // If there's an escalated message, mark as escalated
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

  if (loading) {
    return (
      <AnimatedPageContainer className="flex items-center justify-center h-full text-white/70">
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          Chat wird geladen...
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
        <ChatBotInterface
          userId={userId}
          onEscalate={handleEscalate}
          isEscalated={isEscalated}
        />
      </motion.div>
    </AnimatedPageContainer>
  );
};
