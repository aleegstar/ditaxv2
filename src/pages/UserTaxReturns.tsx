import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Plus, Menu, ChevronRight, Check, ExternalLink, Inbox, Trash2, MoreVertical, PenTool, Clock, Zap, Home, FileCheck2, CreditCard, ArrowRight } from 'lucide-react';
import { OverlayChatBar } from '@/components/chat/OverlayChatBar';
import { DocumentsOverlay } from '@/components/documents/DocumentsOverlay';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AddTaxYearDropdown } from '@/components/ui/add-tax-year-dropdown';
import { AddTaxYearSheet } from '@/components/ui/add-tax-year-sheet';
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
    setMenuSheetOpen,
    documentsOverlayOpen,
    setDocumentsOverlayOpen
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
    forceTour,
    showTour
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
  const [showAddYearSheet, setShowAddYearSheet] = useState(false);
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
    setDocumentsOverlayOpen(true);
  }, [setDocumentsOverlayOpen]);
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
    return null;
  }

  // If safety timeout fired but profile still loading with no tax returns,
  // keep showing nothing to prevent false consent screen
  if (safetyTimeout && profileLoading && taxReturns.length === 0) {
    return null;
  }

  // Guard: valid session but profile not yet loaded
  // prevents "Benutzer" fallback from flashing during auth/profile race condition
  if (isValid && !profileLoading && !userProfile && !safetyTimeout) {
    return null;
  }

  // Also wait while redirecting to select-person
  if (hasMultipleFilers && !selectionConfirmed) {
    return null;
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
      <main className="relative z-10 min-h-screen max-w-3xl lg:max-w-6xl mx-auto pt-[max(1.5rem,env(safe-area-inset-top))] px-4 md:px-8">
        {/* Header */}
        <header className="flex pb-6 items-center justify-between">
          <div className="flex items-center">
            <div
              role="img"
              aria-label="ditax"
              className="h-8 w-[106px] overflow-hidden"
              style={{
                WebkitMaskImage: 'url(/ditax-logo-mask.svg)',
                maskImage: 'url(/ditax-logo-mask.svg)',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
            >
              <video
                src="/sphere-animation.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover scale-[2]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProfileWithNotifications avatarUrl={userProfile?.avatar_url} firstName={userProfile?.first_name} />
            <button
              onClick={() => setMenuSheetOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors bg-white border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <Menu className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Greeting Section */}
        <section className="pb-6">
          <div className="flex items-end justify-between gap-4 mb-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-base text-muted-foreground font-normal">
                {getGreeting()}
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-tight truncate">
              {getUserDisplayName()}
              </h1>
            </div>
            
            {/* Tax Filer Selector */}
            <TaxFilerSelector className="flex-shrink-0" />
          </div>
        </section>

        {/* Missing Items Alert */}
        <MissingItemsAlert
          pendingDocuments={pendingDocuments} 
          pendingInformation={pendingInformation} 
        />

        {/* Quick Action Cards */}
        <section className="grid grid-cols-2 gap-3 mb-8">
          {/* Upload Documents Card */}
          <button
            onClick={handleDocumentsClick}
            className="flex flex-col items-center justify-center gap-3 rounded-[1.25rem] p-6 text-center transition-all duration-200 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(160deg, hsl(222 100% 30%) 0%, hsl(222 100% 22%) 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-[13px] font-medium text-white/90 leading-tight">
              Unterlagen<br/>hochladen
            </span>
          </button>

          {/* Add Tax Year Card */}
          <button
            onClick={() => setShowAddYearSheet(true)}
            data-tour="quick-add-year"
            className="flex flex-col items-center justify-center gap-3 rounded-[1.25rem] p-6 text-center transition-all duration-200 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(160deg, hsl(222 100% 56%) 0%, hsl(222 100% 44%) 100%)',
              boxShadow: '0 8px 32px rgba(29,100,255,0.2), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-[13px] font-medium text-white/90 leading-tight">
              Steuerjahr<br/>hinzufügen
            </span>
          </button>
        </section>

        {/* Tax Returns Section Title */}
        {availableYears.length > 0 && (
          <h2 className="text-lg font-semibold text-foreground tracking-tight mb-4">
            Steuererklärungen
          </h2>
        )}

        {/* Cards - Timeline Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 auto-rows-fr">
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative h-full"
            >
              {/* Main Card */}
              <div 
                onClick={() => navigate(`/form?year=${year}`)}
                className="relative z-10 rounded-[2rem] overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.98] p-8 sm:p-10 h-full"
                style={{
                  background: 'rgba(255, 255, 255, 0.40)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.60)',
                }}
              >
                {/* Year + Menu */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
                      <span className="text-xs font-medium text-primary">
                        In Erfassung
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

                {/* Title & Description */}
                <h2 className="font-semibold tracking-tight text-foreground leading-tight mb-2 text-3xl">
                  {year}
                </h2>
                <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
                  {completedSteps === 0 
                    ? 'Beginne damit deine Angaben zu erfassen.'
                    : `${completedSteps} von ${steps.length} Schritten erfolgreich abgeschlossen.`
                  }
                </p>

                {/* Progress Bar */}
                <div className="flex gap-1.5 mb-8">
                  {steps.map((step, i) => (
                    <div 
                      key={i} 
                      className="flex-1 h-2.5 rounded-full transition-all duration-500"
                      style={i < completedSteps ? {
                        background: 'hsl(var(--primary))',
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
            </motion.div>;
          })}

          {/* Paid In-Progress Tax Returns (Processing) */}
          {paidInProgressYears.map(year => {
            const taxReturn = getExistingReturn(year);
            const isExpress = taxReturn?.express_service;
            return <motion.div
              key={year}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative h-full"
            >
              <div 
                onClick={() => navigate(`/tax-return-tracking/${taxReturn?.id}`)}
                className="relative z-10 rounded-[2rem] overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.98] p-8 sm:p-10 h-full"
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
                <h2 className="font-semibold tracking-tight text-foreground leading-tight mb-2 text-3xl">
                  {taxReturn.tax_year}
                </h2>
                <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
                  Deine Steuererklärung wird von unserem Team bearbeitet. Du wirst benachrichtigt, sobald sie fertig ist.
                </p>

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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => {
                if (completedReturn?.id) {
                  navigate(`/tax-return-actions/${completedReturn.id}?year=${year}`);
                }
              }}
              className="group relative overflow-hidden rounded-[2rem] p-7 md:p-8 cursor-pointer transition-all duration-300 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] active:scale-[0.98] h-full"
              style={{
                background: 'linear-gradient(160deg, #ffffff 0%, #f7f8ff 50%, #ffffff 100%)',
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2.5">
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

                <h2 className="font-semibold tracking-tight text-foreground mb-2 leading-tight text-3xl">
                  {needsSignature ? t.userDashboard.signatureRequired : year}
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

              </div>
            </motion.article>;
          })}


        </div>
      </main>

      {/* Overlay Chat Bar */}
      {!showTour && userId && (
        <OverlayChatBar userId={userId} onMenuOpen={() => setMenuSheetOpen(true)} />
      )}

      {/* Documents Overlay */}
      <DocumentsOverlay 
        isOpen={documentsOverlayOpen} 
        onClose={() => setDocumentsOverlayOpen(false)} 
      />

      {/* White Overlay for Transition */}
      <div className={`fixed inset-0 z-[200] pointer-events-none transition-opacity duration-300 ease-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`} style={{
      backgroundColor: 'hsl(var(--background))'
    }} />

      {/* Delete Confirmation Bottom Sheet */}
      <Drawer open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DrawerContent variant="bottom-sheet">
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

      {/* Add Tax Year Bottom Sheet (from quick action card) */}
      <AddTaxYearSheet
        open={showAddYearSheet}
        onOpenChange={setShowAddYearSheet}
        existingYears={existingYears}
        onYearSelect={(year) => {
          setShowAddYearSheet(false);
          createNewTaxReturn(year);
        }}
      />


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