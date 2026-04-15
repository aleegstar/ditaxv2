import React, { useState } from 'react';
import { Bell, MessageSquare, X, Trash2, MoreHorizontal, CheckCheck } from 'lucide-react';
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

const NotificationIcon = ({ type, read }: { type: string; read: boolean }) => {
  if (type === 'chat_message') {
    return (
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors",
        read ? "bg-muted/60" : "bg-primary/10"
      )}>
        <MessageSquare className={cn("h-[18px] w-[18px]", read ? "text-muted-foreground" : "text-primary")} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className={cn(
      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors",
      read ? "bg-muted/60" : "bg-emerald-500/10"
    )}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={read ? "text-muted-foreground" : "text-emerald-600"}>
        <path
          d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
          stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        />
        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 15L11 17L15 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
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

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className={cn("relative shrink-0 focus:outline-none w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors bg-white border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)]", className)}>
          <Bell className="w-[18px] h-[18px] text-foreground/70" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full ring-2 ring-background flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[400px] bg-background border-l-0 p-0 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 h-16">
            <h3 className="text-[17px] font-semibold text-foreground tracking-tight">Benachrichtigungen</h3>
            <div className="flex items-center gap-0.5">
              {(unreadCount > 0 || notifications.length > 0) && (
                <div className="relative">
                  <button
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}
                  >
                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-background border border-border/60 rounded-2xl shadow-lg z-[9999] py-1.5 overflow-hidden">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => { markAllAsRead(); setMenuOpen(false); }}
                            className="flex items-center w-full px-3.5 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors gap-2.5"
                          >
                            <CheckCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
                            Alle gelesen
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={() => { deleteAllNotifications(); setMenuOpen(false); }}
                            className="flex items-center w-full px-3.5 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors gap-2.5"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            Alle löschen
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              <SheetClose asChild>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </SheetClose>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-border border-t-foreground/40 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Laden…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-6 w-6 text-muted-foreground/50" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-muted-foreground">Keine Benachrichtigungen</p>
              </div>
            ) : (
              <div className="px-3 pt-1 pb-3">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3.5 px-3.5 py-4 cursor-pointer transition-all group relative rounded-2xl",
                      "hover:bg-muted/40 active:scale-[0.99]",
                      !notification.read && "bg-primary/[0.03]"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <NotificationIcon type={notification.type} read={notification.read} />

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className={cn(
                          "text-[14px] leading-snug text-foreground",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <span className="text-[12px] text-muted-foreground/70 whitespace-nowrap flex-shrink-0 pt-0.5">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}

                    {/* Delete on hover */}
                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      className="absolute right-2 top-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-4 border-t border-border/40">
              <button
                onClick={() => navigate('/notifications')}
                className="w-full py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium rounded-xl hover:bg-muted/40"
              >
                Alle anzeigen
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
