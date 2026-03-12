import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Menu, ChevronRight, Check, ExternalLink, Inbox, Trash2, MoreVertical, PenTool, AlertCircle, Clock, Zap, ArrowRight } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/modern-alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AddTaxYearDropdown } from '@/components/ui/add-tax-year-dropdown';
import ditaxLogoFull from '@/assets/ditax-logo.svg';
import uploadIcon from '@/assets/upload-icon.svg';
import { ProfileWithNotifications } from '@/components/ui/profile-with-notifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { calculateTaxReturnProgress } from '@/utils/taxReturnProgress';
import { useTaxYearData } from '@/hooks/use-tax-year-data';
import { TaxYearSelector } from '@/components/TaxYearSelector';
import { useOnboardingTour } from '@/contexts/OnboardingTourContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useProfile } from '@/hooks/useProfile';
import { UserTaxReturnsSkeleton } from '@/components/ui/user-tax-returns-skeleton';
import { SignatureDialog } from '@/components/signature/SignatureDialog';
import { usePendingMissingItemsCount } from '@/hooks/usePendingMissingItemsCount';
import { MissingItemsAlert } from '@/components/dashboard/MissingItemsAlert';
import { useI18n } from '@/contexts/I18nContext';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
import { cn } from '@/lib/utils';

interface TaxReturn {
  id: string;
  tax_year: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_date: string | null;
  workflow_step: string;
  user_id: string;
  express_service?: boolean;
}

