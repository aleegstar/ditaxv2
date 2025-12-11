
import React from 'react';
import { NotificationBadge } from './notification-badge';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface ChatIconWithBadgeProps {
  className?: string;
  size?: number;
}

// Custom Chat Icon Component - envelope/mail icon
const CustomChatIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg 
    viewBox="0 0 48 48" 
    fill="#8A96A7" 
    className={className}
    width={size}
    height={size}
  >
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M6.10879 20.0815L18.5715 29.4285L27.9185 41.8912C29.2439 43.6585 31.7511 44.0167 33.5185 42.6912C34.2398 42.1501 34.7573 41.3812 34.9867 40.5091L43.0616 9.82461C43.6238 7.68821 42.3477 5.50055 40.2113 4.93834C39.544 4.76274 38.8426 4.76274 38.1754 4.93834L7.49082 13.0132C5.35442 13.5754 4.07828 15.7631 4.6405 17.8995C4.86998 18.7715 5.3874 19.5405 6.10879 20.0815ZM31.1185 39.4912L22.6408 28.1876L27.4142 23.4142C28.1953 22.6331 28.1953 21.3668 27.4142 20.5857C26.6332 19.8047 25.3669 19.8047 24.5858 20.5857L19.8124 25.3592L8.50879 16.8815L39.1933 8.80664L31.1185 39.4912Z" 
      fill="#8A96A7"
    />
  </svg>
);

export const ChatIconWithBadge: React.FC<ChatIconWithBadgeProps> = ({ 
  className,
  size 
}) => {
  const { unreadCount } = useUnreadMessages();

  return (
    <NotificationBadge count={unreadCount} show={unreadCount > 0}>
      <CustomChatIcon className={className} size={size} />
    </NotificationBadge>
  );
};
