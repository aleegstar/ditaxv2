import React from 'react';
import { Bell, MessageSquare, FileText, Check, CheckCheck, X, Trash2 } from 'lucide-react';
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
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
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

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const handleDeleteAll = async () => {
    await deleteAllNotifications();
  };

  return <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("relative p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors", className)}>
          <NotificationBadge count={unreadCount} show={unreadCount > 0}>
            <CustomNotificationIcon className="h-5 w-5 text-primary-foreground" />
          </NotificationBadge>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:w-[400px] bg-white border-l border-gray-200">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Benachrichtigungen</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs text-[#1D64FF] hover:text-[#1D64FF] hover:bg-gray-100 h-auto py-1 px-2">
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Alle lesen
                </Button>}
              {notifications.length > 0 && <Button variant="ghost" size="sm" onClick={handleDeleteAll} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 h-auto py-1 px-2">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Alle löschen
                </Button>}
              <SheetClose asChild>
                <Button variant="ghost" size="sm" className="p-1 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? <div className="p-8 text-center text-gray-400">
                Lade Benachrichtigungen...
              </div> : notifications.length === 0 ? <div className="p-8 text-center text-gray-400">
                <CustomNotificationIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Keine Benachrichtigungen</p>
              </div> : <div className="py-2">
                {notifications.map(notification => <div key={notification.id} className={cn("flex items-start gap-3 p-4 cursor-pointer border-b border-gray-100 last:border-b-0 w-full text-left transition-colors hover:bg-gray-50 group relative", !notification.read && "bg-blue-50")} onClick={() => handleNotificationClick(notification)}>
                    <div className={cn("flex-shrink-0 p-2 rounded-full mt-0.5", notification.type === 'chat_message' ? "bg-[#1D64FF]/10 text-[#1D64FF]" : "bg-emerald-500/10 text-emerald-500")}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm leading-tight">
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.read && <div className="w-2 h-2 bg-[#1D64FF] rounded-full"></div>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>)}
              </div>}
          </ScrollArea>

          {notifications.length > 0 && <div className="p-3 border-t border-gray-100">
              <Button variant="ghost" size="sm" className="w-full justify-center text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100" onClick={() => navigate('/notifications')}>
                Alle Benachrichtigungen anzeigen
              </Button>
            </div>}
        </div>
      </SheetContent>
    </Sheet>;
};