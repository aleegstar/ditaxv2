
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { EnhancedModernUserChatWindow } from '@/components/chat/EnhancedModernUserChatWindow';
import { useI18n } from '@/contexts/I18nContext';
import { motion } from 'framer-motion';

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
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      {/* Animated background blobs */}
      <motion.div
        className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsla(var(--primary) / 0.06) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fixed bottom-[-15%] left-[-10%] w-[450px] h-[450px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, hsla(var(--primary) / 0.04) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, -25, 15, 0],
          y: [0, 30, -25, 0],
          scale: [1, 0.95, 1.08, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="flex-1 flex flex-col h-full relative z-10">
        <EnhancedModernUserChatWindow />
      </div>
    </div>
  );
};

export default Chat;
