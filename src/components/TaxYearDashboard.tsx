import React, { useState, useEffect, useRef } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, Send, LucideIcon, Lock, Settings2, FileUp, Pencil, Star, Upload } from 'lucide-react';
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
import {
  hasInternalPriorYearData,
  seedPriorYearChecklistFromInternal,
} from '@/services/seedPriorYearChecklistFromInternal';
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
  const [priorYearProgress, setPriorYearProgress] = useState<PriorYearProgress>({ done: 0, total: 0, ready: false, status: 'loading', items: [] });
  const [step1Expanded, setStep1Expanded] = useState(true);
  const [tipDismissed, setTipDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dashboard-tip-dismissed') === 'true';
  });
  const [hasInternalPriorYear, setHasInternalPriorYear] = useState(false);

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

  // Detect whether the previous year already has Ditax data → skip PDF upload
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!activeTaxFilerId || !taxYear) { setHasInternalPriorYear(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const has = await hasInternalPriorYearData({
        userId: user.id,
        taxFilerId: activeTaxFilerId,
        taxYear,
      });
      if (!cancelled) setHasInternalPriorYear(has);
    };
    check();
    return () => { cancelled = true; };
  }, [activeTaxFilerId, taxYear]);

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

    // If user picked the prior-year flow and we already have Ditax data for
    // last year, seed the checklist server-side so they land directly in the
    // confirmation step — no upload needed.
    if (mode === 'prior_year_upload' && hasInternalPriorYear) {
      try {
        await seedPriorYearChecklistFromInternal({
          userId: user.id,
          taxFilerId: activeTaxFilerId,
          taxYear,
        });
      } catch (e) {
        console.warn('[TaxYearDashboard] seed prior-year checklist failed', e);
      }
    }

    setIntakeMode(mode);
    setModeSheetOpen(false);
    toast.success('Modus aktualisiert – deine Daten bleiben erhalten.');
  };

  // Auto-seed prior-year checklist from Ditax data if user already picked
  // 'prior_year_upload' previously and we have internal prior-year data.
  // Idempotent — does nothing if a checklist already exists.
  useEffect(() => {
    if (intakeMode !== 'prior_year_upload') return;
    if (!hasInternalPriorYear) return;
    if (!activeTaxFilerId || !taxYear) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      try {
        await seedPriorYearChecklistFromInternal({
          userId: user.id,
          taxFilerId: activeTaxFilerId,
          taxYear,
        });
      } catch (e) {
        console.warn('[TaxYearDashboard] auto-seed prior-year failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [intakeMode, hasInternalPriorYear, activeTaxFilerId, taxYear]);

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

  const _pyStep1DoneEarly = priorYearProgress.ready && priorYearProgress.total > 0 && priorYearProgress.done === priorYearProgress.total;
  const _pyAutoCollapsedRef = useRef(false);
  useEffect(() => {
    if (_pyStep1DoneEarly && !_pyAutoCollapsedRef.current) {
      _pyAutoCollapsedRef.current = true;
      setStep1Expanded(false);
    }
  }, [_pyStep1DoneEarly]);

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
    const angabenReady = allAngabenComplete || (priorYearProgress.ready && priorYearProgress.total > 0 && priorYearProgress.done === priorYearProgress.total);
    if (angabenReady && documentsComplete) {
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
          className="group cursor-pointer relative bg-card border border-[#1450dc] shadow-[0_10px_40px_-12px_rgba(20,80,220,0.18)] rounded-[1.5rem] overflow-hidden transition-all duration-300 hover:shadow-[0_16px_50px_-12px_rgba(20,80,220,0.25)]"
        >
          <div className="p-5 md:p-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-[#0F1B3D] text-white text-[11.5px] font-semibold shadow-[0_4px_12px_-2px_rgba(15,27,61,0.3)]">
              <Star className="w-3 h-3 fill-white" strokeWidth={0} />
              Aktueller Schritt
            </div>

            <div className="space-y-2">
              <h3 className="text-[19px] md:text-[22px] font-semibold text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>
              <p className="text-[14px] md:text-[15px] text-slate-500 leading-relaxed">
                {desc}
              </p>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onAction?.(); }}
              className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#1E3A5F] to-[#0F1B3D] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(15,27,61,0.4)] hover:shadow-[0_12px_28px_-8px_rgba(15,27,61,0.5)] transition-all duration-300"
            >
              <Upload className="w-4 h-4" strokeWidth={2} />
              {actionLabel}
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
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={() => setModeSheetOpen(true)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-card hover:bg-muted/60 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        Modus wechseln
      </button>
    </div>
  );






  // ─── Prior-year mode derived state ───
  const py = priorYearProgress;
  const pyStep1Done = py.ready && py.total > 0 && py.done === py.total;
  const pyCanSubmit = pyStep1Done && isDocumentsComplete;
  const pyRemaining =
    (pyStep1Done ? 0 : 1) +
    (isDocumentsComplete ? 0 : 1) +
    (paymentStatus === 'paid' ? 0 : 1);
  const pyStepsDone = 3 - pyRemaining;
  const pyPct = Math.round((pyStepsDone / 3) * 100);
  const pyNextStep: 1 | 2 | 3 = !pyStep1Done ? 1 : !isDocumentsComplete ? 2 : 3;
  const pyCtaHeadline =
    pyPct >= 67 ? 'Du bist fast fertig!'
    : pyPct >= 33 ? 'Bleib dran'
    : 'Gleich loslegen';
  const pyCtaSubline =
    pyPct >= 67 ? 'Lade jetzt deine Belege hoch, damit wir deine Steuererklärung fertigstellen können.'
    : pyPct >= 33 ? 'Weiter geht\'s — lade jetzt deine Dokumente hoch.'
    : 'Bestätige zuerst die Daten aus deiner Vorjahres-Steuererklärung.';

  const handlePriorYearDocsClick = async () => {
    if (!pyStep1Done) return;
    formTour?.skipTour();
    try {
      const flags = mapPriorYearToFormFlags(py.items);
      for (const section of ['income', 'assets', 'deductions'] as const) {
        const merged = { ...(formData?.[section] ?? {}), ...flags[section], _completed: true };
        await saveSection(section as any, merged, true);
      }
    } catch (e) {
      // non-blocking
    }
    handleDocumentsClick();
  };

  const handlePyCtaClick = () => {
    if (pyNextStep === 1) { navigate(`/prior-year?year=${taxYear}`); }
    else if (pyNextStep === 2) handlePriorYearDocsClick();
    else if (pyCanSubmit) handleSubmitClick();
  };

  // Floating "Nächster Schritt" card (style of old mode switcher card)
  const nextStepMeta = (() => {
    if (intakeMode === 'prior_year_upload') {
      if (pyNextStep === 1) return {
        image: intakeUploadImg,
        badge: 'Schritt 1 von 3',
        title: !py.ready ? `Vorjahres-PDF hochladen` : 'Vorjahres-Daten bestätigen',
        action: 'Weiter',
        onClick: () => navigate(`/prior-year?year=${taxYear}`),
      };
      if (pyNextStep === 2) return {
        image: documentsMessageImg,
        badge: 'Schritt 2 von 3',
        title: 'Belege hochladen',
        action: 'Hochladen',
        onClick: handlePriorYearDocsClick,
      };
      return {
        image: intakeManualImg,
        badge: 'Schritt 3 von 3',
        title: 'Prüfung & Versand',
        action: 'Einreichen',
        onClick: handleSubmitClick,
      };
    }
    if (nextStep === 1) return {
      image: intakeManualImg,
      badge: 'Schritt 1 von 3',
      title: 'Persönliche Angaben',
      action: 'Fortfahren',
      onClick: handleCtaClick,
    };
    if (nextStep === 2) return {
      image: documentsMessageImg,
      badge: 'Schritt 2 von 3',
      title: 'Belege hochladen',
      action: 'Hochladen',
      onClick: handleCtaClick,
    };
    return {
      image: intakeUploadImg,
      badge: 'Schritt 3 von 3',
      title: 'Prüfung & Versand',
      action: 'Einreichen',
      onClick: handleCtaClick,
    };
  })();

  const showFloatingNext =
    intakeMode !== null &&
    (intakeMode === 'prior_year_upload' ? pyRemaining > 0 : remainingSteps > 0);

  const floatingNextStep = showFloatingNext ? (
    <div
      className="fixed z-[60] pointer-events-none inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] md:inset-x-auto md:left-auto md:right-6 md:bottom-6 md:px-0 px-0 md:px-4"
    >
      <div className="max-w-xl mx-auto pointer-events-auto md:mx-0 md:w-[360px]">
        <div className="relative md:rounded-2xl rounded-none border border-border md:border bg-card/95 backdrop-blur-md overflow-hidden md:shadow-[0_12px_32px_-8px_rgba(15,27,61,0.18)] shadow-[0_-4px_12px_-6px_rgba(15,27,61,0.08)] border-x-0 md:border-x border-b-0 md:border-b">
          {/* Image only on desktop */}
          <div className="relative h-14 w-full overflow-hidden bg-muted hidden md:block">
            <img
              src={nextStepMeta.image}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-card/95 backdrop-blur-sm border border-border/60">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
              </span>
              <span className="text-[10.5px] font-semibold text-foreground uppercase tracking-wider">Nächster Schritt</span>
            </div>
          </div>
          <div className="px-4 py-3 md:p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {/* Pill replaces "SCHRITT X VON Y" on mobile */}
              <div className="md:hidden inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/70 border border-border">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nächster Schritt</span>
              </div>
              <div className="hidden md:block text-[10.5px] font-medium text-muted-foreground uppercase tracking-wider">{nextStepMeta.badge}</div>
              <h3 className="text-[14px] font-semibold text-foreground tracking-tight truncate">{nextStepMeta.title}</h3>
            </div>
            <button
              type="button"
              onClick={nextStepMeta.onClick}
              className="shrink-0 inline-flex items-center gap-1.5 h-9 md:h-10 px-3.5 md:px-4 rounded-xl border border-border bg-card hover:bg-muted/60 md:bg-gradient-to-b md:from-[#1E3A5F] md:to-[#0F1B3D] md:border-transparent text-foreground md:text-white text-[13px] font-medium md:shadow-[0_4px_16px_-4px_rgba(15,27,61,0.35)] active:scale-[0.97] transition-all"
            >
              {nextStepMeta.action}
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>



      </div>
    </div>
  ) : null;


  const priorYearBranch = activeTaxFilerId ? (
    <>
      {/* Hidden progress probe so the dashboard knows where the user stands
          in step 1 without rendering the inline upload+confirm UI. */}
      <div className="hidden">
        <PriorYearChecklistBody
          taxFilerId={activeTaxFilerId}
          taxYear={taxYear}
          onProgress={setPriorYearProgress}
          hideHeader
        />
      </div>

      {/* ═══════════ Step 1: Vorjahres-Daten ═══════════ */}
      <div className="mb-3 md:mb-5">
        <StepRow
          n={1}
          state={pyStep1Done ? 'done' : 'active'}
          title={
            !py.ready
              ? `Vorjahres-Steuererklärung ${Number(taxYear) - 1} hochladen`
              : 'Vorjahres-Daten bestätigen'
          }
          desc={
            !py.ready
              ? 'Lade dein definitives PDF hoch – wir erstellen daraus deine persönliche Checkliste.'
              : 'Bestätige nacheinander die Bereiche aus deinem Vorjahr.'
          }
          statusLabel={
            pyStep1Done
              ? 'Abgeschlossen'
              : py.ready
                ? `${py.done} von ${py.total} Bereichen bestätigt`
                : py.status === 'scanning'
                  ? 'Analyse läuft …'
                  : 'Noch nicht gestartet'
          }
          statusTone={pyStep1Done ? 'green' : py.ready ? 'orange' : 'slate'}
          actionLabel={pyStep1Done ? 'Bearbeiten' : py.ready ? 'Fortfahren' : 'Jetzt hochladen'}
          onAction={() => navigate(`/prior-year?year=${taxYear}`)}
        />
      </div>


      {/* ═══════════ Steps 2 & 3 ═══════════ */}
      <div className="space-y-3 md:space-y-5">

        <StepRow
          n={2}
          state={!pyStep1Done ? 'locked' : isDocumentsComplete ? 'done' : 'active'}
          title="Belege & Unterlagen"
          desc="Lade deine Dokumente passend zur Vorjahres-Checkliste hoch."
          statusLabel={
            !pyStep1Done ? 'Noch nicht gestartet'
            : isDocumentsComplete ? 'Abgeschlossen'
            : 'Dokumente ausstehend'
          }
          statusTone={!pyStep1Done ? 'slate' : isDocumentsComplete ? 'green' : 'orange'}
          actionLabel={isDocumentsComplete ? 'Ansehen' : 'Jetzt hochladen'}
          onAction={handlePriorYearDocsClick}
        />

        <StepRow
          n={3}
          state={!pyCanSubmit ? 'locked' : paymentStatus === 'paid' ? 'done' : 'active'}
          title="Prüfung & Versand"
          desc="Wir prüfen deine Angaben und reichen deine Steuererklärung ein."
          statusLabel={
            !pyCanSubmit ? 'Noch nicht gestartet'
            : paymentStatus === 'paid' ? 'Abgeschlossen'
            : 'Bereit zur Einreichung'
          }
          statusTone={!pyCanSubmit ? 'slate' : paymentStatus === 'paid' ? 'green' : 'orange'}
          actionLabel={paymentStatus === 'paid' ? 'Ansehen' : 'Einreichen'}
          onAction={handleSubmitClick}
        />
      </div>

    </>
  ) : null;

  const stepsContent = (
    <>
      {intakeMode === null ? (
        <IntakeModePicker taxYear={taxYear} onSelect={handleSelectMode} hasInternalPriorYear={hasInternalPriorYear} />
      ) : (
        <>
      {modeSwitcher}
      {intakeMode === 'prior_year_upload' ? priorYearBranch : (
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
        hasInternalPriorYear={hasInternalPriorYear}
      />
      {floatingNextStep}
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
      <main className="max-w-xl mx-auto px-5 sm:px-8 pb-56">
        {stepsContent}
      </main>
    </div>
  );
};
