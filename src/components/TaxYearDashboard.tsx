import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, Send, LucideIcon, Lock } from 'lucide-react';
import tipFolderImg from '@/assets/tip-info.webp';
import documentsMessageImg from '@/assets/documents-message.svg';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { useI18n } from '@/contexts/I18nContext';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useFormTourSafe } from '@/contexts/FormTourContext';
import { DashboardPriorYearBanner } from '@/components/forms/DashboardPriorYearBanner';
import { cn } from '@/lib/utils';

interface DashboardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  param: string;
}

interface TaxYearDashboardProps {
  embedded?: boolean;
}

export const TaxYearDashboard: React.FC<TaxYearDashboardProps> = ({ embedded = false }) => {
  const { t } = useI18n();
  const {
    formProgress,
    taxYear,
    isDataLoading,
    formDataLoaded
  } = useFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [isReady, setIsReady] = useState(false);
  const [isAngabenExpanded, setIsAngabenExpanded] = useState(true);
  const [tipDismissed, setTipDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dashboard-tip-dismissed') === 'true';
  });

  const { activeTaxFilerId } = useTaxFiler();
  const formTour = useFormTourSafe();

  // Load payment status
  useEffect(() => {
    const loadPaymentStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !taxYear || !activeTaxFilerId) return;
      const { data } = await supabase.from('tax_returns').select('payment_status').eq('user_id', user.id).eq('tax_year', taxYear).eq('tax_filer_id', activeTaxFilerId).maybeSingle();
      if (data?.payment_status) {
        setPaymentStatus(data.payment_status);
      }
    };
    loadPaymentStatus();
  }, [taxYear, activeTaxFilerId]);

  // Mark component as ready after initial data load
  useEffect(() => {
    if (!isDataLoading && formDataLoaded) {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [isDataLoading, formDataLoaded]);

  const angabenSections: DashboardSection[] = [
    { id: 'contact', title: t.formDashboard.contactInfo, icon: User, param: 'kontakt' },
    { id: 'deductions', title: t.formDashboard.deductions, icon: Shield, param: 'abzuege' },
    { id: 'income', title: t.formDashboard.income, icon: Wallet, param: 'einkommen' },
    { id: 'assets', title: t.formDashboard.assets, icon: Landmark, param: 'vermoegen' },
  ];

  const isCompleted = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'contact': return formProgress.contactInfo || false;
      case 'income': return formProgress.income || false;
      case 'deductions': return formProgress.deductions || false;
      case 'assets': return formProgress.assets || false;
      case 'documents': return formProgress.documents || false;
      case 'submit':
        return formProgress.contactInfo && formProgress.income && formProgress.deductions && formProgress.assets && formProgress.documents && paymentStatus === 'paid' || false;
      default: return false;
    }
  };

  const allAngabenComplete = angabenSections.every(s => isCompleted(s.id));

  // Auto-collapse when all angaben are complete
  useEffect(() => {
    if (allAngabenComplete) {
      setIsAngabenExpanded(false);
    }
  }, [allAngabenComplete]);

  // Show nothing while loading
  if (isDataLoading || !isReady || !formDataLoaded) {
    return null;
  }

  const getAngabenProgress = () => {
    const completed = angabenSections.filter(s => isCompleted(s.id)).length;
    return { completed, total: 4, percentage: Math.round(completed / 4 * 100) };
  };

  const handleSectionClick = (section: DashboardSection) => {
    formTour?.skipTour();
    if (embedded) {
      navigate(`/form?section=${section.param}&year=${taxYear}`);
    } else {
      setSearchParams({ section: section.param, year: taxYear });
    }
  };

  const handleDocumentsClick = () => {
    formTour?.skipTour();
    if (embedded) {
      navigate(`/form?section=unterlagen&year=${taxYear}`);
    } else {
      setSearchParams({ section: 'unterlagen', year: taxYear });
    }
  };

  const handleSubmitClick = () => {
    const documentsComplete = isCompleted('documents');
    if (allAngabenComplete && documentsComplete) {
      navigate(`/payment?year=${taxYear}`);
    }
  };

  const angabenProgress = getAngabenProgress();
  const isDocumentsComplete = isCompleted('documents');
  const canSubmit = allAngabenComplete && isDocumentsComplete;

  // Determine which step is "next"
  const nextStep: 1 | 2 | 3 = !allAngabenComplete ? 1 : !isDocumentsComplete ? 2 : 3;
  const remainingSteps =
    (allAngabenComplete ? 0 : 1) +
    (isDocumentsComplete ? 0 : 1) +
    (paymentStatus === 'paid' ? 0 : 1);
  const totalSteps = 3;
  const stepsDone = totalSteps - remainingSteps;
  const pct = Math.round((stepsDone / totalSteps) * 100);

  type StepState = 'done' | 'active' | 'locked';

  const StepRow: React.FC<{
    n: number;
    state: StepState;
    title: string;
    desc: string;
    statusLabel: string;
    statusTone: 'green' | 'orange' | 'slate';
    actionLabel?: string;
    onAction?: () => void;
  }> = ({ n, state, title, desc, statusLabel, statusTone, actionLabel, onAction }) => {
    const dotCls =
      statusTone === 'green'  ? 'bg-green-500'
      : statusTone === 'orange' ? 'bg-orange-400'
      : 'bg-slate-300';
    const textTone = statusTone === 'slate' ? 'text-slate-500' : 'text-slate-600';

    const containerBase = 'relative overflow-hidden p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-6 transition-shadow';
    const containerCls =
      state === 'active'
        ? `${containerBase} border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5`
        : state === 'done'
          ? `${containerBase} border-slate-200 bg-white hover:shadow-sm`
          : `${containerBase} border-slate-200 bg-slate-50/60`;

    const circleCls =
      state === 'done'   ? 'w-14 h-14 rounded-full bg-green-50 border border-green-100 text-green-600 flex items-center justify-center shrink-0'
      : state === 'active' ? 'w-14 h-14 rounded-full bg-slate-900 text-white text-[18px] font-medium flex items-center justify-center shrink-0'
      : 'w-14 h-14 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[18px] font-medium flex items-center justify-center shrink-0';

    return (
      <div
        onClick={state !== 'locked' ? onAction : undefined}
        className={cn(containerCls, state !== 'locked' && 'cursor-pointer')}
      >
        {state === 'active' && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900 rounded-l-2xl" />
        )}
        <div className={circleCls}>
          {state === 'done' ? <Check className="w-6 h-6" strokeWidth={2} /> : n}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-medium text-slate-900 tracking-[-0.005em]">{title}</h3>
          <p className="text-[14px] text-slate-500 mt-1 leading-relaxed">{desc}</p>
          <div className={cn('flex items-center gap-2 mt-3 text-[13px]', textTone)}>
            <span className={cn('w-2 h-2 rounded-full', dotCls)} />
            {statusLabel}
          </div>
        </div>
        <div className="shrink-0 pt-2 sm:pt-0">
          {state === 'locked' ? (
            <div className="w-10 h-10 flex items-center justify-center">
              <Lock className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.75} />
            </div>
          ) : state === 'active' ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAction?.(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:bg-slate-800 transition-colors shadow-sm"
            >
              {actionLabel}
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAction?.(); }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 hover:bg-slate-50 transition-colors"
            >
              {actionLabel || 'Bearbeiten'}
              <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // CTA banner content
  const nextLabel =
    nextStep === 1 ? t.formDashboard.personalInfo
    : nextStep === 2 ? t.formDashboard.documentsTitle
    : t.formDashboard.reviewAndSubmit;
  const ctaSubline =
    pct >= 67 ? 'Du bist fast fertig! Lade jetzt deine Belege hoch, damit wir deine Steuererklärung fertigstellen können.'
    : pct >= 33 ? 'Weiter geht\'s — ergänze deine restlichen Angaben.'
    : 'Lass uns starten — erfasse zuerst deine persönlichen Angaben.';
  const ctaHeadline =
    pct >= 67 ? 'Du bist fast fertig!'
    : pct >= 33 ? 'Bleib dran'
    : 'Gleich loslegen';
  const handleCtaClick = () => {
    formTour?.skipTour();
    if (nextStep === 1) navigate(`/personal-info?year=${taxYear}`);
    else if (nextStep === 2) handleDocumentsClick();
    else if (canSubmit) handleSubmitClick();
  };

  // Circular progress geometry
  const Rc = 15.9155;
  const dashLen = pct;

  const stepsContent = (
    <>
      <DashboardPriorYearBanner taxYear={taxYear} />

      {/* ═══════════ Step list ═══════════ */}
      <div className="space-y-4">
        <StepRow
          n={1}
          state={allAngabenComplete ? 'done' : 'active'}
          title={t.formDashboard.personalInfo}
          desc="Adresse, Familie, Zivilstand und weitere Angaben."
          statusLabel={allAngabenComplete ? 'Abgeschlossen' : `${angabenProgress.completed} von ${angabenProgress.total} Bereichen erfasst`}
          statusTone={allAngabenComplete ? 'green' : 'orange'}
          actionLabel={allAngabenComplete ? 'Bearbeiten' : 'Fortfahren'}
          onAction={() => { formTour?.skipTour(); navigate(`/personal-info?year=${taxYear}`); }}
        />

        <StepRow
          n={2}
          state={!allAngabenComplete ? 'locked' : isDocumentsComplete ? 'done' : 'active'}
          title={t.formDashboard.documentsTitle}
          desc="Lade deine Dokumente hoch und ergänze fehlende Angaben."
          statusLabel={
            !allAngabenComplete ? 'Noch nicht gestartet'
            : isDocumentsComplete ? 'Abgeschlossen'
            : 'Dokumente ausstehend'
          }
          statusTone={!allAngabenComplete ? 'slate' : isDocumentsComplete ? 'green' : 'orange'}
          actionLabel={isDocumentsComplete ? 'Ansehen' : 'Jetzt hochladen'}
          onAction={handleDocumentsClick}
        />

        <StepRow
          n={3}
          state={!canSubmit ? 'locked' : paymentStatus === 'paid' ? 'done' : 'active'}
          title={t.formDashboard.reviewAndSubmit}
          desc="Wir prüfen deine Angaben und reichen deine Steuererklärung ein."
          statusLabel={
            !canSubmit ? 'Noch nicht gestartet'
            : paymentStatus === 'paid' ? 'Abgeschlossen'
            : 'Bereit zur Einreichung'
          }
          statusTone={!canSubmit ? 'slate' : paymentStatus === 'paid' ? 'green' : 'orange'}
          actionLabel={paymentStatus === 'paid' ? 'Ansehen' : 'Einreichen'}
          onAction={handleSubmitClick}
        />
      </div>

      {/* ═══════════ CTA banner ═══════════ */}
      {remainingSteps > 0 && (
        <div className="mt-6 p-6 border border-slate-200 rounded-2xl bg-[#F9FAFB] flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                d={`M18 ${18 - Rc} a ${Rc} ${Rc} 0 0 1 0 ${Rc * 2} a ${Rc} ${Rc} 0 0 1 0 -${Rc * 2}`}
                fill="none" stroke="currentColor" strokeWidth="3"
              />
              <path
                className="text-slate-900"
                d={`M18 ${18 - Rc} a ${Rc} ${Rc} 0 0 1 0 ${Rc * 2} a ${Rc} ${Rc} 0 0 1 0 -${Rc * 2}`}
                fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${dashLen}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[16px] font-medium text-slate-900 tabular-nums">
              {pct}%
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-medium text-slate-900 tracking-[-0.005em]">
              {ctaHeadline}
            </h3>
            <p className="text-[14px] text-slate-500 mt-1 leading-relaxed">
              {ctaSubline}
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={handleCtaClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Fortsetzen
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="w-full">{stepsContent}</div>;
  }

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader
        title={t.formDashboard.title.replace('{year}', taxYear)}
        onBack={() => navigate('/')}
      />
      <TaxFilerSelector className="max-w-xl mx-auto px-5 sm:px-8 mb-8" />
      <main className="max-w-xl mx-auto px-5 sm:px-8 pb-24">
        {stepsContent}
      </main>
    </div>
  );
};