const UserTaxReturns = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { setMenuSheetOpen } = useSidebar();
  const { profile: userProfile, loading: profileLoading } = useProfile();
  const { userId, isValid, isLoading: authLoading } = useAuthValidation();
  const { activeTaxFilerId, hasMultipleFilers, selectionConfirmed, confirmSelection, isLoading: taxFilerLoading } = useTaxFiler();
  const {
    taxReturns, formProgress, formData, uploadedDocuments, completedTaxReturns,
    definitiveTaxBills, supportTickets, loading, error, refetch
  } = useTaxYearData(userId, activeTaxFilerId);
  const { forceTour } = useOnboardingTour();
  const { unreadCount } = useUnreadMessages();
  const { pendingDocuments, pendingInformation } = usePendingMissingItemsCount(userId);

  // Pull-to-refresh for mobile
  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh, threshold: 60, maxPullDistance: 100
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isValid || !userId) { navigate('/auth'); return; }
    if (hasMultipleFilers && !selectionConfirmed) { navigate('/select-person', { replace: true }); return; }
  }, [userId, isValid, authLoading, navigate, hasMultipleFilers, selectionConfirmed]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refetch]);

  const [isCreatingTaxReturn, setIsCreatingTaxReturn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [safetyTimeout, setSafetyTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { console.warn('UserTaxReturns: Safety timeout after 8s'); setSafetyTimeout(true); }, 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authLoading && !loading && !profileLoading && !taxFilerLoading) setSafetyTimeout(false);
  }, [authLoading, loading, profileLoading, taxFilerLoading]);

  const unsignedTaxReturn = useMemo(() => {
    const completedYearsWithData = Object.entries(completedTaxReturns || {});
    for (const [year, data] of completedYearsWithData) {
      if (data && data.signature_status !== 'signed') return data;
    }
    return null;
  }, [completedTaxReturns]);

  useEffect(() => {
    if (unsignedTaxReturn && isReady && userProfile && !signatureDialogOpen) {
      const timer = setTimeout(() => setSignatureDialogOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [unsignedTaxReturn, isReady, userProfile]);

  const handleDeleteTaxYear = async (year: string) => {
    if (!userId) return;
    setIsDeleting(true);
    try {
      const taxReturn = taxReturns.find((tr: TaxReturn) => tr.tax_year === year);
      if (!taxReturn) { toast.error(t.userDashboard.taxReturnNotFound); return; }
      await supabase.from('form_data').delete().eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId);
      await supabase.from('form_progress').delete().eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId);
      await supabase.from('uploaded_documents').delete().eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId);
      const { error } = await supabase.from('tax_returns').delete().eq('id', taxReturn.id);
      if (error) throw error;
      toast.success(t.userDashboard.taxReturnDeleted.replace('{year}', year));
      await refetch();
    } catch (error) {
      console.error('Error deleting tax year:', error);
      toast.error(t.userDashboard.deleteError);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setYearToDelete(null);
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
        document.querySelectorAll('[data-radix-portal]').forEach(el => { if (el.children.length === 0) el.remove(); });
      }, 300);
    }
  };

  const handleDocumentsClick = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => navigate('/documents?transition=true'), 600);
  }, [navigate]);

  useEffect(() => {
    if (!loading && !authLoading && !profileLoading && !taxFilerLoading && activeTaxFilerId && !isReady) setIsReady(true);
  }, [loading, authLoading, profileLoading, taxFilerLoading, activeTaxFilerId, isReady]);

  const createNewTaxReturn = async (year: string) => {
    if (!userId) return;
    setIsCreatingTaxReturn(true);
    try {
      const { data: existingReturn } = await supabase.from('tax_returns').select('id').eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId).maybeSingle();
      if (existingReturn) {
        toast.info(t.userDashboard.taxReturnExists.replace('{year}', year));
        await refetch();
        setIsCreatingTaxReturn(false);
        return;
      }
      const { data, error } = await supabase.from('tax_returns').insert({
        user_id: userId, tax_filer_id: activeTaxFilerId, tax_year: year,
        status: 'pending', payment_status: 'pending', workflow_step: 'data_collection'
      }).select().single();
      if (error) {
        if (error.code === '23505') {
          toast.success(t.userDashboard.taxReturnAlreadyExists.replace('{year}', year));
          await refetch();
          navigate('/');
          return;
        }
        throw error;
      }
      toast.success(t.userDashboard.taxReturnCreated.replace('{year}', year));
      await refetch();
      navigate('/');
    } catch (error) {
      console.error('Error creating tax return:', error);
      toast.error(t.userDashboard.createError);
    } finally {
      setIsCreatingTaxReturn(false);
    }
  };

  const calculateProgress = (year: string): number | null => {
    if (loading) return null;
    const taxReturn = getExistingReturn(year);
    const yearProgress = formProgress[year];
    const yearFormData = formData[year] || [];
    const yearDocuments = uploadedDocuments[year] || [];
    return calculateTaxReturnProgress({
      formData: yearFormData, uploadedDocuments: yearDocuments,
      paymentStatus: taxReturn?.payment_status, workflowStep: taxReturn?.workflow_step,
      status: taxReturn?.status, formProgress: yearProgress?.form_sections
    });
  };

  const getDocumentCount = (year: string): number => uploadedDocuments[year]?.length || 0;

  if ((authLoading || loading || profileLoading || !isReady || taxFilerLoading || !activeTaxFilerId) && !safetyTimeout) return <UserTaxReturnsSkeleton />;
  if (safetyTimeout && profileLoading && taxReturns.length === 0) return <UserTaxReturnsSkeleton />;
  if (isValid && !profileLoading && !userProfile && !safetyTimeout) return <UserTaxReturnsSkeleton />;
  if (hasMultipleFilers && !selectionConfirmed) return <UserTaxReturnsSkeleton />;

  if (!loading && !profileLoading && activeTaxFilerId && taxReturns.length === 0 && !userProfile?.first_name && !userProfile?.terms_accepted_at) {
    return <TaxYearSelector onYearSelect={createNewTaxReturn} isCreating={isCreatingTaxReturn} />;
  }

  const getExistingReturn = (year: string) => taxReturns.find((tr: TaxReturn) => tr.tax_year === year);
  const currentYear = new Date().getFullYear();
  const existingYears = taxReturns.map((tr: TaxReturn) => tr.tax_year);
  const availableYears = [...new Set([...existingYears])].sort((a, b) => parseInt(b) - parseInt(a));
  const isCompleted = (year: string) => {
    const existingReturn = getExistingReturn(year);
    return existingReturn?.status === 'completed' || existingReturn?.status === 'success' || !!completedTaxReturns[year];
  };
  const inProgressYears = availableYears.filter(year => !isCompleted(year));
  const completedYears = availableYears.filter(year => isCompleted(year));
  const unpaidYears = inProgressYears.filter(year => { const tr = getExistingReturn(year); return tr?.payment_status !== 'paid'; });
  const paidInProgressYears = inProgressYears.filter(year => { const tr = getExistingReturn(year); return tr?.payment_status === 'paid'; });
  const getUserDisplayName = () => userProfile?.first_name || null;
  const getGreeting = () => t.userDashboard.greeting;

  return (
    <div
      className="antialiased min-h-screen selection:bg-primary/10 selection:text-foreground pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] text-foreground relative"
      style={{ background: 'hsl(var(--background))' }}
      onTouchStart={pullHandlers.onTouchStart}
      onTouchMove={pullHandlers.onTouchMove}
      onTouchEnd={pullHandlers.onTouchEnd}
    >
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      {/* Main Container */}
      <main className="relative z-10 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* Header — compact */}
        <header className="flex items-center justify-between pb-6">
          <img src={ditaxLogoFull} alt="ditax" className="h-7" />
          <ProfileWithNotifications avatarUrl={userProfile?.avatar_url} firstName={userProfile?.first_name} />
        </header>

        {/* Greeting — tighter */}
        <section className="pb-4">
          <p className="text-sm font-medium text-muted-foreground font-jakarta">{getGreeting()}</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground font-jakarta leading-tight mt-0.5">
            {getUserDisplayName() ?? <span className="inline-block bg-muted rounded-lg animate-pulse w-28 h-7" />}
          </h1>
          <TaxFilerSelector className="mt-3" />
        </section>

        {/* Divider */}
        <div className="h-px bg-border/40 mb-5" />

        {/* Missing Items Alert */}
        <MissingItemsAlert pendingDocuments={pendingDocuments} pendingInformation={pendingInformation} />

        {/* Cards */}
        <div className="flex flex-col gap-5 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">

          {/* ═══════════════════════════════════════════════════ */}
          {/* Active (Unpaid) Tax Returns */}
          {/* ═══════════════════════════════════════════════════ */}
          {unpaidYears.map((year, i) => {
            const progress = calculateProgress(year) ?? 0;
            const documentCount = getDocumentCount(year);
            return (
              <motion.article
                key={year}
                data-tour="tax-year-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(`/form?year=${year}`)}
                className="group relative rounded-[20px] cursor-pointer overflow-hidden bg-card border border-border/40"
                style={{
                  boxShadow: '0 4px 16px -6px hsla(var(--foreground) / 0.07), 0 0 0 0.5px hsla(var(--foreground) / 0.03)',
                }}
              >
                {/* Delete Menu */}
                <div className="absolute top-4 right-4 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/15 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setYearToDelete(year); setDeleteDialogOpen(true); }} className="text-destructive hover:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t.userDashboard.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Hero area with year */}
                <div className="relative h-36 bg-gradient-to-br from-[hsl(222,100%,59%)] to-[hsl(222,100%,46%)] flex items-end p-6 overflow-hidden">
                  {/* Large year as decorative anchor */}
                  <span className="absolute -top-2 -right-3 text-[88px] font-bold text-white/[0.06] leading-none tracking-tighter font-jakarta select-none pointer-events-none">
                    {year}
                  </span>
                  <div className="relative z-10 flex flex-col gap-2.5">
                    <span className="text-[28px] font-bold text-white tracking-tight leading-none font-jakarta">
                      {year}
                    </span>
                    {/* Active badge */}
                    <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-white/12 backdrop-blur-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-semibold text-white/85 uppercase tracking-wider font-jakarta">
                        {t.userDashboard.active}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-foreground font-jakarta tracking-tight">
                      {t.userDashboard.taxReturn}
                    </h2>
                    <p className="text-[13px] text-muted-foreground font-jakarta mt-1.5 leading-relaxed line-clamp-2">
                      {t.userDashboard.activeDescription}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground font-jakarta">Fortschritt</span>
                      <span className="text-xs font-semibold text-foreground font-jakarta tabular-nums">{progress}% abgeschlossen</span>
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium font-jakarta">
                      <span>📄</span>
                      <span>{documentCount === 0 ? 'Noch keine Dokumente' : `${documentCount} ${documentCount === 1 ? 'Dokument' : 'Dokumente'} hochgeladen`}</span>
                    </div>
                    <button className="group/btn inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] pl-4 pr-2 py-2 text-sm font-semibold text-white transition-all shadow-[0_1px_6px_hsl(222,100%,56%,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_3px_12px_hsl(222,100%,56%,0.35)] active:scale-[0.97]">
                      <span className="font-jakarta">{t.userDashboard.continue}</span>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-colors group-hover/btn:bg-white/25">
                        <ArrowRight className="h-3 w-3 stroke-[1.5] transition-transform group-hover/btn:translate-x-0.5" />
                      </div>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}

          {/* ═══════════════════════════════════════════════════ */}
          {/* Paid / Processing Tax Returns */}
          {/* ═══════════════════════════════════════════════════ */}
          {paidInProgressYears.map((year, i) => {
            const taxReturn = getExistingReturn(year);
            const isExpress = taxReturn?.express_service;
            return (
              <motion.article
                key={year}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: (unpaidYears.length + i) * 0.06 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(`/tax-return-tracking/${taxReturn?.id}`)}
                className="group relative rounded-[20px] cursor-pointer overflow-hidden bg-card border border-border/40"
                style={{
                  boxShadow: '0 4px 16px -6px hsla(var(--foreground) / 0.07), 0 0 0 0.5px hsla(var(--foreground) / 0.03)',
                }}
              >
                {/* Hero area */}
                <div className="relative h-36 bg-gradient-to-br from-[hsl(30,100%,60%)] to-[hsl(24,100%,50%)] flex items-end p-6 overflow-hidden">
                  <span className="absolute -top-2 -right-3 text-[88px] font-bold text-white/[0.06] leading-none tracking-tighter font-jakarta select-none pointer-events-none">
                    {year}
                  </span>
                  <div className="relative z-10 flex flex-col gap-2.5">
                    <span className="text-[28px] font-bold text-white tracking-tight leading-none font-jakarta">
                      {year}
                    </span>
                    <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-white/12 backdrop-blur-md">
                      <Clock className="w-3 h-3 text-white/80" strokeWidth={2} />
                      <span className="text-[11px] font-semibold text-white/85 uppercase tracking-wider font-jakarta">
                        {t.userDashboard.processing}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground font-jakarta tracking-tight">
                      {t.userDashboard.taxReturn}
                    </h2>
                    <p className="text-sm text-muted-foreground font-jakarta mt-1 leading-relaxed line-clamp-2">
                      {t.userDashboard.processingDescription}
                    </p>
                  </div>

                  {/* Service info */}
                  <div className="flex items-center gap-2">
                    {isExpress ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/50 text-amber-700 text-xs font-semibold font-jakarta">
                        <Zap className="w-3 h-3" strokeWidth={2} />
                        {t.userDashboard.expressService}
                      </div>
                    ) : (
                      <>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground text-xs font-medium font-jakarta">
                          <Clock className="w-3 h-3" strokeWidth={1.5} />
                          {t.userDashboard.standardService}
                        </div>
                        <span className="text-xs text-primary font-medium font-jakarta bg-primary/8 px-2 py-0.5 rounded-full">
                          {t.userDashboard.upgradeAvailable}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-end pt-1">
                    <button className="group/btn inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-card to-muted border border-border pl-4 pr-2 py-2 text-sm font-semibold text-foreground transition-all shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-[0.97]">
                      <span className="font-jakarta">{t.userDashboard.tracking}</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover/btn:bg-accent">
                        <ArrowRight className="h-3.5 w-3.5 stroke-[1.5] transition-transform group-hover/btn:translate-x-0.5" />
                      </div>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}

          {/* ═══════════════════════════════════════════════════ */}
          {/* Completed Tax Returns */}
          {/* ═══════════════════════════════════════════════════ */}
          {completedYears.map((year, i) => {
            const existingReturn = getExistingReturn(year);
            const completedReturn = completedTaxReturns?.[year];
            const isSigned = completedReturn?.signature_status === 'signed';
            const needsSignature = completedReturn && !isSigned;
            return (
              <motion.article
                key={year}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: (unpaidYears.length + paidInProgressYears.length + i) * 0.06 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  if (completedReturn?.id) navigate(`/tax-return-actions/${completedReturn.id}?year=${year}`);
                }}
                className="group relative rounded-[20px] cursor-pointer overflow-hidden bg-card border border-border/40"
                style={{
                  boxShadow: '0 4px 16px -6px hsla(var(--foreground) / 0.07), 0 0 0 0.5px hsla(var(--foreground) / 0.03)',
                }}
              >
                {/* Hero area */}
                <div className={cn(
                  "relative h-36 flex items-end p-6 overflow-hidden",
                  needsSignature ? "bg-gradient-to-br from-amber-50 to-orange-50" : "bg-muted/30"
                )}>
                  <span className={cn(
                    "absolute -top-2 -right-3 text-[88px] font-bold leading-none tracking-tighter font-jakarta select-none pointer-events-none",
                    needsSignature ? "text-amber-500/[0.07]" : "text-foreground/[0.03]"
                  )}>
                    {year}
                  </span>
                  <div className="relative z-10 flex flex-col gap-2.5">
                    <span className={cn(
                      "text-[28px] font-bold tracking-tight leading-none font-jakarta",
                      needsSignature ? "text-amber-900" : "text-muted-foreground/50"
                    )}>
                      {year}
                    </span>
                    <div className={cn(
                      "inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full",
                      needsSignature
                        ? "bg-amber-100/80 border border-amber-200/50"
                        : "bg-background/80 border border-border/40"
                    )}>
                      {needsSignature ? (
                        <>
                          <PenTool className="w-3 h-3 text-amber-600" strokeWidth={1.5} />
                          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider font-jakarta">
                            {t.userDashboard.signaturePending}
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-jakarta">
                            {t.userDashboard.finished}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={cn(
                        "text-[15px] font-semibold font-jakarta tracking-tight",
                        needsSignature ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {t.userDashboard.taxReturn}
                      </h2>
                      {isSigned && (
                        <div className="text-muted-foreground/40 bg-muted p-0.5 rounded-full">
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm font-jakarta mt-1 leading-relaxed line-clamp-2",
                      needsSignature ? "text-amber-600" : "text-muted-foreground"
                    )}>
                      {needsSignature
                        ? t.userDashboard.signatureRequired
                        : t.userDashboard.decisionFrom.replace('{date}', existingReturn?.updated_at
                          ? new Date(existingReturn.updated_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '–'
                        )
                      }
                    </p>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-1">
                    {needsSignature ? (
                      <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold font-jakarta">
                        <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {t.userDashboard.actionRequired}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium font-jakarta">
                        <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>100%</span>
                      </div>
                    )}

                    {needsSignature ? (
                      <button className="group/btn inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] pl-4 pr-2 py-2 text-sm font-semibold text-white transition-all shadow-[0_2px_8px_hsl(222,100%,56%,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_14px_hsl(222,100%,56%,0.4)] active:scale-[0.97]">
                        <span className="font-jakarta">{t.userDashboard.sign}</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-colors group-hover/btn:bg-white/25">
                          <ArrowRight className="h-3.5 w-3.5 stroke-[1.5] transition-transform group-hover/btn:translate-x-0.5" />
                        </div>
                      </button>
                    ) : (
                      <button className="group/btn inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-card to-muted border border-border pl-4 pr-2 py-2 text-sm font-semibold text-foreground transition-all shadow-[0_2px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-[0.97]">
                        <span className="font-jakarta">{t.userDashboard.details}</span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover/btn:bg-accent">
                          <ExternalLink className="h-3.5 w-3.5 stroke-[1.5]" />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}

          {/* New Year Action Card */}
          {availableYears.length < 7 && (
            <AddTaxYearDropdown onYearSelect={createNewTaxReturn} existingYears={existingYears} isCreating={isCreatingTaxReturn} variant="card" />
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════ */}
      {/* Bottom Navigation Bar */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div
          className="pointer-events-auto flex items-center p-1.5 gap-2 rounded-full"
          style={{
            background: 'hsla(var(--background) / 0.7)',
            backdropFilter: 'blur(40px) saturate(1.8)',
            boxShadow: '0 8px 40px -8px hsla(var(--foreground) / 0.1), 0 0 0 1px hsla(var(--foreground) / 0.06), inset 0 1px 0 0 hsla(0 0% 100% / 0.5)',
          }}
        >
          {/* Scanner Button */}
          <button
            data-tour="floating-document-button"
            onClick={handleDocumentsClick}
            className="flex items-center gap-3 pl-2.5 pr-5 py-2 rounded-full bg-primary border-t border-primary/80 shadow-[0_4px_14px_0_hsla(var(--primary)/0.35)] hover:shadow-[0_6px_20px_hsla(var(--primary)/0.25)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <img src={uploadIcon} alt="Upload" className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold font-jakarta tracking-wide text-white">
                {t.userDashboard.documents}
              </span>
              <span className="block text-[10px] font-medium text-white/80">
                {t.userDashboard.uploadDocuments}
              </span>
            </div>
          </button>

          <div className="w-px h-8 bg-border/40" />

          {/* Inbox */}
          <button
            data-tour="chat-header-icon"
            onClick={() => navigate('/chat')}
            className="p-3 text-muted-foreground rounded-full hover:text-foreground hover:bg-foreground/[0.06] transition-colors relative"
          >
            <Inbox className="w-6 h-6" strokeWidth={1.5} />
            {unreadCount > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />}
          </button>

          {/* Menu */}
          <button onClick={() => setMenuSheetOpen(true)} className="p-3 text-muted-foreground rounded-full hover:text-foreground hover:bg-foreground/[0.06] transition-colors">
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* White Overlay for Transition */}
      <div className={`fixed inset-0 z-[200] pointer-events-none transition-opacity duration-300 ease-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'hsl(var(--background))' }} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.userDashboard.deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.userDashboard.deleteDialogDescription.replace('{year}', yearToDelete || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
            <AlertDialogCancel disabled={isDeleting} className="w-full">
              {t.userDashboard.cancelDelete}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => yearToDelete && handleDeleteTaxYear(yearToDelete)} disabled={isDeleting} className="w-full">
              {isDeleting ? t.userDashboard.deleting : t.userDashboard.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Signature Dialog */}
      {userProfile && unsignedTaxReturn && (
        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          completedTaxReturn={{
            id: unsignedTaxReturn.id,
            tax_year: unsignedTaxReturn.tax_year,
            file_name: unsignedTaxReturn.file_name,
            file_path: unsignedTaxReturn.file_path
          }}
          userProfile={{
            first_name: userProfile.first_name || '',
            last_name: userProfile.last_name || '',
            email: userProfile.email || '',
            date_of_birth: userProfile.date_of_birth || undefined
          }}
          onSignatureComplete={() => { refetch(); setSignatureDialogOpen(false); }}
        />
      )}
    </div>
  );
};

export default UserTaxReturns;
