
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChatIconWithBadge } from '@/components/ui/chat-icon-with-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatButtonWithNotificationProps {
  className?: string;
  iconSize?: number;
  isMobile?: boolean;
}

export const ChatButtonWithNotification: React.FC<ChatButtonWithNotificationProps> = ({
  className,
  iconSize = 20,
  isMobile = false
}) => {
  const location = useLocation();
  const isActive = location.pathname === '/chat';

  return (
    <Button 
      variant="ghost"
      size="sm"
      asChild
      className={cn(
        "relative p-2 hover:bg-muted/50 transition-colors",
        className
      )}
    >
      <Link to="/chat">
        <ChatIconWithBadge 
          className="h-5 w-5"
        />
      </Link>
    </Button>
  );
};
