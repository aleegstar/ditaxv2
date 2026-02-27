
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { userId, isValid } = useAuth();

  // Fetch initial unread count
  const fetchUnreadCount = async () => {
    if (!userId || !isValid) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('recipient_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
      } else {
        setUnreadCount(data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read
  const markAsRead = async () => {
    if (!userId || !isValid) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('recipient_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [userId, isValid]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId || !isValid) return;

    console.log('Setting up real-time subscription for user:', userId);

    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Real-time chat message update:', payload);
          
          if (payload.eventType === 'INSERT' && !payload.new.read) {
            // New unread message
            setUnreadCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            // Message read status changed
            if (payload.old.read === false && payload.new.read === true) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (payload.old.read === true && payload.new.read === false) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, isValid]);

  return {
    unreadCount,
    loading,
    markAsRead,
    refetch: fetchUnreadCount
  };
};
