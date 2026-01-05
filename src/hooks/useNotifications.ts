
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from './use-auth-validation';
import { useToast } from './use-toast';

export interface Notification {
  id: string;
  type: 'chat_message' | 'tax_return_completed';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata: Record<string, any>;
  related_id: string | null;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { userId, isValid } = useAuthValidation();
  const { toast } = useToast();

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!userId || !isValid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        toast({
          title: "Fehler",
          description: "Benachrichtigungen konnten nicht geladen werden.",
          variant: "destructive"
        });
        return;
      }

      const formattedNotifications: Notification[] = data?.map(item => ({
        id: item.id,
        type: item.type as 'chat_message' | 'tax_return_completed', // Type assertion for database strings
        title: item.title,
        message: item.message,
        read: item.read,
        created_at: item.created_at,
        metadata: (item.metadata as Record<string, any>) || {},
        related_id: item.related_id
      })) || [];

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!userId || !isValid) return;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!userId || !isValid) return;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete a single notification
  const deleteNotification = async (notificationId: string) => {
    if (!userId || !isValid) return;

    try {
      const notification = notifications.find(n => n.id === notificationId);
      
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting notification:', error);
        toast({
          title: "Fehler",
          description: "Benachrichtigung konnte nicht gelöscht werden.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    if (!userId || !isValid) return;

    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting all notifications:', error);
        toast({
          title: "Fehler",
          description: "Benachrichtigungen konnten nicht gelöscht werden.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  // Initialize
  useEffect(() => {
    fetchNotifications();
  }, [userId, isValid]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId || !isValid) return;

    console.log('Setting up real-time notification subscription for user:', userId);

    const channel = supabase
      .channel('user_notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Real-time notification update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification: Notification = {
              id: payload.new.id,
              type: payload.new.type as 'chat_message' | 'tax_return_completed',
              title: payload.new.title,
              message: payload.new.message,
              read: payload.new.read,
              created_at: payload.new.created_at,
              metadata: (payload.new.metadata as Record<string, any>) || {},
              related_id: payload.new.related_id
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
              
              // Show toast for new notification
              toast({
                title: newNotification.title,
                description: newNotification.message,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(n => 
                n.id === payload.new.id 
                  ? {
                      ...n,
                      read: payload.new.read,
                      title: payload.new.title,
                      message: payload.new.message,
                      metadata: (payload.new.metadata as Record<string, any>) || {}
                    }
                  : n
              )
            );
            
            // Update unread count
            if (payload.old.read === false && payload.new.read === true) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            } else if (payload.old.read === true && payload.new.read === false) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time notification subscription status:', status);
      });

    return () => {
      console.log('Cleaning up notification subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, isValid]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refetch: fetchNotifications
  };
};
