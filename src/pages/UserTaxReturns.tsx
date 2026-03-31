import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Plus, Menu, ChevronRight, Check, ExternalLink, Inbox, Trash2, MoreVertical, PenTool, Clock, Zap, Home } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
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
    navigate('/documents');
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
    className="antialiased min-h-screen selection:bg-primary/10 selection:text-foreground pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] text-foreground relative overflow-hidden"
    onTouchStart={pullHandlers.onTouchStart}
    onTouchMove={pullHandlers.onTouchMove}
    onTouchEnd={pullHandlers.onTouchEnd}
  >

      {/* Pull-to-Refresh Indicator */}
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      
      {/* Main Container */}
      <main className="relative z-10 min-h-screen max-w-3xl mx-auto pt-6 px-4 md:px-8">
        {/* Header */}
        <header className="flex pb-8 items-center justify-between">
          <div className="flex items-center">
            <img src={ditaxLogoFull} alt="ditax" className="h-8" />
          </div>
          <ProfileWithNotifications avatarUrl={userProfile?.avatar_url} firstName={userProfile?.first_name} />
        </header>

        {/* Greeting Section */}
        <section className="pb-8">
          <div className="flex flex-col gap-1 mb-4">
            <p className="text-lg md:text-xl text-muted-foreground font-normal">
              {getGreeting()}
            </p>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-tight">
              {getUserDisplayName() ?? (
                <span className="inline-block bg-muted rounded-md animate-pulse w-32 h-10" />
              )}
            </h1>
          </div>
          
          {/* Tax Filer Selector */}
          <TaxFilerSelector className="mt-2" />
        </section>

        {/* Missing Items Alert */}
        <MissingItemsAlert
          pendingDocuments={pendingDocuments} 
          pendingInformation={pendingInformation} 
        />

        {/* Cards - Timeline Layout */}
        <div className="flex flex-col gap-5">
          {/* Unpaid In-Progress Tax Returns */}
          {unpaidYears.map((year, index) => {
            const progress = calculateProgress(year) ?? 0;
            const yearProgressSections = formProgress[year]?.form_sections;
            const yearFormDataItems = formData[year] || [];
            
            // Helper: check completion from form_progress.form_sections OR form_data records
            const isSectionDone = (sectionKey: string, formType: string) => {
              // Check form_sections first
              if (yearProgressSections?.[sectionKey]) return true;
              // Fallback: check if form_data has a record with _completed flag
              const record = yearFormDataItems.find((r: any) => r.form_type === formType);
              if (record?.data?._completed) return true;
              // For non-multistep sections, existence of form_data record means done
              if (record && !['income', 'assets', 'deductions', 'contactInfo'].includes(formType)) return true;
              return false;
            };
            
            const hasDocuments = (uploadedDocuments[year] || []).length > 0;
            
            const steps = [
              { label: 'Angaben', done: isSectionDone('contactInfo', 'contactInfo') },
              { label: 'Einkommen', done: isSectionDone('income', 'income') },
              { label: 'Abzüge', done: isSectionDone('deductions', 'deductions') },
              { label: 'Vermögen', done: isSectionDone('assets', 'assets') },
              { label: 'Belege', done: hasDocuments || isSectionDone('documents', 'documents') },
              { label: 'Zahlung', done: false },
            ];
            const completedSteps = steps.filter(s => s.done).length;
            // Find the next incomplete step
            const nextStep = steps.find(s => !s.done);
            const nextStepIndex = nextStep ? steps.indexOf(nextStep) : -1;
            const nextStepLabel = nextStep?.label || '';
            
            // Map step labels to navigation routes
            const getStepRoute = (label: string) => {
              switch (label) {
                case 'Angaben': return `/form?year=${year}&section=kontakt`;
                case 'Einkommen': return `/form?year=${year}&section=einkommen`;
                case 'Abzüge': return `/form?year=${year}&section=abzuege`;
                case 'Vermögen': return `/form?year=${year}&section=vermoegen`;
                case 'Belege': return `/form?year=${year}&section=unterlagen`;
                case 'Zahlung': return `/payment?year=${year}`;
                default: return `/form?year=${year}`;
              }
            };

            return <motion.div
              key={year}
              data-tour="tax-year-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative mb-4"
            >
              {/* Background next-step card (peeks out below) */}
              {nextStep && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(getStepRoute(nextStepLabel));
                  }}
                  className="absolute bottom-0 left-3 right-3 translate-y-10 z-0 rounded-[1.5rem] px-6 pt-8 pb-5 cursor-pointer transition-all duration-200 hover:translate-y-12 border border-white/50 shadow-[0_12px_32px_rgba(0,0,0,0.08)]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.45) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{nextStepIndex + 1}</span>
                      </div>
                      <div>
                        <span className="text-[13px] font-semibold text-foreground">
                          Nächster Schritt: {nextStepLabel}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                  </div>
                </div>
              )}

              {/* Main Card */}
              <div 
                onClick={() => navigate(`/form?year=${year}`)}
                className="relative z-10 bg-gradient-to-br from-white/70 to-white/30 backdrop-blur-2xl backdrop-saturate-200 rounded-[2rem] p-7 md:p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60 transition-all duration-300 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)] cursor-pointer"
              >

                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t.userDashboard.taxReturn}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-white/40 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        setYearToDelete(year);
                        setDeleteDialogOpen(true);
                      }} className="text-red-600 hover:text-red-700">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t.common.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Year */}
                <h2 className="text-4xl font-semibold tracking-tight text-foreground mb-3">
                  {year}
                </h2>

                {/* Description */}
                <p className="text-[15px] text-muted-foreground mb-5 leading-relaxed">
                  {completedSteps === 0 
                    ? 'Beginne damit deine Angaben zu erfassen.'
                    : `${completedSteps} von ${steps.length} Schritten erledigt.`
                  }
                </p>

                {/* Progress Steps */}
                <div className="flex gap-1.5 mb-8">
                  {steps.map((step, i) => (
                    <div key={i} className={cn(
                      "flex-1 h-1.5 rounded-full transition-all duration-500",
                      step.done ? "bg-primary" : "bg-muted"
                    )} />
                  ))}
                </div>

                {/* Action */}
                <div className="flex items-center justify-between">
                  <Button>
                    {completedSteps === 0 ? 'Starten' : 'Fortsetzen'}
                  </Button>
                </div>
              </div>
            </motion.div>;
          })}

          {/* Paid In-Progress Tax Returns (Processing) */}
          {paidInProgressYears.map(year => {
            const taxReturn = getExistingReturn(year);
            const isExpress = taxReturn?.express_service;
            return <motion.article
              key={year}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => navigate(`/tax-return-tracking/${taxReturn?.id}`)}
              className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/70 to-white/30 backdrop-blur-2xl backdrop-saturate-200 p-7 md:p-9 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60 cursor-pointer transition-all duration-300 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)]"
            >

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <span className="bg-muted text-muted-foreground text-sm font-medium px-3 py-1 rounded-full">
                      {year}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-base text-muted-foreground font-normal">
                        {t.userDashboard.processing}
                      </span>
                    </div>
                    {isExpress && <div className="flex items-center gap-1 text-muted-foreground">
                      <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span className="text-xs font-medium">{t.userDashboard.expressService}</span>
                    </div>}
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground mb-4 leading-tight">
                  {t.userDashboard.processingDescription}
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  Deine Steuererklärung wird von unserem Team bearbeitet. Du wirst benachrichtigt, sobald sie fertig ist.
                </p>

                <div className="flex flex-wrap items-center gap-6">
                  <Button className="px-6 py-3 text-sm w-full sm:w-auto">
                    {t.userDashboard.tracking}
                  </Button>
                </div>
              </div>
            </motion.article>;
          })}

          {/* Completed Tax Returns */}
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
              className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/70 to-white/30 backdrop-blur-2xl backdrop-saturate-200 p-7 md:p-9 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60 cursor-pointer transition-all duration-300 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)]"
            >

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <span className="bg-muted text-muted-foreground text-sm font-medium px-3 py-1 rounded-full">
                      {year}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {needsSignature ? <>
                        <PenTool className="w-4 h-4 text-foreground/70" strokeWidth={1.5} />
                        <span className="text-base text-foreground/70 font-normal">
                          {t.userDashboard.signaturePending}
                        </span>
                      </> : <>
                        <Check className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                        <span className="text-base text-muted-foreground font-normal">
                          {t.userDashboard.finished}
                        </span>
                      </>}
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground mb-4 leading-tight">
                  {needsSignature ? t.userDashboard.signatureRequired : `Steuererklärung ${year}`}
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  {needsSignature 
                    ? 'Bitte unterschreibe deine Steuererklärung, um den Prozess abzuschliessen.' 
                    : t.userDashboard.decisionFrom.replace('{date}', existingReturn?.updated_at ? new Date(existingReturn.updated_at).toLocaleDateString('de-CH', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : '–')}
                </p>

                <div className="flex flex-wrap items-center gap-6">
                  <button className={`px-8 py-3.5 rounded-full text-lg font-medium transition-all w-full sm:w-auto text-center ${needsSignature ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}>
                    {needsSignature ? t.userDashboard.sign : t.userDashboard.details}
                  </button>
                </div>
              </div>
            </motion.article>;
          })}

          {/* New Year Action Card */}
          {availableYears.length < 7 && <AddTaxYearDropdown onYearSelect={createNewTaxReturn} existingYears={existingYears} isCreating={isCreatingTaxReturn} variant="card" />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center items-center gap-3 pointer-events-none">
        {/* Navigation Pill */}
        <nav className="pointer-events-auto inline-flex items-center gap-1 rounded-full p-2 backdrop-blur-xl bg-slate-900/90 border border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          {/* Home - Active */}
          <button className="text-white rounded-full px-5 py-2.5 transition-all active:scale-95 flex items-center justify-center">
            <Home className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Inbox */}
          <button data-tour="chat-header-icon" onClick={() => navigate('/chat')} className="text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full px-4 py-2.5 transition-all active:scale-95 flex items-center justify-center relative">
            <Inbox className="w-5 h-5" strokeWidth={1.5} />
            {unreadCount > 0 && <span className="absolute top-1.5 right-2.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-slate-900"></span>}
          </button>

          {/* Menu */}
          <button onClick={() => setMenuSheetOpen(true)} className="text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full px-4 py-2.5 transition-all active:scale-95 flex items-center justify-center">
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </nav>

        {/* Floating Action Button - Documents */}
        <button data-tour="floating-document-button" onClick={handleDocumentsClick} className="pointer-events-auto bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_8px_30px_hsl(222,100%,50%/0.3)] hover:shadow-[0_12px_40px_hsl(222,100%,50%/0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all">
          <Plus className="w-6 h-6" strokeWidth={1.5} />
        </button>
      </div>

      {/* White Overlay for Transition */}
      <div className={`fixed inset-0 z-[200] pointer-events-none transition-opacity duration-300 ease-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`} style={{
      backgroundColor: 'hsl(var(--background))'
    }} />

      {/* Delete Confirmation Bottom Sheet */}
      <Drawer open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg px-6 pb-8">
            <DrawerHeader className="text-center pt-6 pb-2">
              <DrawerTitle className="text-xl font-semibold">{t.userDashboard.deleteDialogTitle}</DrawerTitle>
              <DrawerDescription className="text-muted-foreground mt-2">
                {t.userDashboard.deleteDialogDescription.replace('{year}', yearToDelete || '')}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="flex flex-col gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="w-full"
              >
                {t.userDashboard.cancelDelete}
              </Button>
              <Button
                variant="destructive"
                onClick={() => yearToDelete && handleDeleteTaxYear(yearToDelete)}
                disabled={isDeleting}
                className="w-full"
              >
                {isDeleting ? t.userDashboard.deleting : t.userDashboard.delete}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

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