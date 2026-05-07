import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { FormProvider, useFormContext } from '@/contexts/form/FormContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import sectionContactImg from '@/assets/section-contact.webp';
import sectionIncomeImg from '@/assets/section-income.webp';
import sectionDeductionsImg from '@/assets/section-deductions.webp';
import sectionAssetsImg from '@/assets/section-assets.webp';

const PersonalInfoContent: React.FC<{ taxYear: string }> = ({ taxYear }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formProgress, isDataLoading, formDataLoaded } = useFormContext();

  const sections: Array<{ id: string; title: string; description: string; image: string; param: string }> = [
    {
      id: 'contact',
      title: t.formDashboard.contactInfo,
      description: 'Adresse & Familie',
      image: sectionContactImg,
      param: 'kontakt',
    },
    {
      id: 'income',
      title: t.formDashboard.income,
      description: 'Lohn & Renten',
      image: sectionIncomeImg,
      param: 'einkommen',
    },
    {
      id: 'deductions',
      title: t.formDashboard.deductions,
      description: 'Versicherung & 3a',
      image: sectionDeductionsImg,
      param: 'abzuege',
    },
    {
      id: 'assets',
      title: t.formDashboard.assets,
      description: 'Konten & Wertschriften',
      image: sectionAssetsImg,
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

  const completedCount = sections.filter(s => isCompleted(s.id)).length;
  const allCompleted = completedCount === sections.length;

  const prevCompletedRef = useRef<number | null>(null);
  useEffect(() => {
    if (isDataLoading || !formDataLoaded) return;
    const prev = prevCompletedRef.current;
    if (prev !== null && prev < sections.length && completedCount === sections.length) {
      navigate(`/?year=${taxYear}`);
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, isDataLoading, formDataLoaded, navigate, taxYear, sections.length]);

  if (isDataLoading || !formDataLoaded) return null;

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

        {/* 2x2 grid — neutral white cards */}
        <div className="grid grid-cols-2 gap-3">
          {sections.map((section) => {
            const completed = isCompleted(section.id);
            return (
              <button
                key={section.id}
                onClick={() => navigate(`/form?section=${section.param}&year=${taxYear}`)}
                className={cn(
                  "relative text-left rounded-2xl bg-white border border-slate-200/80 p-4 pt-5",
                  "shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
                  "active:scale-[0.98] transition-all duration-200 min-h-[170px] flex flex-col items-center justify-between"
                )}
              >
                {completed && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gradient-to-b from-[#508BFF] to-[#1656FF] flex items-center justify-center shadow-[0_4px_10px_-2px_rgba(22,86,255,0.5)]">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                )}
                <img src={section.image} alt="" className="w-20 h-20 object-contain" />
                <div className="text-center">
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight leading-snug">
                    {section.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug truncate">
                    {section.description}
                  </p>
                </div>
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

