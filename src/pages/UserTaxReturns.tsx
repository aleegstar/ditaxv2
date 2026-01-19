import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Menu, ArrowRight, Check, PieChart, Files, ExternalLink, Inbox, Trash2, MoreVertical, PenTool, AlertCircle, Clock, Zap } from 'lucide-react';
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
  } = useTaxYearData(userId);
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
  useEffect(() => {
    if (authLoading) return;
    if (!isValid || !userId) {
      navigate('/auth');
      return;
    }
  }, [userId, isValid, authLoading, navigate]);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [shouldRedirectToWelcome, setShouldRedirectToWelcome] = useState(false);
  useEffect(() => {
    if (!userId || authLoading) return;
    const checkOnboarding = async () => {
      const {
        data: profile
      } = await supabase.from('profiles').select('onboarding_tour_completed, first_name').eq('id', userId).single();
      if (profile && !profile.onboarding_tour_completed && !profile.first_name) {
        setShouldRedirectToWelcome(true);
      }
      setOnboardingChecked(true);
    };
    checkOnboarding();
  }, [userId, authLoading]);

  // Redirect to welcome after state is set (prevents flash)
  useEffect(() => {
    if (shouldRedirectToWelcome && onboardingChecked) {
      navigate('/welcome', {
        replace: true
      });
    }
  }, [shouldRedirectToWelcome, onboardingChecked, navigate]);
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
        toast.error('Steuererklärung nicht gefunden');
        return;
      }

      // Delete associated data
      await supabase.from('form_data').delete().eq('user_id', userId).eq('tax_year', year);
      await supabase.from('form_progress').delete().eq('user_id', userId).eq('tax_year', year);
      await supabase.from('uploaded_documents').delete().eq('user_id', userId).eq('tax_year', year);

      // Delete the tax return
      const {
        error
      } = await supabase.from('tax_returns').delete().eq('id', taxReturn.id);
      if (error) throw error;
      toast.success(`Steuererklärung ${year} wurde gelöscht`);
      await refetch();
    } catch (error) {
      console.error('Error deleting tax year:', error);
      toast.error('Fehler beim Löschen der Steuererklärung');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setYearToDelete(null);
    }
  };
  const handleDocumentsClick = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      navigate('/documents?transition=true');
    }, 600);
  }, [navigate]);
  useEffect(() => {
    if (!loading && !authLoading && !profileLoading && !isReady) {
      setIsReady(true);
    }
  }, [loading, authLoading, profileLoading, isReady]);
  const createNewTaxReturn = async (year: string) => {
    if (!userId) return;
    setIsCreatingTaxReturn(true);
    try {
      const {
        data: existingReturn
      } = await supabase.from('tax_returns').select('id').eq('user_id', userId).eq('tax_year', year).maybeSingle();
      if (existingReturn) {
        toast.info(`Steuererklärung für ${year} existiert bereits`);
        await refetch();
        setIsCreatingTaxReturn(false);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('tax_returns').insert({
        user_id: userId,
        tax_year: year,
        status: 'pending',
        payment_status: 'pending',
        workflow_step: 'data_collection'
      }).select().single();
      if (error) {
        if (error.code === '23505') {
          toast.success(`Steuererklärung für ${year} bereits vorhanden`);
          await refetch();
          navigate('/');
          return;
        }
        throw error;
      }
      toast.success(`Neue Steuererklärung für ${year} erstellt`);
      await refetch();
      navigate('/');
    } catch (error) {
      console.error('Error creating tax return:', error);
      toast.error('Fehler beim Erstellen der Steuererklärung');
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
  if (authLoading || loading || profileLoading || !isReady || !onboardingChecked || shouldRedirectToWelcome) {
    return <UserTaxReturnsSkeleton />;
  }
  if (!loading && taxReturns.length === 0 && userProfile?.onboarding_tour_completed !== true) {
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
    return 'Benutzer';
  };
  const getGreeting = () => {
    return 'Grüezi,';
  };
  return <div className="antialiased min-h-screen selection:bg-gray-100 selection:text-gray-900 pb-28 text-gray-900 bg-white">
      {/* Main Container */}
      <main className="min-h-screen sm:px-6 lg:px-8 max-w-7xl mr-auto ml-auto pt-6 pr-4 pl-4 relative">
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
        <section className="pb-10">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-gray-500 font-jakarta text-sm">
              {getGreeting()}
            </p>
            <h1 className="text-gray-900 font-medium tracking-tight font-jakarta leading-none text-2xl">
              {getUserDisplayName()}
            </h1>
          </div>
        </section>

        {/* Missing Items Alert */}
        <MissingItemsAlert 
          pendingDocuments={pendingDocuments} 
          pendingInformation={pendingInformation} 
        />

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Unpaid In-Progress Tax Returns (Active Style - leads to form) */}
          {unpaidYears.map(year => {
          const progress = calculateProgress(year) ?? 0;
          const documentCount = getDocumentCount(year);
          return <article key={year} data-tour="tax-year-card" onClick={() => navigate(`/form?year=${year}`)} className="group relative flex flex-col p-3 bg-gradient-to-b from-white to-slate-50/80 rounded-[2.5rem] shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(100,116,139,0.18),0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-pointer">
                {/* Delete Menu */}
                <div className="absolute top-5 right-5 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/20 rounded-full">
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
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Top Image/Visual Area */}
                <div className="relative h-48 w-full rounded-[2rem] overflow-hidden bg-blue-600 flex items-center justify-center">
                  <span className="font-semibold text-white tracking-tight font-jakarta transition-transform duration-500 group-hover:scale-110 text-4xl">
                    {year}
                  </span>
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-gray-700 font-jakarta tracking-wide uppercase">
                      Aktiv
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex flex-col pt-5 pr-2 pb-2 pl-2 min-h-[140px]">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-medium tracking-tight text-gray-900 font-jakarta">
                      Steuererklärung
                    </h2>
                  </div>

                  <p className="text-gray-500 text-sm leading-relaxed font-jakarta line-clamp-2">
                    Erfassung läuft. Belege werden automatisch kategorisiert.
                  </p>

                  {/* Bottom Action Row */}
                  <div className="flex items-center justify-between mt-auto pt-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium text-sm font-jakarta">
                        <PieChart className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                        <span>{progress}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium text-sm font-jakarta">
                        <Files className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                        <span>{documentCount}</span>
                      </div>
                    </div>

                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full pl-4 pr-3 py-2 text-sm font-semibold transition-colors flex items-center gap-1.5 font-jakarta group/btn">
                      Weiter
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </article>;
        })}

          {/* Paid In-Progress Tax Returns (Processing Style - leads to tracking) */}
          {paidInProgressYears.map(year => {
          const taxReturn = getExistingReturn(year);
          const isExpress = taxReturn?.express_service;
          return <article key={year} onClick={() => navigate(`/tax-return-tracking/${taxReturn?.id}`)} className="group relative flex flex-col p-3 bg-gradient-to-b from-white to-slate-50/80 rounded-[2.5rem] shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(100,116,139,0.18),0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-pointer">
                {/* Top Image/Visual Area - Amber/Orange Gradient */}
                <div className="relative h-48 w-full rounded-[2rem] overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <span className="font-semibold text-white tracking-tight font-jakarta transition-transform duration-500 group-hover:scale-110 text-4xl">
                    {year}
                  </span>
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                    <span className="text-xs font-semibold text-amber-700 font-jakarta tracking-wide uppercase">
                      In Bearbeitung
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex flex-col pt-5 pr-2 pb-2 pl-2 min-h-[140px]">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-medium tracking-tight text-gray-900 font-jakarta">
                      Steuererklärung
                    </h2>
                  </div>

                  <p className="text-gray-500 text-sm leading-relaxed font-jakarta line-clamp-2">
                    Deine Steuererklärung wird aktuell erstellt.
                  </p>

                  {/* Bottom Action Row */}
                  <div className="flex items-center justify-between mt-auto pt-3">
                    <div className="flex items-center gap-2">
                      {isExpress ? <div className="flex items-center gap-1.5 text-amber-600 font-medium text-sm font-jakarta">
                          <Zap className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                          <span>Express</span>
                        </div> : <div className="flex items-center gap-1.5 text-gray-600 font-medium text-sm font-jakarta">
                          <Clock className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                          <span>Standard</span>
                        </div>}
                      {!isExpress && <span className="text-xs text-blue-600 font-medium font-jakarta bg-blue-50 px-2 py-0.5 rounded-full">
                          Upgrade möglich
                        </span>}
                    </div>

                    <button className="bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-full pl-4 pr-3 py-2 text-sm font-semibold transition-colors flex items-center gap-1.5 font-jakarta group/btn">
                      Tracking
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </article>;
        })}

          {/* Completed Tax Returns (Archived Style) */}
          {completedYears.map(year => {
          const existingReturn = getExistingReturn(year);
          const completedReturn = completedTaxReturns?.[year];
          const isSigned = completedReturn?.signature_status === 'signed';
          const needsSignature = completedReturn && !isSigned;
          return <article key={year} onClick={() => {
            if (completedReturn?.id) {
              navigate(`/tax-return-actions/${completedReturn.id}?year=${year}`);
            }
          }} className="group relative flex flex-col p-3 bg-gradient-to-b from-white to-slate-50/80 rounded-[2.5rem] shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(100,116,139,0.18),0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-pointer">
                <div className="relative h-48 w-full rounded-[2rem] overflow-hidden bg-gray-100 flex items-center justify-center">
                  <span className="text-7xl font-semibold text-gray-300 tracking-tight font-jakarta transition-transform duration-500 group-hover:scale-110">
                    {year}
                  </span>
                  <div className={`absolute bottom-4 left-4 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm ${needsSignature ? 'bg-amber-50/90 ring-1 ring-amber-200' : 'bg-white/90'}`}>
                    {needsSignature ? <>
                        <PenTool className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                        <span className="text-xs font-semibold text-amber-700 font-jakarta tracking-wide uppercase">
                          Signatur ausstehend
                        </span>
                      </> : <>
                        <Check className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                        <span className="text-xs font-semibold text-gray-500 font-jakarta tracking-wide uppercase">
                          Fertig
                        </span>
                      </>}
                  </div>
                </div>

                <div className="px-2 pt-5 pb-2 flex flex-col min-h-[140px]">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className={`text-xl font-medium tracking-tight font-jakarta ${needsSignature ? 'text-gray-700' : 'text-gray-400'}`}>
                      Steuererklärung
                    </h2>
                    {isSigned && <div className="text-gray-300 bg-gray-50 p-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" strokeWidth={2} />
                      </div>}
                  </div>

                  <p className={`text-sm leading-relaxed font-jakarta line-clamp-2 ${needsSignature ? 'text-amber-600' : 'text-gray-400'}`}>
                    {needsSignature ? 'Bitte unterschreibe deine Steuererklärung.' : `Bescheid vom ${existingReturn?.updated_at ? new Date(existingReturn.updated_at).toLocaleDateString('de-CH', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }) : '–'} liegt vor.`}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-3">
                    <div className="flex items-center gap-4">
                      {needsSignature ? <div className="flex items-center gap-1.5 text-amber-600 font-medium text-sm font-jakarta">
                          <AlertCircle className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                          <span>Aktion nötig</span>
                        </div> : <div className="flex items-center gap-1.5 text-gray-400 font-medium text-sm font-jakarta">
                          <Check className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
                          <span>100%</span>
                        </div>}
                    </div>

                    <button className={`rounded-full pl-4 pr-3 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 font-jakarta ${needsSignature ? 'bg-[#1D64FF] text-white hover:bg-[#1854D9] shadow-lg shadow-blue-500/25' : 'bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-900'}`}>
                      {needsSignature ? 'Unterschreiben' : 'Details'}
                      <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </article>;
        })}

          {/* New Year Action Card */}
          {availableYears.length < 7 && <AddTaxYearDropdown onYearSelect={createNewTaxReturn} existingYears={existingYears} isCreating={isCreatingTaxReturn} variant="card" />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center p-1.5 gap-2 bg-white backdrop-blur-xl border border-gray-200 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {/* Scanner Button */}
          <button data-tour="floating-document-button" onClick={handleDocumentsClick} className="flex items-center gap-3 pl-2.5 pr-5 py-2 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 border-t border-blue-400 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <img src={uploadIcon} alt="Upload" className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold text-white font-jakarta tracking-wide">
                Dokumente
              </span>
              <span className="block text-[10px] text-white/80 font-medium">
                hochladen
              </span>
            </div>
          </button>

          <div className="w-px h-8 bg-gray-200"></div>

          {/* Inbox */}
          <button data-tour="chat-header-icon" onClick={() => navigate('/chat')} className="p-3 text-gray-500 rounded-full hover:text-gray-900 hover:bg-gray-100 transition-colors relative">
            <Inbox className="w-6 h-6" strokeWidth={1.5} />
            {unreadCount > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>}
          </button>

          {/* Menu */}
          <button onClick={() => setMenuSheetOpen(true)} className="p-3 text-gray-500 rounded-full hover:text-gray-900 hover:bg-gray-100 transition-colors">
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* White Overlay for Transition */}
      <div className={`fixed inset-0 z-[200] pointer-events-none transition-opacity duration-300 ease-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`} style={{
      backgroundColor: '#ffffff'
    }} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Steuererklärung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Steuererklärung für {yearToDelete} wirklich löschen? Alle zugehörigen Daten und Dokumente werden unwiderruflich entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
            <AlertDialogCancel disabled={isDeleting} className="w-full bg-white hover:bg-gray-50 border border-gray-200 font-medium h-12 rounded-full text-gray-900">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => yearToDelete && handleDeleteTaxYear(yearToDelete)} disabled={isDeleting} className="w-full h-12 bg-red-500 hover:bg-red-600 text-white border-0 rounded-full font-medium">
              {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
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