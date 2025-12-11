
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
          <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 mx-auto"></div>
          <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
          <div className="w-24 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center max-w-md mx-auto"
      >
        {/* Bot Avatar */}
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: '#1d64ff' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 1574 1574" fill="none" className="filter brightness-0 invert">
            <path d="M1109.4 1129.79V1566.01C1109.4 1567.33 1108.87 1568.61 1107.94 1569.55C1107 1570.48 1105.73 1571.01 1104.41 1571.01C969.271 1570.91 808.538 1579.75 690.266 1563.36C251.966 1502.51 -73.1411 1092.5 14.2697 635.384C60.9463 390.731 227.046 185.627 445.669 79.3453C905.821 -144.208 1467.38 123.114 1557.86 649.319C1581.53 786.807 1571.85 958.84 1568.4 1109.09C1568.21 1118.05 1563.7 1122.56 1554.88 1122.63L1113.81 1125.18C1110.87 1125.25 1109.4 1126.78 1109.4 1129.79ZM1086.49 663.941C986.523 381.408 570.555 395.736 491.195 687.788C446.436 852.755 526.754 1051.09 693.045 1106.24C724.291 1116.58 777.517 1121.84 852.723 1122.04C935.661 1122.24 1018.6 1122.2 1101.54 1121.94C1104.8 1121.94 1106.43 1120.27 1106.43 1116.94C1107.96 1014.74 1107.58 912.781 1105.28 811.047C1103.81 744.184 1097.54 695.148 1086.49 663.941Z" fill="white"/>
          </svg>
        </motion.div>

        {/* Greeting */}
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-2xl font-bold text-gray-800 mb-2"
        >
          Hallo{userName ? `, ${userName}` : ''}!
        </motion.h2>

        {/* Help message */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-lg text-gray-600 mb-4"
        >
          Womit kann ich dir helfen?
        </motion.p>

        {/* Description */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-sm text-gray-500 leading-relaxed"
        >
          Ich bin dein digitaler Steuerassistent und kann dir bei allgemeinen Steuerfragen helfen. 
          Stell mir eine Frage oder nutze den Button unten, um direkt mit einem Mitarbeiter zu sprechen.
        </motion.p>
      </motion.div>
    </div>
  );
};
