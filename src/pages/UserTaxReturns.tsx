import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Plus, Menu, ChevronRight, Check, ExternalLink, Inbox, Trash2, MoreVertical, PenTool, Clock, Zap, Home, FileCheck2, CreditCard, ArrowRight } from 'lucide-react';
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
        <header className="flex pb-6 items-center justify-between">
          <div className="flex items-center">
            <img src={ditaxLogoFull} alt="ditax" className="h-8" />
          </div>
          <ProfileWithNotifications avatarUrl={userProfile?.avatar_url} firstName={userProfile?.first_name} />
        </header>

        {/* Greeting Section */}
        <section className="pb-6">
          <div className="flex flex-col gap-0.5 mb-3">
            <p className="text-base text-muted-foreground font-normal">
              {getGreeting()}
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-tight">
              {getUserDisplayName() ?? (
                <span className="inline-block bg-muted rounded-md animate-pulse w-32 h-9" />
              )}
            </h1>
          </div>
          
          {/* Tax Filer Selector */}
          <TaxFilerSelector className="mt-1.5" />
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
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative"
            >
              {/* Main Card */}
              <div 
                onClick={() => navigate(`/form?year=${year}`)}
                className="relative z-10 rounded-[2rem] overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.98]"
                style={{
                  background: 'rgba(255, 255, 255, 0.40)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.60)',
                }}
              >
                {/* Content container */}
                <div className="p-8 sm:p-10">
                  {/* Header: Icon + Title + Menu */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-[18px] flex items-center justify-center text-primary"
                        style={{
                          background: 'rgba(255, 255, 255, 0.50)',
                          border: '1px solid rgba(255, 255, 255, 0.60)',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <FileCheck2 className="w-6 h-6" strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[16px] font-semibold text-foreground tracking-tight">
                          Steuererklärung
                        </span>
                        <span className="text-[14px] font-medium text-muted-foreground">
                          Jahr {year}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-white/40 rounded-full -mr-2">
                          <MoreVertical className="h-5 w-5" strokeWidth={1.5} />
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

                  {/* Title & Status */}
                  <div className="mb-10 flex flex-col gap-2">
                    <div className="flex items-end justify-between">
                      <h2 className="text-3xl sm:text-4xl tracking-tight text-foreground font-medium leading-none">
                        {completedSteps === 0 
                          ? 'Loslegen!'
                          : completedSteps === steps.length 
                            ? 'Fertig!'
                            : 'Fast geschafft!'
                        }
                      </h2>
                      <span className="text-2xl text-primary tracking-tight font-medium">
                        {Math.round((completedSteps / steps.length) * 100)}%
                      </span>
                    </div>
                    <p className="text-[16px] font-medium text-muted-foreground">
                      {completedSteps === 0 
                        ? 'Beginne damit deine Angaben zu erfassen.'
                        : `${completedSteps} von ${steps.length} Schritten erfolgreich abgeschlossen.`
                      }
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex gap-1.5 mb-10">
                    {steps.map((step, i) => (
                      <div 
                        key={i} 
                        className="flex-1 h-2.5 rounded-full transition-all duration-500"
                        style={i < completedSteps ? {
                          background: 'hsl(var(--primary))',
                          boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.4), 0 0 6px hsl(var(--primary) / 0.4)',
                        } : {
                          background: 'rgba(255, 255, 255, 0.30)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.60)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-8 sm:p-10 rounded-b-[2rem]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.20)',
                    backdropFilter: 'blur(12px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.40)',
                  }}
                >
                  <div className="flex items-center gap-3 order-2 sm:order-1 justify-center sm:justify-start">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground"
                      style={{
                        background: 'rgba(255, 255, 255, 0.50)',
                        border: '1px solid rgba(255, 255, 255, 0.60)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      <CreditCard className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <span className="text-[15px] font-medium text-muted-foreground">
                      {nextStep ? `Nächstes: ${nextStepLabel}` : 'Alle Schritte erledigt'}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (nextStep) {
                        navigate(getStepRoute(nextStepLabel));
                      } else {
                        navigate(`/form?year=${year}`);
                      }
                    }}
                    className="group inline-flex order-1 sm:order-2 items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-7 py-3.5 rounded-2xl text-[16px] font-semibold transition-all active:scale-[0.96] w-full sm:w-auto shadow-md shadow-black/5"
                  >
                    {completedSteps === 0 ? 'Jetzt starten' : 'Weiter ausfüllen'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </motion.div>;
          })}

          {/* Paid In-Progress Tax Returns (Processing) */}
          {paidInProgressYears.map(year => {
            const taxReturn = getExistingReturn(year);
            const isExpress = taxReturn?.express_service;
            return <motion.div
              key={year}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative"
            >
              <div 
                onClick={() => navigate(`/tax-return-tracking/${taxReturn?.id}`)}
                className="relative z-10 rounded-[2rem] overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.98] p-8 sm:p-10"
                style={{
                  background: 'rgba(255, 255, 255, 0.40)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.60)',
                }}
              >
                {/* Year + Status Badges */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[16px] font-semibold text-foreground tracking-tight">{year}</span>
                  <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.8} />
                    <span className="text-xs font-medium text-amber-700">
                      {t.userDashboard.processing}
                    </span>
                  </div>
                  {isExpress && (
                    <div className="flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full">
                      <Zap className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
                      <span className="text-xs font-medium text-primary">{t.userDashboard.expressService}</span>
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <h2 className="text-xl font-semibold tracking-tight text-foreground leading-tight mb-2">
                  Deine Steuererklärung wird aktuell erstellt.
                </h2>
                <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
                  Deine Steuererklärung wird von unserem Team bearbeitet. Du wirst benachrichtigt, sobald sie fertig ist.
                </p>

                {/* Tracking Button */}
                <Button className="w-full sm:w-auto">
                  {t.userDashboard.tracking}
                  <ChevronRight className="w-4 h-4 ml-1" strokeWidth={2} />
                </Button>
              </div>
            </motion.div>;
          })}

          {/* Completed Tax Returns */}
          {completedYears.map(year => {
            const existingReturn = getExistingReturn(year);
            const completedReturn = completedTaxReturns?.[year];
            const isSigned = completedReturn?.signature_status === 'signed';
            const needsSignature = completedReturn && !isSigned;
            return <motion.article
              key={year}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={() => {
                if (completedReturn?.id) {
                  navigate(`/tax-return-actions/${completedReturn.id}?year=${year}`);
                }
              }}
              className="group relative overflow-hidden rounded-[2rem] p-7 md:p-8 cursor-pointer transition-all duration-300 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(160deg, #ffffff 0%, #f7f8ff 50%, #ffffff 100%)',
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/70">
                      {year}
                    </span>
                    {needsSignature ? (
                      <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full">
                        <PenTool className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.8} />
                        <span className="text-xs font-medium text-amber-700">
                          {t.userDashboard.signaturePending}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                        <span className="text-xs font-medium text-emerald-700">
                          {t.userDashboard.finished}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2 leading-tight">
                  {needsSignature ? t.userDashboard.signatureRequired : `Steuererklärung ${year}`}
                </h2>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {needsSignature 
                    ? 'Bitte unterschreibe deine Steuererklärung, um den Prozess abzuschliessen.' 
                    : t.userDashboard.decisionFrom.replace('{date}', existingReturn?.updated_at ? new Date(existingReturn.updated_at).toLocaleDateString('de-CH', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : '–')}
                </p>

                <Button className="w-full sm:w-auto">
                  {needsSignature ? t.userDashboard.sign : t.userDashboard.details}
                  <ChevronRight className="w-4 h-4 ml-1" strokeWidth={2} />
                </Button>
              </div>
            </motion.article>;
          })}

          {/* New Year Action Card */}
          {availableYears.length < 7 && <AddTaxYearDropdown onYearSelect={createNewTaxReturn} existingYears={existingYears} isCreating={isCreatingTaxReturn} variant="card" />}
        </div>
      </main>

      {/* Bottom Navigation */}
      {createPortal(
        <div className="fixed inset-x-0 bottom-4 z-[9999] flex items-center justify-center px-5 pointer-events-none md:hidden">
          <div className="pointer-events-auto flex items-center gap-3">
            <nav
              data-bottom-navbar
              className="inline-flex items-center gap-1 rounded-full px-2 py-2"
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                backdropFilter: 'blur(20px) saturate(180%)'
              }}
            >
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.96]"
                style={{
                  color: 'hsl(222, 100%, 56%)',
                  background: 'hsl(222, 100%, 56%, 0.1)'
                }}
                aria-label="Dashboard"
              >
                <Home className="w-5 h-5" strokeWidth={1.8} />
              </button>

              <button
                data-tour="chat-header-icon"
                onClick={() => navigate('/chat')}
                className="relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.96]"
                style={{ color: 'rgba(100, 110, 130, 0.7)' }}
                aria-label="Chat"
              >
                <Inbox className="w-5 h-5" strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span
                    className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"
                    style={{ boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.85)' }}
                  />
                )}
              </button>

              <button
                onClick={() => setMenuSheetOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.96]"
                style={{ color: 'rgba(100, 110, 130, 0.7)' }}
                aria-label="Menü"
              >
                <Menu className="w-5 h-5" strokeWidth={1.8} />
              </button>
            </nav>

            <button
              data-tour="floating-document-button"
              onClick={handleDocumentsClick}
              className="pointer-events-auto flex h-[52px] w-[52px] items-center justify-center rounded-full text-primary-foreground transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]"
              style={{
                background: 'linear-gradient(180deg, hsl(222 100% 60%) 0%, hsl(222 100% 47%) 100%)',
                boxShadow: '0 12px 28px -10px hsl(222 100% 50% / 0.55), 0 6px 14px -8px hsl(222 100% 50% / 0.38), inset 0 1px 0 hsl(0 0% 100% / 0.24)'
              }}
              aria-label="Dokumente"
            >
              <Plus className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>,
        document.body
      )}

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