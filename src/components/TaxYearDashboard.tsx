import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, Send, LucideIcon, Lock, Settings2, FileUp, Pencil } from 'lucide-react';
import tipFolderImg from '@/assets/tip-info.webp';
import documentsMessageImg from '@/assets/documents-message.svg';
import intakeUploadImg from '@/assets/intake-upload.webp';
import intakeManualImg from '@/assets/intake-manual.webp';
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
import { IntakeModeSheet, type IntakeMode } from '@/components/intake/IntakeModeSheet';
import { IntakeModePicker } from '@/components/intake/IntakeModePicker';
import { PriorYearChecklistBody, type PriorYearProgress } from '@/components/intake/PriorYearChecklist';
import { mapPriorYearToFormFlags } from '@/components/intake/priorYearMapping';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
    formDataLoaded,
    saveSection,
    formData,
  } = useFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [isReady, setIsReady] = useState(false);
  const [isAngabenExpanded, setIsAngabenExpanded] = useState(true);
  const [intakeMode, setIntakeMode] = useState<IntakeMode | null>(null);
  const [modeSheetOpen, setModeSheetOpen] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dashboard-tip-dismissed') === 'true';
  });

  const { activeTaxFilerId } = useTaxFiler();
  const formTour = useFormTourSafe();

  // Load payment status + intake mode
  useEffect(() => {
    const loadTaxReturn = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !taxYear || !activeTaxFilerId) return;
      const { data } = await supabase.from('tax_returns')
        .select('payment_status, intake_mode, intake_mode_chosen_at')
        .eq('user_id', user.id).eq('tax_year', taxYear).eq('tax_filer_id', activeTaxFilerId)
        .maybeSingle();
      if (data?.payment_status) setPaymentStatus(data.payment_status);
      const chosenAt = (data as any)?.intake_mode_chosen_at;
      setIntakeMode(chosenAt ? (((data as any)?.intake_mode as IntakeMode) ?? 'guided') : null);
    };
    loadTaxReturn();
  }, [taxYear, activeTaxFilerId]);

  const handleSelectMode = async (mode: IntakeMode) => {
    if (!activeTaxFilerId || !taxYear) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: existing } = await supabase.from('tax_returns')
      .select('id').eq('user_id', user.id).eq('tax_year', taxYear).eq('tax_filer_id', activeTaxFilerId)
      .maybeSingle();
    const nowIso = new Date().toISOString();
    if (!existing) {
      await supabase.from('tax_returns').insert({
        user_id: user.id, tax_year: taxYear, tax_filer_id: activeTaxFilerId,
        intake_mode: mode, intake_mode_chosen_at: nowIso, status: 'in_progress',
      } as any);
    } else {
      await supabase.from('tax_returns').update({
        intake_mode: mode, intake_mode_chosen_at: nowIso,
      } as any).eq('id', existing.id);
    }
    setIntakeMode(mode);
    setModeSheetOpen(false);
    toast.success('Modus aktualisiert – deine Daten bleiben erhalten.');
  };

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
      statusTone === 'green'  ? 'bg-emerald-500'
      : statusTone === 'orange' ? 'bg-amber-400'
      : 'bg-slate-300';

    // ───── Active step: prominent hero-style card ─────
    if (state === 'active') {
      return (
        <div
          onClick={onAction}
          className="group cursor-pointer relative bg-gradient-to-b from-[#F8FAFF] to-white border border-blue-100/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.04)] rounded-[2rem] p-8 md:p-10 flex flex-col transition-all duration-500 hover:shadow-[0_12px_50px_-12px_rgba(37,99,235,0.08)]"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
            </div>
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest">
              Aktueller Schritt
            </span>
          </div>

          <div className="space-y-3 max-w-xl mb-4">
            <h3 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-base text-slate-500 leading-relaxed">
              {desc}
            </p>
          </div>

          <div className="mt-8 pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-100/60 via-slate-100 to-transparent" />
            <div className="flex items-center gap-3">
              <span className={cn('w-2 h-2 rounded-full', dotCls)} />
              <span className="text-[15px] text-slate-600 font-medium">{statusLabel}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onAction?.(); }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-b from-[#1E3A5F] to-[#0F1B3D] text-white text-[15px] font-medium flex items-center justify-center gap-2.5 shadow-[0_4px_16px_-4px_rgba(15,27,61,0.3)] hover:shadow-[0_8px_24px_-4px_rgba(15,27,61,0.4)] transition-all duration-300 transform group-hover:-translate-y-0.5"
            >
              {actionLabel}
              <ChevronRight className="w-4 h-4 text-white/90" strokeWidth={2} />
            </button>
          </div>
        </div>
      );
    }

    // ───── Done / Locked: compact row ─────
    const isDone = state === 'done';
    const containerCls = isDone
      ? 'bg-white border border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)]'
      : 'bg-slate-50/40 border border-slate-200/50';

    return (
      <div
        onClick={state !== 'locked' ? onAction : undefined}
        className={cn(
          'rounded-[1.25rem] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all',
          containerCls,
          state !== 'locked' && 'cursor-pointer'
        )}
      >
        <div className={cn('flex items-start gap-6', !isDone && 'opacity-70')}>
          <div className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center shrink-0',
            isDone
              ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
              : 'bg-slate-100/80 border border-slate-200/60 text-slate-400'
          )}>
            {isDone ? <Check className="w-5 h-5" strokeWidth={2} /> : <Lock className="w-4 h-4" strokeWidth={1.75} />}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h3>
            <p className="text-[15px] text-slate-500 leading-relaxed">{desc}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className={cn('w-2 h-2 rounded-full', dotCls)} />
              <span className="text-sm text-slate-600 font-medium">{statusLabel}</span>
            </div>
          </div>
        </div>
        {state === 'locked' ? (
          <div className="w-10 h-10 rounded-full border border-slate-200/60 flex items-center justify-center text-slate-400 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] shrink-0">
            <Lock className="w-5 h-5" strokeWidth={1.75} />
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onAction?.(); }}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-medium text-slate-700 flex items-center justify-center md:justify-start gap-2 shadow-sm transition-all shrink-0"
          >
            {actionLabel || 'Bearbeiten'}
            <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
          </button>
        )}
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

  const modeMeta = intakeMode === 'prior_year_upload'
    ? {
        image: intakeUploadImg,
        imageAlt: 'Zwei Personen am Laptop bei der Steuererklärung',
        icon: <FileUp className="w-4 h-4 text-primary" strokeWidth={1.75} />,
        badge: 'In Minuten',
        title: `Steuererklärung ${Number(taxYear) - 1} hochladen`,
        desc: 'Wir erstellen aus deiner Vorjahres-Erklärung eine persönliche Checkliste.',
      }
    : {
        image: intakeManualImg,
        imageAlt: 'Person denkt über die Steuererklärung nach',
        icon: <Pencil className="w-4 h-4 text-primary" strokeWidth={1.75} />,
        badge: 'Schritt für Schritt',
        title: 'Daten manuell erfassen',
        desc: 'Wir führen dich begleitet durch alle Bereiche.',
      };

  const modeSwitcher = (
    <div className="mb-5">
      <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
        <div className="relative h-28 w-full overflow-hidden bg-muted">
          <img
            src={modeMeta.image}
            alt={modeMeta.imageAlt}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border/60">
            {modeMeta.icon}
            <span className="text-[11px] font-medium text-foreground">{modeMeta.badge}</span>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-semibold text-foreground tracking-tight truncate">{modeMeta.title}</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{modeMeta.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => setModeSheetOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white hover:bg-slate-50 text-[12px] font-medium text-foreground transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            Wechseln
          </button>
        </div>
      </div>
    </div>
  );


  const priorYearContent = activeTaxFilerId ? (
    <PriorYearChecklist taxFilerId={activeTaxFilerId} taxYear={taxYear} />
  ) : null;

  const stepsContent = (
    <>
      {intakeMode === null ? (
        <IntakeModePicker taxYear={taxYear} onSelect={handleSelectMode} />
      ) : (
        <>
      {modeSwitcher}
      {intakeMode === 'prior_year_upload' ? priorYearContent : (
        <>
      <DashboardPriorYearBanner taxYear={taxYear} />

      {/* ═══════════ Step list ═══════════ */}
      <div className="space-y-5">
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
          title="Belege & Unterlagen"
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
          title="Prüfung & Versand"
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

      {/* ═══════════ Resume / Progress card ═══════════ */}
      {remainingSteps > 0 && (
        <div
          onClick={handleCtaClick}
          className="cursor-pointer bg-white border border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] rounded-[1.25rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 mt-5 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] transition-all"
        >
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100" />
                <circle
                  cx="32" cy="32" r="28"
                  stroke="currentColor" strokeWidth="5" fill="transparent"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - pct / 100)}
                  className="text-[#1E3A5F] transition-all duration-1000 ease-in-out"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-semibold text-slate-900 tabular-nums">{pct}%</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{ctaHeadline}</h3>
              <p className="text-base text-slate-500">{ctaSubline}</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleCtaClick(); }}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-medium text-slate-700 flex items-center justify-center md:justify-start gap-2 shadow-sm transition-all shrink-0"
          >
            Fortsetzen
            <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={2} />
          </button>
        </div>
      )}
        </>
      )}
        </>
      )}
      <IntakeModeSheet
        open={modeSheetOpen}
        onOpenChange={setModeSheetOpen}
        currentMode={intakeMode}
        onSelect={handleSelectMode}
        taxYear={taxYear}
      />
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
