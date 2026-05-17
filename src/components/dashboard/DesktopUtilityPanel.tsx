import React from 'react';
import { Calendar, FileUp, MessageSquare, FileText, Check, AlertCircle } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────
   Tax calendar — static deadlines for the active tax cycle.
   Kept intentionally minimal & enterprise-styled (Linear / Stripe).
   ───────────────────────────────────────────────────────────────── */
type DeadlineStatus = 'done' | 'upcoming' | 'overdue';
interface Deadline {
  date: string;     // "31. März 2026"
  title: string;
  desc: string;
  status: DeadlineStatus;
}

const STATUS_COPY: Record<DeadlineStatus, { label: string; cls: string }> = {
  done:     { label: 'Abgeschlossen', cls: 'bg-emerald-500/10 text-emerald-700' },
  upcoming: { label: 'Bevorstehend',  cls: 'bg-foreground/[0.05] text-foreground/65' },
  overdue:  { label: 'Überfällig',    cls: 'bg-amber-500/12 text-amber-700' },
};

const DEADLINES: Deadline[] = [
  {
    date: '31. März 2026',
    title: 'Steuererklärung einreichen',
    desc:  'Frist zur Einreichung der Steuererklärung für das Steuerjahr 2025.',
    status: 'upcoming',
  },
  {
    date: '30. November 2026',
    title: 'Zahlung der Steuern',
    desc:  'Fälligkeit der Steuerrechnung für das Steuerjahr 2025.',
    status: 'upcoming',
  },
];

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div
    className={cn(
      'rounded-[20px] bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(15,27,61,0.03),0_8px_24px_-12px_rgba(15,27,61,0.06)]',
      className
    )}
  >
    {children}
  </div>
);

const SectionHeader: React.FC<{ icon?: React.ReactNode; title: string; action?: React.ReactNode }> = ({
  icon, title, action,
}) => (
  <div className="flex items-center justify-between px-5 pt-4 pb-3">
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-[13.5px] font-semibold text-foreground tracking-[-0.01em]">{title}</h3>
    </div>
    {action}
  </div>
);

/* ─────────────────────────────────────────────────────────────────
   Activity feed — derived from notifications.
   ───────────────────────────────────────────────────────────────── */
const variantFor = (n: Notification) => {
  const kind = (n.metadata?.kind || n.metadata?.subtype || '') as string;
  if (n.type === 'chat_message') {
    return { Icon: MessageSquare, tint: 'bg-primary/[0.08]', fg: 'text-primary' };
  }
  if (n.type === 'tax_return_completed') {
    return { Icon: Check, tint: 'bg-emerald-500/10', fg: 'text-emerald-600' };
  }
  if (/missing|document/i.test(kind)) {
    return { Icon: AlertCircle, tint: 'bg-amber-500/12', fg: 'text-amber-600' };
  }
  if (/upload/i.test(kind)) {
    return { Icon: FileUp, tint: 'bg-foreground/[0.05]', fg: 'text-foreground/75' };
  }
  return { Icon: FileText, tint: 'bg-foreground/[0.05]', fg: 'text-foreground/75' };
};

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  if (diffDays <= 0) return `Heute, ${time}`;
  if (diffDays === 1) return `Gestern, ${time}`;
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: 'short' }) + `, ${time}`;
};

export const DesktopUtilityPanel: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, loading } = useNotifications();
  const recent = notifications.slice(0, 4);

  return (
    <aside className="hidden lg:flex flex-col gap-5 w-[300px] xl:w-[320px] flex-shrink-0 pt-10 pr-6 xl:pr-8">
      {/* ── Steuerkalender ───────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={<Calendar className="w-[15px] h-[15px] text-foreground/70" strokeWidth={1.75} />}
          title="Steuerkalender"
        />
        <ul className="px-5 pb-4 space-y-3">
          {DEADLINES.map((d) => {
            const s = STATUS_COPY[d.status];
            return (
              <li key={d.title} className="rounded-[14px] bg-foreground/[0.02] ring-1 ring-black/[0.035] p-3.5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70 tabular-nums">
                    {d.date}
                  </span>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md', s.cls)}>
                    {s.label}
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-foreground tracking-[-0.01em] leading-tight">
                  {d.title}
                </p>
                <p className="text-[11.5px] text-muted-foreground/85 leading-snug mt-1">
                  {d.desc}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ── Aktivitäten ──────────────────────────────────── */}
      <Card>
        <SectionHeader
          title="Aktivitäten"
          action={
            <button
              onClick={() => navigate('/chat')}
              className="text-[11.5px] font-medium text-muted-foreground/75 hover:text-foreground transition-colors"
            >
              Alle anzeigen
            </button>
          }
        />
        <ul className="px-2 pb-2">
          {loading && (
            <li className="px-3 py-6 text-center text-[12px] text-muted-foreground/65">
              Wird geladen…
            </li>
          )}
          {!loading && recent.length === 0 && (
            <li className="px-3 py-6 text-center text-[12px] text-muted-foreground/65">
              Noch keine Aktivitäten
            </li>
          )}
          {!loading && recent.map((n) => {
            const { Icon, tint, fg } = variantFor(n);
            return (
              <li key={n.id}>
                <div
                  className={cn(
                    'flex items-start gap-3 px-3 py-2.5 rounded-[12px] transition-colors',
                    'hover:bg-foreground/[0.02]'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0', tint)}>
                    <Icon className={cn('w-[14px] h-[14px]', fg)} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-foreground tracking-[-0.008em] leading-tight truncate">
                      {n.title}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground/80 leading-tight mt-0.5 truncate">
                      {n.message}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground/60 mt-1 tabular-nums">
                      {formatRelative(n.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </aside>
  );
};

export default DesktopUtilityPanel;
