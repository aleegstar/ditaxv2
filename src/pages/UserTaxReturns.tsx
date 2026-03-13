import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Menu, ChevronRight, Check, ExternalLink, Inbox, Trash2, MoreVertical, PenTool, Clock, Zap } from 'lucide-react';
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
  const {
    setMenuSheetOpen
  } = useSidebar();
  const {
    profile: userProfile,
    loading: profileLoading
  } = useProfile();
  const {
    userId,
    isValid,
    isLoading: authLoading
  } = useAuthValidation();
  const { activeTaxFilerId, hasMultipleFilers, selectionConfirmed, confirmSelection, isLoading: taxFilerLoading } = useTaxFiler();
  const {
    taxReturns,
    formProgress,
    formData,
    uploadedDocuments,
    completedTaxReturns,
    definitiveTaxBills,
    supportTickets,
    loading,
    error,
    refetch
  } = useTaxYearData(userId, activeTaxFilerId);
  const {
    forceTour
  } = useOnboardingTour();
  const {
    unreadCount
  } = useUnreadMessages();
  const {
    pendingDocuments,
    pendingInformation
  } = usePendingMissingItemsCount(userId);
  
  // Pull-to-refresh for mobile
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);
  
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 60,
    maxPullDistance: 100
  });
  
  useEffect(() => {
    if (authLoading) return;
    if (!isValid || !userId) {
      navigate('/auth');
      return;
    }
    // Redirect to person selection if multiple filers exist and no selection confirmed
    if (hasMultipleFilers && !selectionConfirmed) {
      navigate('/select-person', { replace: true });
      return;
    }
  }, [userId, isValid, authLoading, navigate, hasMultipleFilers, selectionConfirmed]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
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

  // Safety timeout to prevent infinite skeleton loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.warn('UserTaxReturns: Safety timeout after 8s');
      setSafetyTimeout(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Reset when loading resolves normally
  useEffect(() => {
    if (!authLoading && !loading && !profileLoading && !taxFilerLoading) {
      setSafetyTimeout(false);
    }
  }, [authLoading, loading, profileLoading, taxFilerLoading]);

  // Find the first unsigned completed tax return
  const unsignedTaxReturn = useMemo(() => {
    const completedYearsWithData = Object.entries(completedTaxReturns || {});
    for (const [year, data] of completedYearsWithData) {
      if (data && data.signature_status !== 'signed') {
        return data;
      }
    }
    return null;
  }, [completedTaxReturns]);

  // Auto-open signature dialog when there's an unsigned tax return
  useEffect(() => {
    if (unsignedTaxReturn && isReady && userProfile && !signatureDialogOpen) {
      // Small delay to ensure page is fully rendered
      const timer = setTimeout(() => {
        setSignatureDialogOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [unsignedTaxReturn, isReady, userProfile]);
  const handleDeleteTaxYear = async (year: string) => {
    if (!userId) return;
    setIsDeleting(true);
    try {
      const taxReturn = taxReturns.find((tr: TaxReturn) => tr.tax_year === year);
      if (!taxReturn) {
        toast.error(t.userDashboard.taxReturnNotFound);
        return;
      }

      // Delete associated data for the specific tax filer
      await supabase.from('form_data').delete().eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId);
      await supabase.from('form_progress').delete().eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId);
      await supabase.from('uploaded_documents').delete().eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId);

      // Delete the tax return
      const {
        error
      } = await supabase.from('tax_returns').delete().eq('id', taxReturn.id);
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
      // Force cleanup of any lingering dialog overlays (Android WebView issue)
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
        document.querySelectorAll('[data-radix-portal]').forEach(el => {
          if (el.children.length === 0) el.remove();
        });
      }, 300);
    }
  };
  const handleDocumentsClick = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate('/documents?transition=true');
    }, 600);
  }, [navigate]);
  useEffect(() => {
    if (!loading && !authLoading && !profileLoading && !taxFilerLoading && activeTaxFilerId && !isReady) {
      setIsReady(true);
    }
  }, [loading, authLoading, profileLoading, taxFilerLoading, activeTaxFilerId, isReady]);
  const createNewTaxReturn = async (year: string) => {
    if (!userId) return;
    setIsCreatingTaxReturn(true);
    try {
      const {
        data: existingReturn
      } = await supabase.from('tax_returns').select('id').eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId).maybeSingle();
      if (existingReturn) {
        toast.info(t.userDashboard.taxReturnExists.replace('{year}', year));
        await refetch();
        setIsCreatingTaxReturn(false);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('tax_returns').insert({
        user_id: userId,
        tax_filer_id: activeTaxFilerId,
        tax_year: year,
        status: 'pending',
        payment_status: 'pending',
        workflow_step: 'data_collection'
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
      formData: yearFormData,
      uploadedDocuments: yearDocuments,
      paymentStatus: taxReturn?.payment_status,
      workflowStep: taxReturn?.workflow_step,
      status: taxReturn?.status,
      formProgress: yearProgress?.form_sections
    });
  };
  const getDocumentCount = (year: string): number => {
    return uploadedDocuments[year]?.length || 0;
  };
  if ((authLoading || loading || profileLoading || !isReady || taxFilerLoading || !activeTaxFilerId) && !safetyTimeout) {
    return <UserTaxReturnsSkeleton />;
  }

  // If safety timeout fired but profile still loading with no tax returns,
  // keep showing skeleton to prevent false consent screen
  if (safetyTimeout && profileLoading && taxReturns.length === 0) {
    return <UserTaxReturnsSkeleton />;
  }

  // Guard: valid session but profile not yet loaded → keep skeleton visible
  // prevents "Benutzer" fallback from flashing during auth/profile race condition
  if (isValid && !profileLoading && !userProfile && !safetyTimeout) {
    return <UserTaxReturnsSkeleton />;
  }

  // Also show skeleton while redirecting to select-person
  if (hasMultipleFilers && !selectionConfirmed) {
    return <UserTaxReturnsSkeleton />;
  }

  // Only show TaxYearSelector for truly new users who haven't completed onboarding yet.
  // Use first_name as the indicator: it's set during WelcomeFlow and reliably shows
  // that the user already went through the consent/name flow. Previously used
  // onboarding_tour_completed which stays false after WelcomeFlow, causing the
  // consent page to flash for existing users on navigation or filer-switch.
  if (!loading && !profileLoading && activeTaxFilerId && taxReturns.length === 0 && !userProfile?.first_name && !userProfile?.terms_accepted_at) {
    return <TaxYearSelector onYearSelect={createNewTaxReturn} isCreating={isCreatingTaxReturn} />;
  }
  const getExistingReturn = (year: string) => {
    return taxReturns.find((tr: TaxReturn) => tr.tax_year === year);
  };
  const currentYear = new Date().getFullYear();
  const existingYears = taxReturns.map((tr: TaxReturn) => tr.tax_year);
  const availableYears = [...new Set([...existingYears])].sort((a, b) => parseInt(b) - parseInt(a));
  const isCompleted = (year: string) => {
    const existingReturn = getExistingReturn(year);
    return existingReturn?.status === 'completed' || existingReturn?.status === 'success' || !!completedTaxReturns[year];
  };
  const inProgressYears = availableYears.filter(year => !isCompleted(year));
  const completedYears = availableYears.filter(year => isCompleted(year));

  // Split in-progress years into unpaid and paid (processing)
  const unpaidYears = inProgressYears.filter(year => {
    const taxReturn = getExistingReturn(year);
    return taxReturn?.payment_status !== 'paid';
  });
  const paidInProgressYears = inProgressYears.filter(year => {
    const taxReturn = getExistingReturn(year);
    return taxReturn?.payment_status === 'paid';
  });
  const getUserDisplayName = () => {
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    return null;
  };
  const getGreeting = () => {
    return t.userDashboard.greeting;
  };
  return <div 
    className="antialiased min-h-screen selection:bg-primary/10 selection:text-foreground pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] text-foreground relative overflow-hidden bg-[#f0f2f5]"
    onTouchStart={pullHandlers.onTouchStart}
    onTouchMove={pullHandlers.onTouchMove}
    onTouchEnd={pullHandlers.onTouchEnd}
  >
      {/* Subtle background glow effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-10 -left-10 w-60 h-60 bg-purple-100/30 blur-3xl rounded-full" />
        <div className="absolute top-1/3 -right-10 w-72 h-72 bg-blue-100/30 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-rose-100/20 blur-3xl rounded-full" />
      </div>


      {/* Pull-to-Refresh Indicator */}
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      
      {/* Main Container */}
      <main className="relative z-10 min-h-screen sm:px-6 lg:px-8 max-w-7xl mr-auto ml-auto pt-6 pr-4 pl-4">
        {/* Header */}
        <header className="flex pb-8 items-center justify-between">
          <div className="flex items-center">
            {/* Logo */}
            <img src={ditaxLogoFull} alt="ditax" className="h-8" />
          </div>

          {/* Profile with Notifications */}
          <ProfileWithNotifications avatarUrl={userProfile?.avatar_url} firstName={userProfile?.first_name} />
        </header>

        {/* Greeting Section */}
        <section className="pb-6">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-muted-foreground font-jakarta text-sm">
              {getGreeting()}
            </p>
            <h1 className="text-foreground font-medium tracking-[-0.02em] font-jakarta leading-none text-2xl">
              {getUserDisplayName() ?? (
                <span className="inline-block bg-muted rounded-md animate-pulse w-28 h-7" />
              )}
            </h1>
          </div>
          
          {/* Tax Filer Selector - shows if multiple persons exist */}
          <TaxFilerSelector className="mt-4" />
        </section>

        {/* Missing Items Alert */}
        <MissingItemsAlert
          pendingDocuments={pendingDocuments} 
          pendingInformation={pendingInformation} 
        />

        {/* Outer Glass Container */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-[3rem] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white relative overflow-hidden">
          {/* Subtle background glow effects */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-[3rem] z-0">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-100/40 blur-3xl rounded-full" />
            <div className="absolute top-1/2 -right-10 w-48 h-48 bg-blue-100/40 blur-3xl rounded-full" />
          </div>

          {/* Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Unpaid In-Progress Tax Returns (Active Style - leads to form) */}
          {unpaidYears.map(year => {
          const progress = calculateProgress(year) ?? 0;
          const documentCount = getDocumentCount(year);
          return <motion.article
                key={year}
                data-tour="tax-year-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => navigate(`/form?year=${year}`)}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-indigo-100/70 via-white/40 to-rose-100/60 shadow-sm border border-white/80 backdrop-blur-md min-h-[14rem] justify-between cursor-pointer transition-all duration-300 hover:shadow-md"
              >
                {/* Glass sphere details */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/50 blur-2xl rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 -left-4 w-20 h-20 bg-blue-100/30 blur-xl rounded-full pointer-events-none" />

                {/* Delete Menu */}
                <div className="absolute top-4 right-4 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-foreground/40 hover:text-foreground hover:bg-white/40 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => {
                    e.stopPropagation();
                    setYearToDelete(year);
                    setDeleteDialogOpen(true);
                  }} className="text-destructive hover:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t.userDashboard.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">{year}</h2>
                </div>

                <div className="relative z-10 flex flex-col gap-5 mt-8">
                  {/* Progress Section */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <span className="text-base font-medium text-foreground/60">{t.userDashboard.taxReturn}</span>
                      <span className="text-sm font-medium text-foreground/50">{progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden backdrop-blur-sm border border-white/40 shadow-inner">
                      <div className="h-full bg-foreground rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Button */}
                  <div className="flex mt-1">
                    <button className="bg-white/90 backdrop-blur-md hover:bg-white text-foreground font-medium text-base py-2.5 px-5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/60 transition-all active:scale-[0.98] flex items-center gap-2">
                      <span>{t.userDashboard.continue}</span>
                      <ChevronRight className="w-4 h-4 text-foreground/40" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </motion.article>;
        })}

          {/* Paid In-Progress Tax Returns (Processing Style - leads to tracking) */}
          {paidInProgressYears.map(year => {
          const taxReturn = getExistingReturn(year);
          const isExpress = taxReturn?.express_service;
          return <motion.article
                key={year}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => navigate(`/tax-return-tracking/${taxReturn?.id}`)}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-indigo-100/70 via-white/40 to-rose-100/60 shadow-sm border border-white/80 backdrop-blur-md min-h-[14rem] justify-between cursor-pointer transition-all duration-300 hover:shadow-md"
              >
                {/* Glass sphere details */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/50 blur-2xl rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 -left-4 w-20 h-20 bg-blue-100/30 blur-xl rounded-full pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between">
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">{year}</h2>
                  <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm border border-white/40 px-3 py-1.5 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-foreground/50" strokeWidth={2} />
                    <span className="text-xs font-semibold text-foreground/60 tracking-wide uppercase">
                      {t.userDashboard.processing}
                    </span>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col gap-5 mt-8">
                  <p className="text-foreground/60 text-sm leading-relaxed">
                    {t.userDashboard.processingDescription}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isExpress ? <div className="flex items-center gap-1.5 text-foreground/70 font-medium text-sm">
                          <Zap className="w-4 h-4" strokeWidth={1.5} />
                          <span>{t.userDashboard.expressService}</span>
                        </div> : <div className="flex items-center gap-1.5 text-foreground/50 font-medium text-sm">
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          <span>{t.userDashboard.standardService}</span>
                        </div>}
                    </div>

                    <button className="bg-white/90 backdrop-blur-md hover:bg-white text-foreground font-medium text-base py-2.5 px-5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/60 transition-all active:scale-[0.98] flex items-center gap-2">
                      <span>{t.userDashboard.tracking}</span>
                      <ChevronRight className="w-4 h-4 text-foreground/40" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </motion.article>;
        })}

          {/* Completed Tax Returns (Archived Style) */}
          {completedYears.map(year => {
          const existingReturn = getExistingReturn(year);
          const completedReturn = completedTaxReturns?.[year];
          const isSigned = completedReturn?.signature_status === 'signed';
          const needsSignature = completedReturn && !isSigned;
          return <motion.article
                key={year}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                  if (completedReturn?.id) {
                    navigate(`/tax-return-actions/${completedReturn.id}?year=${year}`);
                  }
                }}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-indigo-100/70 via-white/40 to-rose-100/60 shadow-sm border border-white/80 backdrop-blur-md min-h-[14rem] justify-between cursor-pointer transition-all duration-300 hover:shadow-md"
              >
                {/* Glass sphere details */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/50 blur-2xl rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 -left-4 w-20 h-20 bg-blue-100/30 blur-xl rounded-full pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between">
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">{year}</h2>
                  <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm border border-white/40 px-3 py-1.5 rounded-full">
                    {needsSignature ? <>
                        <PenTool className="w-3.5 h-3.5 text-foreground/70" strokeWidth={1.5} />
                        <span className="text-xs font-semibold text-foreground/70 tracking-wide uppercase">
                          {t.userDashboard.signaturePending}
                        </span>
                      </> : <>
                        <Check className="w-3.5 h-3.5 text-foreground/50" strokeWidth={1.5} />
                        <span className="text-xs font-semibold text-foreground/50 tracking-wide uppercase">
                          {t.userDashboard.finished}
                        </span>
                      </>}
                  </div>
                </div>

                <div className="relative z-10 flex flex-col gap-5 mt-8">
                  <p className="text-foreground/60 text-sm leading-relaxed">
                    {needsSignature ? t.userDashboard.signatureRequired : t.userDashboard.decisionFrom.replace('{date}', existingReturn?.updated_at ? new Date(existingReturn.updated_at).toLocaleDateString('de-CH', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }) : '–')}
                  </p>

                  {/* Button */}
                  <div className="flex mt-1">
                    <button className={`backdrop-blur-md font-medium text-base py-2.5 px-5 rounded-full transition-all active:scale-[0.98] flex items-center gap-2 ${needsSignature ? 'bg-foreground text-background shadow-[0_4px_14px_rgba(0,0,0,0.15)]' : 'bg-white/90 hover:bg-white text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/60'}`}>
                      <span>{needsSignature ? t.userDashboard.sign : t.userDashboard.details}</span>
                      <ExternalLink className="w-4 h-4 opacity-40" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </motion.article>;
        })}

          {/* New Year Action Card */}
          {availableYears.length < 7 && <AddTaxYearDropdown onYearSelect={createNewTaxReturn} existingYears={existingYears} isCreating={isCreatingTaxReturn} variant="card" />}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div
          className="pointer-events-auto flex items-center p-1.5 gap-2 rounded-full bg-card border border-border shadow-lg"
        >
          {/* Scanner Button */}
          <button data-tour="floating-document-button" onClick={handleDocumentsClick} className="flex items-center gap-3 pl-2.5 pr-5 py-2 rounded-full border-t border-white/10 shadow-[0_4px_14px_0_rgba(0,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group" style={{ background: 'linear-gradient(to bottom, hsl(220, 15%, 22%), hsl(220, 15%, 16%))' }}>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <img src={uploadIcon} alt="Upload" className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold font-jakarta tracking-wide" style={{ color: 'hsl(0 0% 100%)' }}>
                {t.userDashboard.documents}
              </span>
              <span className="block text-[10px] font-medium" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>
                {t.userDashboard.uploadDocuments}
              </span>
            </div>
          </button>

          <div className="w-px h-8 bg-border/40"></div>

          {/* Inbox */}
          <button data-tour="chat-header-icon" onClick={() => navigate('/chat')} className="p-3 text-muted-foreground rounded-full hover:text-foreground hover:bg-foreground/[0.06] transition-colors relative">
            <Inbox className="w-6 h-6" strokeWidth={1.5} />
            {unreadCount > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-destructive rounded-full ring-2 ring-background"></span>}
          </button>

          {/* Menu */}
          <button onClick={() => setMenuSheetOpen(true)} className="p-3 text-muted-foreground rounded-full hover:text-foreground hover:bg-foreground/[0.06] transition-colors">
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* White Overlay for Transition */}
      <div className={`fixed inset-0 z-[200] pointer-events-none transition-opacity duration-300 ease-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`} style={{
      backgroundColor: 'hsl(var(--background))'
    }} />

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
            <AlertDialogCancel disabled={isDeleting} className="w-full bg-background hover:bg-muted border border-border font-medium h-12 rounded-full text-foreground">
              {t.userDashboard.cancelDelete}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => yearToDelete && handleDeleteTaxYear(yearToDelete)} disabled={isDeleting} className="w-full h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 rounded-full font-medium">
              {isDeleting ? t.userDashboard.deleting : t.userDashboard.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Signature Dialog - auto-opens when signature is pending */}
      {userProfile && unsignedTaxReturn && <SignatureDialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen} completedTaxReturn={{
      id: unsignedTaxReturn.id,
      tax_year: unsignedTaxReturn.tax_year,
      file_name: unsignedTaxReturn.file_name,
      file_path: unsignedTaxReturn.file_path
    }} userProfile={{
      first_name: userProfile.first_name || '',
      last_name: userProfile.last_name || '',
      email: userProfile.email || '',
      date_of_birth: userProfile.date_of_birth || undefined
    }} onSignatureComplete={() => {
      refetch();
      setSignatureDialogOpen(false);
    }} />}
    </div>;
};
export default UserTaxReturns;