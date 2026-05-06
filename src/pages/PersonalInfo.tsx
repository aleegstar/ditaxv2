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

  const sections: SectionItem[] = [
    {
      id: 'contact',
      title: t.formDashboard.contactInfo,
      description: 'Adresse, Zivilstand, Familie',
      icon: User,
      param: 'kontakt',
      gradient: 'from-[#EFF4FF] to-[#FFFFFF]',
      iconBg: 'bg-[#E0EAFF]',
      iconColor: 'text-[#1656FF]',
    },
    {
      id: 'income',
      title: t.formDashboard.income,
      description: 'Lohn, Renten, Nebeneinkünfte',
      icon: Wallet,
      param: 'einkommen',
      gradient: 'from-[#FFF4E8] to-[#FFFFFF]',
      iconBg: 'bg-[#FFE6CC]',
      iconColor: 'text-[#E07A1F]',
    },
    {
      id: 'deductions',
      title: t.formDashboard.deductions,
      description: 'Versicherungen, Spenden, Säule 3a',
      icon: Shield,
      param: 'abzuege',
      gradient: 'from-[#F1ECFF] to-[#FFFFFF]',
      iconBg: 'bg-[#E5DCFF]',
      iconColor: 'text-[#6B47D9]',
    },
    {
      id: 'assets',
      title: t.formDashboard.assets,
      description: 'Konten, Wertschriften, Liegenschaften',
      icon: Landmark,
      param: 'vermoegen',
      gradient: 'from-[#E8F8F0] to-[#FFFFFF]',
      iconBg: 'bg-[#D2F0DE]',
      iconColor: 'text-[#1F9D55]',
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

        {/* 2x2 grid of cards */}
        <div className="grid grid-cols-2 gap-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const completed = isCompleted(section.id);
            return (
              <button
                key={section.id}
                onClick={() => navigate(`/form?section=${section.param}&year=${taxYear}`)}
                className={cn(
                  "relative overflow-hidden text-left rounded-[20px] p-4 bg-gradient-to-br border border-white/70",
                  "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.12)]",
                  "active:scale-[0.98] transition-all duration-200 min-h-[150px] flex flex-col justify-between",
                  section.gradient
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", section.iconBg)}>
                    <Icon className={cn("w-5 h-5", section.iconColor)} strokeWidth={1.75} />
                  </div>
                  {completed && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#508BFF] to-[#1656FF] flex items-center justify-center shadow-[0_4px_10px_-2px_rgba(22,86,255,0.5)]">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#111827] tracking-tight leading-snug">
                    {section.title}
                  </h3>
                  <p className="text-[11px] text-[#7A8498] mt-1 leading-snug line-clamp-2">
                    {section.description}
                  </p>
                </div>
                <ChevronRight
                  className="absolute top-4 right-4 w-4 h-4 text-[#C4C9D4] opacity-0"
                  strokeWidth={1.5}
                />
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

