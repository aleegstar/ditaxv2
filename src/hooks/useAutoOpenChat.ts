
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useUnreadMessages } from './useUnreadMessages';
import { useAuthValidation } from './use-auth-validation';

export const useAutoOpenChat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const { isValid } = useAuthValidation();

  useEffect(() => {
    if (!isValid) return;

    const openChat = searchParams.get('openChat');
    const hasAutoOpened = localStorage.getItem('chatAutoOpened');
    
    // Auto-open chat if URL parameter is present OR if user has unread messages and hasn't auto-opened today
    const shouldAutoOpen = openChat === 'true' || 
      (unreadCount > 0 && !hasAutoOpened && window.location.pathname === '/');

    if (shouldAutoOpen) {
      console.log('Auto-opening chat due to unread messages or URL parameter');
      
      // Navigate to chat
      navigate('/chat');
      
      // Remove URL parameter if present
      if (openChat === 'true') {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('openChat');
        setSearchParams(newSearchParams, { replace: true });
      }
      
      // Set flag to prevent multiple auto-opens in the same session
      if (unreadCount > 0) {
        const today = new Date().toDateString();
        localStorage.setItem('chatAutoOpened', today);
      }
    }
  }, [searchParams, setSearchParams, navigate, unreadCount, isValid]);

  // Clear auto-open flag on new day
  useEffect(() => {
    const storedDate = localStorage.getItem('chatAutoOpened');
    const today = new Date().toDateString();
    
    if (storedDate && storedDate !== today) {
      localStorage.removeItem('chatAutoOpened');
    }
  }, []);
};
