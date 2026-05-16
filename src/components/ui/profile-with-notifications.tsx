import React, { useMemo, useState } from 'react';
import {
  Bell,
  MessageSquare,
  X,
  Trash2,
  MoreHorizontal,
  CheckCheck,
  FileText,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  UploadCloud,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
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

// ─────────────────────────────────────────────────────────────
// Semantic variant resolution
// ─────────────────────────────────────────────────────────────
type Variant = {
  Icon: React.ComponentType<any>;
  tint: string; // bg tint
  fg: string; // icon color
};

const resolveVariant = (n: Notification): Variant => {
  const kind = (n.metadata?.kind || n.metadata?.subtype || '') as string;

  if (n.type === 'chat_message') {
    if (/support/i.test(kind)) {
      return { Icon: LifeBuoy, tint: 'bg-violet-500/10', fg: 'text-violet-600' };
    }
    return { Icon: MessageSquare, tint: 'bg-primary/10', fg: 'text-primary' };
  }

  if (n.type === 'tax_return_completed') {
    return { Icon: CheckCircle2, tint: 'bg-emerald-500/12', fg: 'text-emerald-600' };
  }

  if (/missing|document/i.test(kind)) {
    return { Icon: AlertCircle, tint: 'bg-amber-500/12', fg: 'text-amber-600' };
  }
  if (/upload/i.test(kind)) {
    return { Icon: UploadCloud, tint: 'bg-sky-500/10', fg: 'text-sky-600' };
  }
  if (/payment/i.test(kind)) {
    return { Icon: CreditCard, tint: 'bg-emerald-500/10', fg: 'text-emerald-600' };
  }
  if (/review|check/i.test(kind)) {
    return { Icon: Sparkles, tint: 'bg-primary/10', fg: 'text-primary' };
  }

  return { Icon: FileText, tint: 'bg-foreground/[0.06]', fg: 'text-foreground/70' };
};

// ─────────────────────────────────────────────────────────────
// Time helpers
// ─────────────────────────────────────────────────────────────
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const relativeLabel = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && d.getDate() === now.getDate()) return `vor ${hours} Std.`;
  const days = Math.floor(diffMs / 86400000);
  if (days < 7) return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
  return d.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
};

type GroupKey = 'today' | 'week' | 'earlier';
const GROUP_LABEL: Record<GroupKey, string> = {
  today: 'Heute',
  week: 'Diese Woche',
  earlier: 'Früher',
};

const bucketFor = (iso: string): GroupKey => {
  const ts = new Date(iso).getTime();
  const now = new Date();
  const today = startOfDay(now);
  const weekAgo = today - 6 * 86400000;
  if (ts >= today) return 'today';
  if (ts >= weekAgo) return 'week';
  return 'earlier';
};

// Group consecutive chat_message notifications within the same bucket into one summary item
type DisplayItem =
  | { kind: 'single'; notification: Notification }
  | { kind: 'group'; notifications: Notification[] };

const buildDisplayItems = (notifications: Notification[]): DisplayItem[] => {
  const result: DisplayItem[] = [];
  let buffer: Notification[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    if (buffer.length >= 2) {
      result.push({ kind: 'group', notifications: buffer });
    } else {
      result.push({ kind: 'single', notification: buffer[0] });
    }
    buffer = [];
  };

  for (const n of notifications) {
    if (n.type === 'chat_message') {
      buffer.push(n);
    } else {
      flush();
      result.push({ kind: 'single', notification: n });
    }
  }
  flush();
  return result;
};

