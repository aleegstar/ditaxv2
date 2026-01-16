import React, { useState } from 'react';
import { Bell, MessageSquare, FileText, CheckCheck, X, Trash2, MoreVertical } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ProfileWithNotificationsProps {
  avatarUrl?: string | null;
  firstName?: string | null;
  className?: string;
}

const NotificationIcon = ({ type }: { type: string }) => {
  if (type === 'chat_message') {
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        <MessageSquare className="h-5 w-5 text-blue-500" />
      </div>
    );
  }
  
  // Tax return / document icon - custom styled like reference
  return (
    <div className="w-10 h-10 rounded-xl bg-emerald-50/80 flex items-center justify-center flex-shrink-0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
        <path 
          d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
        <path 
          d="M14 2V8H20" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M9 15L11 17L15 13" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
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

export const ProfileWithNotifications: React.FC<ProfileWithNotificationsProps> = ({
  avatarUrl,
  firstName,
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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'chat_message':
        navigate('/chat');
        break;
      case 'tax_return_completed':
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className={cn("relative shrink-0 focus:outline-none", className)}>
          <img
            src={avatarUrl || '/lovable-uploads/default-avatar.png'}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
          />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full ring-2 ring-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:w-[380px] bg-white border-l-0 p-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Benachrichtigungen</h3>
            <div className="flex items-center gap-1">
              {(unreadCount > 0 || notifications.length > 0) && (
                <div className="relative">
                  <button 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {menuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[9998]" 
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-lg z-[9999] py-2 overflow-hidden">
                        {unreadCount > 0 && (
                          <button 
                            onClick={() => { handleMarkAllAsRead(); setMenuOpen(false); }}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <CheckCheck className="h-4 w-4 mr-3 text-emerald-500" />
                            <span>Alle als gelesen</span>
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button 
                            onClick={() => { handleDeleteAll(); setMenuOpen(false); }}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            <span>Alle löschen</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              <SheetClose asChild>
                <button className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </SheetClose>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1 bg-slate-50/50">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Lade Benachrichtigungen...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Bell className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-slate-400">Keine Benachrichtigungen</p>
              </div>
            ) : (
              <div className="py-3 px-3 space-y-2">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-4 cursor-pointer transition-all group relative rounded-xl bg-white border",
                      !notification.read 
                        ? "border-emerald-100 shadow-sm" 
                        : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Icon */}
                    <NotificationIcon type={notification.type} />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm text-slate-800 leading-snug",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    {/* Delete button - shows on hover */}
                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      className="absolute right-2 top-2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Löschen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => navigate('/notifications')}
                className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium"
              >
                Alle Benachrichtigungen anzeigen
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
