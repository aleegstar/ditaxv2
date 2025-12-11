
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { EnhancedModernUserChatWindow } from '@/components/chat/EnhancedModernUserChatWindow';
import { WelcomeHeader } from '@/components/ui/welcome-header';
import { useI18n } from '@/contexts/I18nContext';

const Chat: React.FC = () => {
  const {
    userId,
    isValid
  } = useAuthValidation();
  const { t } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isValid || !userId) {
      setLoading(false);
      return;
    }
    checkAdminStatus();
  }, [userId, isValid]);

  const checkAdminStatus = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      console.log('Checking admin status for user:', userId);
      const {
        data,
        error
      } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').single();
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        const adminStatus = !!data;
        console.log('Admin status:', adminStatus);
        setIsAdmin(adminStatus);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-white">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full overflow-y-auto">
      <div className="flex-1 flex flex-col">
        {/* Welcome Header */}
        <WelcomeHeader
          customTitle="Nachrichten"
          customDescription="Starte den Chat mit unserem Chatbot oder lass dich direkt mit einem unserer Mitarbeitenden verbinden."
        />
        
        <div className="flex flex-col h-full pb-20 md:pb-0">
          <div className="flex-1 relative">
            <EnhancedModernUserChatWindow />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
