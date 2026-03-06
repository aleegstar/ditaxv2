import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface ChatEmptyStateProps {
  userId: string;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ userId }) => {
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
        if (error) {
          console.error('Error fetching user name:', error);
          setUserName('');
        } else {
          const fullName = data.first_name && data.last_name
            ? `${data.first_name} ${data.last_name}`
            : data.first_name || '';
          setUserName(fullName);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('');
      } finally {
        setLoading(false);
      }
    };
    fetchUserName();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-muted rounded-full mb-4 mx-auto" />
          <div className="w-32 h-4 bg-muted rounded mb-2" />
          <div className="w-24 h-3 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center max-w-md mx-auto"
      >
        {/* Bot Avatar with glass ring */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center overflow-hidden relative"
          style={{
            background: 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.7))',
            boxShadow: '0 0 40px -8px hsla(var(--primary) / 0.35), 0 0 0 1px hsla(var(--primary) / 0.2)',
          }}
        >
          <img
            src="/bot-avatar.png"
            alt="AI Assistant"
            className="w-full h-full object-cover border-0 shadow-none"
          />
        </motion.div>

        {/* Greeting */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-2xl font-bold mb-3 text-foreground"
        >
          Hallo{userName ? `, ${userName}` : ''}!
        </motion.h2>

        {/* Help message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-lg mb-4 text-foreground"
        >
          Womit kann ich dir helfen?
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-sm text-muted-foreground leading-relaxed"
        >
          Ich bin dein digitaler Steuerassistent und kann dir bei allgemeinen
          Steuerfragen helfen. Stell mir eine Frage oder nutze den Button unten,
          um direkt mit einem Mitarbeiter zu sprechen.
        </motion.p>
      </motion.div>
    </div>
  );
};
