import React from 'react';
import {
  Calendar, FileUp, MessageSquare, FileText, Check, AlertCircle,
  Upload, Download, Eye, MessagesSquare, ListChecks, ArrowUpRight,
} from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────
   Tax calendar — static deadlines for the active tax cycle.
   ───────────────────────────────────────────────────────────────── */
type DeadlineStatus = 'done' | 'upcoming' | 'overdue';
interface Deadline {
  date: string;
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
    desc:  'Frist für das Steuerjahr 2025.',
    status: 'upcoming',
  },
  {
    date: '30. November 2026',
    title: 'Zahlung der Steuern',
    desc:  'Fälligkeit der Steuerrechnung 2025.',
    status: 'upcoming',
  },
];

const OPEN_TASKS = [
  { title: 'Lohnausweis 2025 hochladen', meta: 'Belege & Unterlagen', urgent: true },
  { title: 'Bankauszug ergänzen', meta: 'Vermögen', urgent: false },
  { title: 'Persönliche Daten bestätigen', meta: 'Kontakt', urgent: false },
];

const RECENT_UPLOADS = [
  { name: 'Lohnausweis_2024.pdf', size: '284 KB', when: 'Vor 2 Tagen' },
  { name: 'Mietvertrag.pdf',      size: '1.2 MB', when: 'Letzte Woche' },
  { name: 'Kontoauszug_Q4.pdf',   size: '512 KB', when: 'Letzte Woche' },
];

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div
    className={cn(
      'rounded-[18px] bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(15,27,61,0.025),0_8px_24px_-14px_rgba(15,27,61,0.05)]',
      className
    )}
  >
    {children}
  </div>
);

const SectionHeader: React.FC<{
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ icon, title, badge, action }) => (
  <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
    <div className="flex items-center gap-2 min-w-0">
      {icon}
      <h3 className="text-[12.5px] font-semibold text-foreground tracking-[-0.005em]">{title}</h3>
      {badge}
    </div>
    {action}
  </div>
);

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

const CountBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md bg-foreground/[0.06] text-foreground/65">
    {n}
  </span>
);

export const DesktopUtilityPanel: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, loading } = useNotifications();
  const recent = notifications.slice(0, 3);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <aside className="hidden lg:flex flex-col gap-3.5 w-[320px] xl:w-[340px] flex-shrink-0 pt-10 pr-6 xl:pr-8">
      {/* ── Offene Aufgaben ──────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={<ListChecks className="w-[14px] h-[14px] text-foreground/70" strokeWidth={1.75} />}
          title="Offene Aufgaben"
          badge={<CountBadge n={OPEN_TASKS.length} />}
        />
        <ul className="px-2 pb-2">
          {OPEN_TASKS.map((task) => (
            <li key={task.title}>
              <button
                onClick={() => navigate('/documents')}
                className="w-full flex items-start gap-3 px-2.5 py-2 rounded-[10px] hover:bg-foreground/[0.025] transition-colors text-left group"
              >
                <span className={cn(
                  'mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0',
                  task.urgent ? 'bg-amber-500' : 'bg-foreground/25'
                )} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-foreground tracking-[-0.005em] leading-tight truncate">
                    {task.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                    {task.meta}
                  </p>
                </div>
                <ArrowUpRight className="w-[13px] h-[13px] text-muted-foreground/40 group-hover:text-foreground transition-colors mt-0.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Steuerkalender ───────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={<Calendar className="w-[14px] h-[14px] text-foreground/70" strokeWidth={1.75} />}
          title="Steuerkalender"
        />
        <ul className="px-4 pb-3.5 space-y-2.5">
          {DEADLINES.map((d) => {
            const s = STATUS_COPY[d.status];
            return (
              <li key={d.title} className="rounded-[12px] bg-foreground/[0.018] ring-1 ring-black/[0.03] p-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70 tabular-nums">
                    {d.date}
                  </span>
                  <span className={cn('text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md', s.cls)}>
                    {s.label}
                  </span>
                </div>
                <p className="text-[12.5px] font-semibold text-foreground tracking-[-0.005em] leading-tight">
                  {d.title}
                </p>
                <p className="text-[11px] text-muted-foreground/80 leading-snug mt-0.5">
                  {d.desc}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ── Letzte Uploads ────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={<FileUp className="w-[14px] h-[14px] text-foreground/70" strokeWidth={1.75} />}
          title="Letzte Uploads"
          action={
            <button
              onClick={() => navigate('/documents')}
              className="text-[11px] font-medium text-muted-foreground/75 hover:text-foreground transition-colors"
            >
              Alle
            </button>
          }
        />
        <ul className="px-2 pb-2">
          {RECENT_UPLOADS.map((f) => (
            <li key={f.name}>
              <button
                onClick={() => navigate('/documents')}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] hover:bg-foreground/[0.025] transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-[8px] bg-foreground/[0.045] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-[12px] h-[12px] text-foreground/65" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-foreground tracking-[-0.005em] leading-tight truncate">
                    {f.name}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground/65 mt-0.5 tabular-nums">
                    {f.size} · {f.when}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── Aktivitäten ──────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={<MessagesSquare className="w-[14px] h-[14px] text-foreground/70" strokeWidth={1.75} />}
          title="Aktivitäten"
          badge={unread > 0 ? <CountBadge n={unread} /> : undefined}
          action={
            <button
              onClick={() => navigate('/chat')}
              className="text-[11px] font-medium text-muted-foreground/75 hover:text-foreground transition-colors"
            >
              Alle
            </button>
          }
        />
        <ul className="px-2 pb-2">
          {loading && (
            <li className="px-3 py-5 text-center text-[11.5px] text-muted-foreground/65">
              Wird geladen…
            </li>
          )}
          {!loading && recent.length === 0 && (
            <li className="px-3 py-5 text-center text-[11.5px] text-muted-foreground/65">
              Noch keine Aktivitäten
            </li>
          )}
          {!loading && recent.map((n) => {
            const { Icon, tint, fg } = variantFor(n);
            return (
              <li key={n.id}>
                <div className="flex items-start gap-2.5 px-2.5 py-2 rounded-[10px] transition-colors hover:bg-foreground/[0.025]">
                  <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0', tint)}>
                    <Icon className={cn('w-[12px] h-[12px]', fg)} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-foreground tracking-[-0.005em] leading-tight truncate">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 leading-tight mt-0.5 truncate">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 tabular-nums">
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
