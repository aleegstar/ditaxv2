import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Menu, ArrowRight, Check, PieChart, Files, ExternalLink, Bell, ScanLine, Inbox } from 'lucide-react';
import { AddTaxYearDropdown } from '@/components/ui/add-tax-year-dropdown';
import ditaxLogoFull from '@/assets/ditax-logo-full.png';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { ChatButtonWithNotification } from '@/components/chat/ChatButtonWithNotification';
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
  useEffect(() => {
    if (authLoading) return;
    if (!isValid || !userId) {
      navigate('/auth');
      return;
    }
  }, [userId, isValid, authLoading, navigate]);
  useEffect(() => {
    if (!userId || authLoading) return;
    const checkOnboarding = async () => {
      const {
        data: profile
      } = await supabase.from('profiles').select('onboarding_tour_completed, first_name').eq('id', userId).single();
      if (profile && !profile.onboarding_tour_completed && !profile.first_name) {
        navigate('/welcome');
      }
    };
    checkOnboarding();
  }, [userId, authLoading, navigate]);
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
  if (authLoading || loading || profileLoading || !isReady) {
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
  const getUserDisplayName = () => {
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    return 'Benutzer';
  };
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen,';
    if (hour < 18) return 'Guten Tag,';
    return 'Guten Abend,';
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

          {/* Notification Bell */}
          <NotificationDropdown className="text-gray-400 hover:text-gray-900 hover:bg-gray-50" />
        </header>

        {/* Greeting Section */}
        <section className="flex pb-10 items-end justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-gray-500 font-jakarta text-sm">
              {getGreeting()}
            </p>
            <h1 className="text-gray-900 font-medium tracking-tight font-jakarta leading-none text-2xl">
              {getUserDisplayName()}
            </h1>
          </div>
          <div className="relative shrink-0">
            <img src={userProfile?.avatar_url || '/lovable-uploads/default-avatar.png'} alt="Profile" className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100" />
          </div>
        </section>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* In-Progress Tax Returns (Active Style) */}
          {inProgressYears.map(year => {
          const progress = calculateProgress(year) ?? 0;
          const documentCount = getDocumentCount(year);
          return <article key={year} onClick={() => navigate(`/form?year=${year}`)} className="group relative flex flex-col p-3 bg-white rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/80 transition-all duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-pointer">
                {/* Top Image/Visual Area */}
                <div className="relative h-64 w-full rounded-[2rem] overflow-hidden bg-blue-600 flex items-center justify-center">
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
                <div className="flex flex-col pt-6 pr-2 pb-0 pl-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-medium tracking-tight text-gray-900 font-jakarta">
                      Steuererklärung
                    </h2>
                    
                  </div>

                  <p className="text-gray-500 text-[15px] leading-relaxed font-jakarta">
                    Erfassung läuft. Belege werden automatisch kategorisiert.
                  </p>

                  {/* Bottom Action Row */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-2 text-gray-600 font-medium text-sm font-jakarta">
                        <PieChart className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                        <span>{progress}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 font-medium text-sm font-jakarta">
                        <Files className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                        <span>{documentCount}</span>
                      </div>
                    </div>

                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full pl-5 pr-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 font-jakarta group/btn">
                      Weiter
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
          return <article key={year} onClick={() => {
            if (completedReturn?.id) {
              navigate(`/tax-return-actions/${completedReturn.id}?year=${year}`);
            }
          }} className="group relative flex flex-col p-3 bg-white rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/80 transition-all duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-pointer">
                <div className="relative h-64 w-full rounded-[2rem] overflow-hidden bg-gray-100 flex items-center justify-center">
                  <span className="text-8xl font-semibold text-gray-300 tracking-tight font-jakarta transition-transform duration-500 group-hover:scale-110">
                    {year}
                  </span>
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Check className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                    <span className="text-xs font-semibold text-gray-500 font-jakarta tracking-wide uppercase">
                      Fertig
                    </span>
                  </div>
                </div>

                <div className="px-2 pt-6 pb-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-medium tracking-tight text-gray-400 font-jakarta">
                      Steuererklärung
                    </h2>
                    <div className="text-gray-300 bg-gray-50 p-0.5 rounded-full">
                      <Check className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                  </div>

                  <p className="text-gray-400 text-[15px] leading-relaxed font-jakarta">
                    Bescheid vom {existingReturn?.updated_at ? new Date(existingReturn.updated_at).toLocaleDateString('de-CH', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }) : '–'} liegt vor. Rückzahlung erhalten.
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-2 text-gray-400 font-medium text-sm font-jakarta">
                        <Check className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
                        <span>100%</span>
                      </div>
                    </div>

                    <button className="bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-900 rounded-full pl-5 pr-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 font-jakarta">
                      Details
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
        <div className="pointer-events-auto flex items-center p-1.5 gap-2 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {/* Scanner Button */}
          <button onClick={handleDocumentsClick} className="flex items-center gap-3 pl-2 pr-5 py-2 rounded-full hover:bg-gray-100 transition-colors group">
            <div className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-lg shadow-gray-900/20 group-hover:scale-105 transition-transform bg-[#2463eb]">
              <ScanLine className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold text-gray-900 font-jakarta uppercase tracking-wide">
                Upload
              </span>
              <span className="block text-[10px] text-gray-500 font-medium">
                Dokumente
              </span>
            </div>
          </button>

          <div className="w-px h-8 bg-gray-200"></div>

          {/* Inbox */}
          <button onClick={() => navigate('/chat')} className="p-3 text-gray-500 rounded-full hover:text-gray-900 hover:bg-gray-100 transition-colors relative">
            <Inbox className="w-6 h-6" strokeWidth={1.5} />
            <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
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
    </div>;
};
export default UserTaxReturns;