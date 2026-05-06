import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Home, Folder, MessageSquare, LayoutGrid, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { X, Trash2, MoreHorizontal, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeBottomNavProps {
  onChatClick: () => void;
  onDocumentsClick: () => void;
  onActionClick?: () => void;
  onMenuClick?: () => void;
  activeTab?: 'home' | 'documents' | 'chat';
}

const roundButtonClass =
  'flex items-center justify-center w-9 h-9 p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 ring-1 ring-gray-200/60 rounded-full transition-all duration-300 active:scale-95';
const roundButtonShadow = {
  boxShadow:
    '0 4px 12px -2px rgba(17,24,39,0.08), 0 2px 6px -2px rgba(17,24,39,0.04)',
} as const;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
};

const NotificationIcon = ({ type, read }: { type: string; read: boolean }) => {
  if (type === 'chat_message') {
    return (
      <div className={cn(
        'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors',
        read ? 'bg-muted/60' : 'bg-primary/10'
      )}>
        <MessageSquare className={cn('h-[18px] w-[18px]', read ? 'text-muted-foreground' : 'text-primary')} strokeWidth={1.75} />
      </div>
    );
  }
  return (
    <div className={cn(
      'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors',
      read ? 'bg-muted/60' : 'bg-emerald-500/10'
    )}>
      <Bell className={cn('h-[18px] w-[18px]', read ? 'text-muted-foreground' : 'text-emerald-600')} strokeWidth={1.75} />
    </div>
  );
};

const NotificationsBellButton: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) await markAsRead(notification.id);
    switch (notification.type) {
      case 'chat_message':
        navigate('/chat');
        break;
      case 'tax_return_completed': {
        const taxYear = notification.metadata?.tax_year;
        navigate(taxYear ? `/?year=${taxYear}` : '/');
        break;
      }
      default:
        break;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Benachrichtigungen"
          className={cn(roundButtonClass, 'relative')}
          style={roundButtonShadow}
        >
          <Bell className="w-5 h-5" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full ring-2 ring-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[400px] bg-background border-l-0 p-0 shadow-2xl">
        <div className="flex flex-col h-full">
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
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3.5 px-3.5 py-4 cursor-pointer transition-all group relative rounded-2xl',
                      'hover:bg-muted/40 active:scale-[0.99]',
                      !notification.read && 'bg-primary/[0.03]'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <NotificationIcon type={notification.type} read={notification.read} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className={cn('text-[14px] leading-snug text-foreground', !notification.read && 'font-semibold')}>
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
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                      className="absolute right-2 top-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

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

type TabKey = 'home' | 'documents' | 'chat' | 'more';

export const HomeBottomNav: React.FC<HomeBottomNavProps> = ({
  onChatClick,
  onDocumentsClick,
  onActionClick,
  onMenuClick,
  activeTab = 'home',
}) => {
  const tabs: { key: TabKey; label: string; icon: React.ComponentType<any>; onClick: () => void }[] = [
    { key: 'home', label: 'Steuern', icon: Home, onClick: () => onActionClick?.() },
    { key: 'documents', label: 'Dokumente', icon: Folder, onClick: onDocumentsClick },
    { key: 'chat', label: 'Chat', icon: MessageSquare, onClick: onChatClick },
    { key: 'more', label: 'Mehr', icon: LayoutGrid, onClick: () => onMenuClick?.() },
  ];

  const active: TabKey = (activeTab as TabKey) ?? 'home';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[10010] px-3 pointer-events-none"
      style={{ paddingBottom: 'calc(10px + var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)))' }}
    >
      <div className="mx-auto w-full max-w-[440px] pointer-events-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative rounded-full w-full"
          style={{
            padding: '6px',
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 18px 36px -12px rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="relative flex items-center justify-between bg-white rounded-full w-full"
            style={{
              padding: '4px',
              gap: '3px',
              boxShadow:
                'inset 0 2px 6px rgba(255,255,255,1), inset 0 0 2px rgba(0,0,0,0.05), 0 6px 20px rgba(0,0,0,0.05)',
            }}
          >
            <LayoutGroup id="bottom-nav">
              {tabs.map((tab) => {
                const isActive = active === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={tab.onClick}
                    aria-label={tab.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative flex flex-col items-center justify-center rounded-full focus:outline-none transition-colors flex-1'
                    )}
                    style={{
                      height: '56px',
                    }}
                  >
                    <span
                      className={cn(
                        'relative z-10 flex flex-col items-center justify-center gap-1',
                        isActive ? 'text-[#1656FF]' : 'text-[#7A8498]'
                      )}
                    >
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 500,
                          lineHeight: 1,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {tab.label}
                      </span>
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-indicator"
                        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                        className="absolute bottom-1.5 h-[2px] w-4 rounded-full"
                        style={{ background: '#1656FF' }}
                      />
                    )}
                  </button>
                );
              })}
            </LayoutGroup>
          </div>
        </motion.div>
      </div>
    </nav>
  );
};
