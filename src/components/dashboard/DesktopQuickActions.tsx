import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, MessageSquarePlus, Download, FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  {
    Icon: Upload,
    label: 'Dokument hochladen',
    sub: 'Belege & Unterlagen',
    to: '/documents',
  },
  {
    Icon: MessageSquarePlus,
    label: 'Nachricht schreiben',
    sub: 'Support kontaktieren',
    to: '/chat',
  },
  {
    Icon: Download,
    label: 'Bescheinigung laden',
    sub: 'Steuerbescheinigung',
    to: '/documents',
  },
  {
    Icon: FileSearch,
    label: 'Letzte Erklärung',
    sub: 'Vorjahre ansehen',
    to: '/?section=zusammenfassung',
  },
];

export const DesktopQuickActions: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="hidden md:block mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-[0.08em]">
          Schnellaktionen
        </h2>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
        {ACTIONS.map(({ Icon, label, sub, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={cn(
              'group flex items-center gap-3 px-3.5 py-3 rounded-[14px]',
              'bg-white ring-1 ring-black/[0.05] hover:ring-black/[0.09]',
              'transition-all text-left'
            )}
          >
            <div className="w-9 h-9 rounded-[10px] bg-foreground/[0.04] flex items-center justify-center flex-shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors">
              <Icon className="w-[15px] h-[15px]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-foreground tracking-[-0.005em] truncate">{label}</p>
              <p className="text-[11px] text-muted-foreground/75 mt-0.5 truncate">{sub}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default DesktopQuickActions;
