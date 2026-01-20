
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useUnreadMessages } from './useUnreadMessages';
import { useAuthValidation } from './use-auth-validation';
import { supabase } from '@/integrations/supabase/client';

export const useAutoOpenChat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const { isValid, userId } = useAuthValidation();
  const [pendingMissingItems, setPendingMissingItems] = useState(0);
  const [checkedMissingItems, setCheckedMissingItems] = useState(false);

  // Check for pending missing item requests
  useEffect(() => {
    if (!isValid || !userId) return;

    const checkPendingMissingItems = async () => {
      try {
        const { count, error } = await supabase
          .from('missing_item_requests')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['pending', 'rejected']);

        if (error) throw error;
        setPendingMissingItems(count || 0);
      } catch (err) {
        console.error('Error checking pending missing items:', err);
      } finally {
        setCheckedMissingItems(true);
      }
    };

    checkPendingMissingItems();
  }, [isValid, userId]);

  useEffect(() => {
    if (!isValid || !checkedMissingItems) return;

    const openChat = searchParams.get('openChat');
    const hasAutoOpened = localStorage.getItem('chatAutoOpened');
    
    // Determine if we should auto-open something
    const hasUnreadMessages = unreadCount > 0;
    const hasPendingItems = pendingMissingItems > 0;
    
    // For pending missing items, redirect to missing-items page (not chat)
    // For unread messages only, redirect to chat
    const shouldAutoOpen = openChat === 'true' || 
      ((hasUnreadMessages || hasPendingItems) && !hasAutoOpened && window.location.pathname === '/');

    if (shouldAutoOpen) {
      console.log('Auto-opening due to unread messages, pending missing items, or URL parameter', {
        unreadCount,
        pendingMissingItems,
        openChat
      });
      
      // Navigate to appropriate page
      // Prioritize missing items page if there are pending requests
      if (hasPendingItems) {
        navigate('/missing-items');
      } else {
        navigate('/chat');
      }
      
      // Remove URL parameter if present
      if (openChat === 'true') {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('openChat');
        setSearchParams(newSearchParams, { replace: true });
      }
      
      // Set flag to prevent multiple auto-opens in the same session
      if (hasUnreadMessages || hasPendingItems) {
        const today = new Date().toDateString();
        localStorage.setItem('chatAutoOpened', today);
      }
    }
  }, [searchParams, setSearchParams, navigate, unreadCount, isValid, pendingMissingItems, checkedMissingItems]);

  // Clear auto-open flag on new day
  useEffect(() => {
    const storedDate = localStorage.getItem('chatAutoOpened');
    const today = new Date().toDateString();
    
    if (storedDate && storedDate !== today) {
      localStorage.removeItem('chatAutoOpened');
    }
  }, []);
};
