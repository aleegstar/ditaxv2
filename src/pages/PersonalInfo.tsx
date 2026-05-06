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
  icon: LucideIcon;
  param: string;
}

const PersonalInfoContent: React.FC<{ taxYear: string }> = ({ taxYear }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formProgress, isDataLoading, formDataLoaded } = useFormContext();

  const sections: SectionItem[] = [
    { id: 'contact', title: t.formDashboard.contactInfo, icon: User, param: 'kontakt' },
    { id: 'deductions', title: t.formDashboard.deductions, icon: Shield, param: 'abzuege' },
    { id: 'income', title: t.formDashboard.income, icon: Wallet, param: 'einkommen' },
    { id: 'assets', title: t.formDashboard.assets, icon: Landmark, param: 'vermoegen' },
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

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader
        title={t.formDashboard.personalInfo}
        onBack={() => navigate('/')}
      />
      <main className="max-w-xl mx-auto px-4 sm:px-6 pb-24">
        <div className="p-2 rounded-[24px] bg-white/50 border border-white/60 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] backdrop-blur-[24px]">
          <div className="bg-white rounded-[18px] shadow-[inset_0_2px_6px_rgba(255,255,255,1),inset_0_0_2px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.05)] p-3.5">
            <div className="flex flex-col gap-1.5">
              {sections.map((section) => {
                const Icon = section.icon;
                const completed = isCompleted(section.id);
                return (
                  <button
                    key={section.id}
                    onClick={() => navigate(`/form?section=${section.param}&year=${taxYear}`)}
                    className="flex items-center justify-between p-2 bg-white rounded-[14px] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group/item text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-300",
                        completed
                          ? "bg-[#EBF2FF] text-[#1656FF]"
                          : "bg-[#F4F7FB] text-[#7A8498] group-hover/item:text-[#1656FF] group-hover/item:bg-[#EBF2FF]"
                      )}>
                        {completed ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
                      </div>
                      <span className="font-medium text-[#111827] text-[13px]">{section.title}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C4C9D4] group-hover/item:text-[#1656FF] group-hover/item:translate-x-0.5 transition-all duration-300 mr-0.5" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
          </div>
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
