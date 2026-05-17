import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, MessageSquare, Download, FileText, LucideIcon } from 'lucide-react';

interface Action {
  Icon: LucideIcon;
  label: string;
  sub: string;
  to: string;
}

const ACTIONS: Action[] = [
  { Icon: Upload,        label: 'Dokument hochladen',     sub: 'Belege & Unterlagen',    to: '/documents' },
  { Icon: MessageSquare, label: 'Nachricht schreiben',    sub: 'An Steuerberater',       to: '/chat' },
  { Icon: Download,      label: 'Steuerbescheinigung',    sub: 'Herunterladen',          to: '/documents' },
  { Icon: FileText,      label: 'Letzte Erklärung',       sub: 'Vorjahre ansehen',       to: '/?section=zusammenfassung' },
];

export const DesktopQuickActions: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="hidden md:block mt-12 mb-8">
      <h2 className="text-[19px] font-medium tracking-[-0.012em] text-slate-900 mb-5">
        Schnellzugriff
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ACTIONS.map(({ Icon, label, sub, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="group p-6 border border-slate-200 rounded-2xl bg-white flex flex-col items-center text-center hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-slate-100 transition-colors">
              <Icon className="w-[22px] h-[22px] text-slate-700" strokeWidth={1.5} />
            </div>
            <div className="text-[14px] font-medium text-slate-900 tracking-[-0.005em]">
              {label}
            </div>
            <div className="text-[13px] text-slate-500 mt-1">{sub}</div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default DesktopQuickActions;
