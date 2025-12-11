import React from 'react';
import { Bell, MessageSquare, FileText, Check, CheckCheck, X } from 'lucide-react';
import { CustomNotificationIcon } from './custom-notification-icon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationBadge } from './notification-badge';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
interface NotificationDropdownProps {
  className?: string;
}
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'chat_message':
      return <MessageSquare className="h-4 w-4" />;
    case 'tax_return_completed':
      return <FileText className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};
const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  if (diffInMinutes < 1) return 'Gerade eben';
  if (diffInMinutes < 60) return `vor ${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `vor ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `vor ${diffInDays}d`;
  return date.toLocaleDateString('de-DE');
};
export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  className
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'chat_message':
        navigate('/chat');
        break;
      case 'tax_return_completed':
        // Navigate to tax returns page or specific return
        const taxYear = notification.metadata?.tax_year;
        if (taxYear) {
          navigate(`/?year=${taxYear}`);
        } else {
          navigate('/');
        }
        break;
      default:
        break;
    }
  };
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };
  return <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("relative p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors", className)}>
          <NotificationBadge count={unreadCount} show={unreadCount > 0}>
            <CustomNotificationIcon className="h-5 w-5 text-primary-foreground" />
          </NotificationBadge>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:w-[400px] bg-[#020408] border-l border-white/[0.08]">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
            <h3 className="text-lg font-semibold text-white">Benachrichtigungen</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs text-[#1D64FF] hover:text-[#1D64FF] hover:bg-white/[0.05] h-auto py-1 px-2">
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Alle lesen
                </Button>}
              <SheetClose asChild>
                <Button variant="ghost" size="sm" className="p-1 h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/[0.05]">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? <div className="p-8 text-center text-zinc-500">
                Lade Benachrichtigungen...
              </div> : notifications.length === 0 ? <div className="p-8 text-center text-zinc-500">
                <CustomNotificationIcon className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
                <p className="text-sm">Keine Benachrichtigungen</p>
              </div> : <div className="py-2">
                {notifications.map(notification => <button key={notification.id} className={cn("flex items-start gap-3 p-4 cursor-pointer border-b border-white/[0.05] last:border-b-0 w-full text-left transition-colors hover:bg-white/[0.05]", !notification.read && "bg-[#1D64FF]/10")} onClick={() => handleNotificationClick(notification)}>
                    <div className={cn("flex-shrink-0 p-2 rounded-full mt-0.5", notification.type === 'chat_message' ? "bg-[#1D64FF]/20 text-[#1D64FF]" : "bg-emerald-500/20 text-emerald-500")}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-white text-sm leading-tight">
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-zinc-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.read && <div className="w-2 h-2 bg-[#1D64FF] rounded-full"></div>}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </button>)}
              </div>}
          </ScrollArea>

          {notifications.length > 0 && <div className="p-3 border-t border-white/[0.08]">
              <Button variant="ghost" size="sm" className="w-full justify-center text-sm text-zinc-400 hover:text-white hover:bg-white/[0.05]" onClick={() => navigate('/notifications')}>
                Alle Benachrichtigungen anzeigen
              </Button>
            </div>}
        </div>
      </SheetContent>
    </Sheet>;
};