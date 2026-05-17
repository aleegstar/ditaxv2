import React from 'react';
import {
  Calendar, MessageCircle, FileText, Check, AlertCircle, Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { ProfileWithNotifications } from '@/components/ui/profile-with-notifications';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

type DeadlineStatus = 'done' | 'upcoming' | 'overdue';
interface Deadline { date: string; title: string; desc: string; status: DeadlineStatus; }

const DEADLINES: Deadline[] = [
  { date: '31. März 2026',    title: 'Steuererklärung einreichen', desc: 'Frist zur Einreichung der Steuererklärung für das Steuerjahr 2025.', status: 'done' },
  { date: '30. November 2026', title: 'Zahlung der Steuern',        desc: 'Fälligkeit der Steuerrechnung für das Steuerjahr 2025.',           status: 'upcoming' },
];

const variantFor = (n: Notification) => {
  const kind = (n.metadata?.kind || n.metadata?.subtype || '') as string;
  if (n.type === 'chat_message') {
    return { Icon: MessageCircle, tint: 'bg-blue-50 border-blue-100', fg: 'text-blue-600' };
  }
  if (n.type === 'tax_return_completed') {
    return { Icon: Check, tint: 'bg-green-50 border-green-100', fg: 'text-green-600' };
  }
  if (/missing|document/i.test(kind)) {
    return { Icon: AlertCircle, tint: 'bg-orange-50 border-orange-100', fg: 'text-orange-600' };
  }
  if (/upload/i.test(kind)) {
    return { Icon: Upload, tint: 'bg-green-50 border-green-100', fg: 'text-green-600' };
  }
  return { Icon: FileText, tint: 'bg-slate-50 border-slate-200', fg: 'text-slate-600' };
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
  const { profile } = useProfile();
  const { notifications, loading } = useNotifications();
  const recent = notifications.slice(0, 4);

  return (
    <aside className="hidden xl:flex flex-col w-[360px] flex-shrink-0 bg-[#FAFAF7] border-l border-slate-200 min-h-screen">
      {/* Top utility row */}
      <div className="p-6 flex items-center justify-end gap-3">
        <ProfileWithNotifications avatarUrl={profile?.avatar_url} firstName={profile?.first_name} />
        <TaxFilerSelector />
      </div>

      <div className="px-6 pb-8 space-y-5">
        {/* ── Steuerkalender ────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Calendar className="w-[18px] h-[18px] text-slate-900" strokeWidth={1.75} />
            <h2 className="text-[15px] font-medium text-slate-900 tracking-[-0.005em]">
              Steuerkalender
            </h2>
          </div>

          <div className="space-y-3">
            {DEADLINES.map((d) => {
              const isDone = d.status === 'done';
              return (
                <div
                  key={d.title}
                  className={cn(
                    'p-4 rounded-xl border transition-colors',
                    isDone
                      ? 'border-slate-100 bg-white shadow-sm ring-1 ring-slate-900/[0.04] hover:border-slate-200'
                      : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={cn('text-[13px] font-medium tabular-nums', isDone ? 'text-slate-900' : 'text-slate-600')}>
                      {d.date}
                    </span>
                    {isDone ? (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-medium rounded-md border border-green-100">
                        Abgeschlossen
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-md border border-slate-200">
                        Bevorstehend
                      </span>
                    )}
                  </div>
                  <h4 className="text-[14px] font-medium text-slate-900 mb-1 tracking-[-0.005em]">
                    {d.title}
                  </h4>
                  <p className="text-[12.5px] text-slate-500 leading-relaxed">
                    {d.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Aktivitäten ───────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-medium text-slate-900 tracking-[-0.005em]">
              Aktivitäten
            </h2>
            <button
              onClick={() => navigate('/chat')}
              className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Alle anzeigen
            </button>
          </div>

          {loading && (
            <div className="py-6 text-center text-[12.5px] text-slate-400">Wird geladen…</div>
          )}
          {!loading && recent.length === 0 && (
            <div className="py-6 text-center text-[12.5px] text-slate-400">Noch keine Aktivitäten</div>
          )}

          <div className="space-y-5">
            {recent.map((n) => {
              const { Icon, tint, fg } = variantFor(n);
              return (
                <div key={n.id} className="flex gap-3.5">
                  <div className={cn('w-10 h-10 rounded-full border flex items-center justify-center shrink-0 mt-0.5', tint)}>
                    <Icon className={cn('w-[15px] h-[15px]', fg)} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-slate-900 tracking-[-0.005em] truncate">
                      {n.title}
                    </div>
                    <div className="text-[13px] text-slate-500 mt-0.5 truncate">
                      {n.message}
                    </div>
                    <div className="text-[12px] text-slate-400 mt-1 tabular-nums">
                      {formatRelative(n.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DesktopUtilityPanel;
