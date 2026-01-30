import React from 'react';
import { motion } from 'framer-motion';
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { ChatButtonWithNotification } from "@/components/chat/ChatButtonWithNotification";
import { useProfile } from '@/hooks/useProfile';
interface WelcomeHeaderProps {
  className?: string;
  customTitle?: string;
  customDescription?: string;
}
export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  className,
  customTitle,
  customDescription
}) => {
  const {
    profile,
    loading
  } = useProfile();
  const getUserFirstName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    return 'Benutzer';
  };

  // Get current time for greeting
  const getGreeting = () => {
    return 'Grüezi';
  };
  return <div className={`flex justify-center ${className || ''}`}>
      {/* Single Pill with Profile, Greeting and Actions */}
      <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }} className="flex items-center gap-2 p-1.5 rounded-full" style={{
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: '0 8px 32px -8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
      border: '1px solid rgba(255,255,255,0.5)'
    }}>
        {/* Profile Picture */}
        <img 
          src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} 
          alt="Profile" 
          className="w-9 h-9 rounded-full object-cover ring-2 ring-white/50"
          onError={(e) => {
            e.currentTarget.src = '/lovable-uploads/default-avatar.png';
          }}
        />

        {/* Greeting Text */}
        <div className="flex items-center gap-1.5 pr-2">
          <span className="text-sm font-medium text-slate-500">Grüezi</span>
          <span className="text-sm font-semibold text-slate-900">{getUserFirstName()}</span>
          
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200/60" />

        {/* Notifications */}
        <motion.button whileHover={{
        scale: 1.05
      }} whileTap={{
        scale: 0.95
      }} className="flex hover:bg-white/80 transition-all duration-200 w-9 h-9 rounded-full items-center justify-center">
          <NotificationDropdown className="text-slate-600" />
        </motion.button>

        {/* Chat */}
        <motion.button data-tour="chat-header-icon" whileHover={{
        scale: 1.05
      }} whileTap={{
        scale: 0.95
      }} className="flex hover:bg-white/80 transition-all duration-200 w-9 h-9 rounded-full items-center justify-center">
          <ChatButtonWithNotification className="text-slate-600" />
        </motion.button>
      </motion.div>
    </div>;
};