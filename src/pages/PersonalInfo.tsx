import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Wallet, Shield, Landmark, ChevronRight, Check, LucideIcon } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { FormProvider, useFormContext } from '@/contexts/form/FormContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

interface SectionItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  param: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

const PersonalInfoContent: React.FC<{ taxYear: string }> = ({ taxYear }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formProgress, isDataLoading, formDataLoaded } = useFormContext();

  const sections: Array<{ id: string; title: string; description: string; icon: LucideIcon; param: string }> = [
    {
      id: 'contact',
      title: t.formDashboard.contactInfo,
      description: 'Adresse, Zivilstand, Familie',
      icon: User,
      param: 'kontakt',
    },
    {
      id: 'income',
      title: t.formDashboard.income,
      description: 'Lohn, Renten, Nebeneinkünfte',
      icon: Wallet,
      param: 'einkommen',
    },
    {
      id: 'deductions',
      title: t.formDashboard.deductions,
      description: 'Versicherungen, Spenden, Säule 3a',
      icon: Shield,
      param: 'abzuege',
    },
    {
      id: 'assets',
      title: t.formDashboard.assets,
      description: 'Konten, Wertschriften, Liegenschaften',
      icon: Landmark,
      param: 'vermoegen',
    },
  ];

  const isCompleted = (id: string) => {
    switch (id) {
      case 'contact': return formProgress.contactInfo || false;
      case 'income': return formProgress.income || false;
      case 'deductions': return formProgress.deductions || false;
      case 'assets': return formProgress.assets || false;
      default: return false;
    }
  };

  if (isDataLoading || !formDataLoaded) return null;

  const completedCount = sections.filter(s => isCompleted(s.id)).length;

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader
        title={t.formDashboard.personalInfo}
        onBack={() => navigate('/')}
      />
      <main className="max-w-xl mx-auto px-4 sm:px-6 pb-24">
        {/* Progress summary */}
        <div className="mb-5 px-1">
          <div className="flex items-end justify-between mb-2">
            <p className="text-sm text-muted-foreground">Fortschritt</p>
            <p className="text-sm font-medium text-foreground">
              <span className="text-[#1656FF]">{completedCount}</span>
              <span className="text-muted-foreground"> / {sections.length}</span>
            </p>
          </div>
          <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden border border-white/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#508BFF] to-[#1656FF] transition-all duration-500"
              style={{ width: `${(completedCount / sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Cards — neutral, matching main page */}
        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const completed = isCompleted(section.id);
            return (
              <button
                key={section.id}
                onClick={() => navigate(`/form?section=${section.param}&year=${taxYear}`)}
                className={cn(
                  "w-full text-left rounded-2xl bg-white border border-slate-200/80",
                  "shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
                  "active:scale-[0.99] transition-all duration-200 p-4 flex items-center gap-3"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {completed
                    ? <Check className="w-5 h-5" strokeWidth={2.5} />
                    : <Icon className="w-5 h-5" strokeWidth={1.75} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight leading-snug">
                    {section.title}
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug truncate">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" strokeWidth={2} />
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

const PersonalInfo: React.FC = () => {
  const [searchParams] = useSearchParams();
  const taxYear = searchParams.get('year') || (new Date().getFullYear() - 1).toString();
  return (
    <FormProvider taxYear={taxYear}>
      <PersonalInfoContent taxYear={taxYear} />
    </FormProvider>
  );
};

export default PersonalInfo;

