
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { EnhancedModernUserChatWindow } from '@/components/chat/EnhancedModernUserChatWindow';
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
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col h-full">
        <EnhancedModernUserChatWindow />
      </div>
    </div>
  );
};

export default Chat;