// ─────────────────────────────────────────────────────────────
// Notification row
// ─────────────────────────────────────────────────────────────
const NotificationRow: React.FC<{
  notification: Notification;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}> = ({ notification, onClick, onDelete }) => {
  const { Icon, tint, fg } = resolveVariant(notification);
  const unread = !notification.read;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full text-left flex items-start gap-3 px-3 py-3 rounded-2xl transition-all',
        'active:scale-[0.995]',
        unread
          ? 'bg-foreground/[0.025] hover:bg-foreground/[0.045]'
          : 'hover:bg-foreground/[0.03]'
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', tint)}>
        <Icon className={cn('w-[16px] h-[16px]', fg)} strokeWidth={1.85} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-[13.5px] leading-snug text-foreground tracking-[-0.005em] truncate',
              unread ? 'font-semibold' : 'font-medium text-foreground/85'
            )}
          >
            {notification.title}
          </p>
          {unread && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
        </div>
        {notification.message && (
          <p
            className={cn(
              'text-[12.5px] mt-0.5 line-clamp-2 leading-relaxed',
              unread ? 'text-foreground/65' : 'text-muted-foreground/75'
            )}
          >
            {notification.message}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/55 mt-1 tabular-nums">
          {relativeLabel(notification.created_at)}
        </p>
      </div>

      <button
        onClick={onDelete}
        aria-label="Entfernen"
        className="absolute right-2 top-2 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </button>
  );
};

// Grouped (collapsed) row — e.g. "3 neue Nachrichten"
const GroupedRow: React.FC<{
  notifications: Notification[];
  onClick: (n: Notification) => void;
}> = ({ notifications, onClick }) => {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const latest = notifications[0];
  const { Icon, tint, fg } = resolveVariant(latest);
  const unread = unreadCount > 0;
  const count = notifications.length;

  return (
    <button
      onClick={() => onClick(latest)}
      className={cn(
        'group relative w-full text-left flex items-start gap-3 px-3 py-3 rounded-2xl transition-all active:scale-[0.995]',
        unread ? 'bg-foreground/[0.025] hover:bg-foreground/[0.045]' : 'hover:bg-foreground/[0.03]'
      )}
    >
      <div className={cn('relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', tint)}>
        <Icon className={cn('w-[16px] h-[16px]', fg)} strokeWidth={1.85} />
        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-foreground text-background text-[9.5px] font-bold flex items-center justify-center tabular-nums ring-2 ring-background">
          {count > 9 ? '9+' : count}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-[13.5px] leading-snug text-foreground tracking-[-0.005em] truncate',
              unread ? 'font-semibold' : 'font-medium text-foreground/85'
            )}
          >
            {count} neue Nachrichten
          </p>
          {unread && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
        </div>
        <p className="text-[12.5px] text-foreground/65 mt-0.5 line-clamp-1 leading-relaxed">
          {latest.title}
        </p>
        <p className="text-[11px] text-muted-foreground/55 mt-1 tabular-nums">
          {relativeLabel(latest.created_at)}
        </p>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export const ProfileWithNotifications: React.FC<ProfileWithNotificationsProps> = ({
  className,
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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

  const filtered = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, filter]
  );

  // Group by date bucket → then collapse consecutive chat_message into summaries
  const grouped = useMemo(() => {
    const buckets: Record<GroupKey, Notification[]> = { today: [], week: [], earlier: [] };
    for (const n of filtered) buckets[bucketFor(n.created_at)].push(n);
    return (['today', 'week', 'earlier'] as GroupKey[])
      .map((k) => ({ key: k, label: GROUP_LABEL[k], items: buildDisplayItems(buckets[k]) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Benachrichtigungen"
          className={cn(
            'relative shrink-0 focus:outline-none w-9 h-9 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-foreground/[0.04] transition-colors',
            className
          )}
        >
          <Bell className="w-[17px] h-[17px]" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-[420px] bg-background border-l-0 p-0 shadow-2xl"
      >
        <div className="flex flex-col h-full">
          {/* ── Header ───────────────────────────────────────── */}
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="text-[19px] font-semibold text-foreground tracking-[-0.02em] leading-tight">
                  Posteingang
                </h3>
                <p className="text-[12.5px] text-muted-foreground/80 mt-0.5">
                  {unreadCount > 0
                    ? `${unreadCount} ungelesen${unreadCount === 1 ? '' : 'e'}`
                    : 'Alles auf dem neuesten Stand'}
                </p>
              </div>
              <div className="flex items-center gap-0.5 -mr-1.5">
                {(unreadCount > 0 || notifications.length > 0) && (
                  <div className="relative">
                    <button
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
                      onClick={() => setMenuOpen(!menuOpen)}
                      aria-label="Mehr Optionen"
                    >
                      <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-background border border-border/60 rounded-2xl shadow-lg z-[9999] py-1.5 overflow-hidden">
                          {unreadCount > 0 && (
                            <button
                              onClick={() => {
                                markAllAsRead();
                                setMenuOpen(false);
                              }}
                              className="flex items-center w-full px-3.5 py-2.5 text-[13px] text-foreground hover:bg-foreground/[0.04] transition-colors gap-2.5"
                            >
                              <CheckCheck className="h-4 w-4 text-primary" strokeWidth={1.75} />
                              Alle als gelesen markieren
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={() => {
                                deleteAllNotifications();
                                setMenuOpen(false);
                              }}
                              className="flex items-center w-full px-3.5 py-2.5 text-[13px] text-destructive hover:bg-destructive/5 transition-colors gap-2.5"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                              Alle entfernen
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <SheetClose asChild>
                  <button
                    aria-label="Schliessen"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </SheetClose>
              </div>
            </div>

            {/* Segmented filter */}
            <div className="inline-flex items-center gap-0.5 p-[3px] rounded-full bg-foreground/[0.045]">
              {(
                [
                  { key: 'all', label: 'Alle' },
                  { key: 'unread', label: 'Ungelesen' },
                ] as const
              ).map((opt) => {
                const active = filter === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFilter(opt.key)}
                    className={cn(
                      'px-3 h-7 rounded-full text-[12px] transition-all',
                      active
                        ? 'bg-white text-foreground font-semibold shadow-[0_1px_2px_rgba(15,27,61,0.06),0_4px_10px_-3px_rgba(15,27,61,0.1)]'
                        : 'text-muted-foreground/70 font-medium hover:text-foreground/85'
                    )}
                  >
                    {opt.label}
                    {opt.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1.5 tabular-nums">{unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── List ─────────────────────────────────────────── */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-14 text-center">
                <div className="w-7 h-7 border-2 border-border border-t-foreground/40 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[13px] text-muted-foreground">Lade…</p>
              </div>
            ) : grouped.length === 0 ? (
              <div className="px-8 py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-foreground/[0.04] flex items-center justify-center mx-auto mb-4">
                  <CheckCheck className="h-6 w-6 text-muted-foreground/55" strokeWidth={1.75} />
                </div>
                <p className="text-[14px] font-semibold text-foreground tracking-[-0.005em]">
                  {filter === 'unread' ? 'Alles gelesen' : 'Dein Posteingang ist leer'}
                </p>
                <p className="text-[12.5px] text-muted-foreground/75 mt-1 leading-relaxed max-w-[260px] mx-auto">
                  {filter === 'unread'
                    ? 'Du hast keine ungelesenen Benachrichtigungen.'
                    : 'Sobald etwas passiert, erfährst du es hier zuerst.'}
                </p>
              </div>
            ) : (
              <div className="px-3 pb-32 pt-1">
                {grouped.map((group) => (
                  <div key={group.key} className="mb-2">
                    <div className="px-3 pt-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/55">
                      {group.label}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((item, idx) =>
                        item.kind === 'group' ? (
                          <GroupedRow
                            key={`grp-${group.key}-${idx}`}
                            notifications={item.notifications}
                            onClick={handleNotificationClick}
                          />
                        ) : (
                          <NotificationRow
                            key={item.notification.id}
                            notification={item.notification}
                            onClick={() => handleNotificationClick(item.notification)}
                            onDelete={(e) => {
                              e.stopPropagation();
                              deleteNotification(item.notification.id);
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* ── Sticky footer with gradient fade ────────────── */}
          {notifications.length > 0 && (
            <div
              className="relative -mt-20 pt-20 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, hsl(var(--background)) 55%, hsl(var(--background) / 0.85) 80%, transparent 100%)',
              }}
            >
              <div
                className="pointer-events-auto px-5 pt-2"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
              >
                <button
                  onClick={() => navigate('/notifications')}
                  className="w-full h-11 rounded-2xl bg-foreground/[0.045] hover:bg-foreground/[0.07] text-[13px] font-semibold text-foreground/85 tracking-[-0.005em] transition-colors"
                >
                  Alle anzeigen
                </button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
