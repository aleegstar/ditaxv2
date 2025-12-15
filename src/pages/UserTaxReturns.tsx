import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Menu, ArrowRight, Check, FileCheck, Archive, Bell, MessageCircle, ScanLine } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { AddTaxYearDropdown } from '@/components/ui/add-tax-year-dropdown';
import ditaxLogoMain from '@/assets/ditax-logo-main.png';
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
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
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
    profile: userProfile
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
  const [profile, setProfile] = useState<{
    onboarding_tour_completed?: boolean;
  } | null>(null);
  // Use ref to track if animation has played (persists across re-renders)
  const hasAnimatedRef = React.useRef(false);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (userId) {
      supabase.from('profiles').select('onboarding_tour_completed').eq('id', userId).single().then(({
        data
      }) => setProfile(data));
    }
  }, [userId]);
  
  // Mark component as ready and animation as complete after initial data load
  useEffect(() => {
    if (!loading && !authLoading && !isReady) {
      // Small delay to ensure all data is settled before showing
      const timer = setTimeout(() => {
        setIsReady(true);
        // Mark animation as complete after animation duration
        setTimeout(() => {
          hasAnimatedRef.current = true;
        }, 500);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loading, authLoading, isReady]);
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
  // Show skeleton while loading or waiting for ready state
  if (authLoading || loading || !isReady) {
    return <UserTaxReturnsSkeleton />;
  }
  if (!loading && taxReturns.length === 0 && profile?.onboarding_tour_completed !== true) {
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
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    return 'Benutzer';
  };

  // Calculate circumference for progress circle (radius 24)
  const circumference = 2 * Math.PI * 24; // ~150.8

  return <div className="min-h-screen bg-[#020408] text-zinc-100 antialiased selection:bg-[#1D64FF]/30">
      {/* Mobile Container */}
      <div className="overflow-hidden min-h-screen md:max-w-2xl w-full max-w-[430px] mx-auto relative">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-[500px] z-0 pointer-events-none opacity-90" style={{
        background: 'radial-gradient(circle at 50% -15%, rgba(29, 100, 255, 0.22) 0%, rgba(29, 100, 255, 0.05) 50%, transparent 90%)',
        filter: 'blur(60px)'
      }} />

        {/* Header */}
        <header className="flex z-20 pt-8 px-8 pb-8 relative items-center justify-between">
          {/* Logo */}
          <div className="flex gap-2 items-center">
            <img src={ditaxLogoMain} alt="Ditax" className="cursor-pointer w-auto h-8 object-contain" onClick={() => navigate('/')} />
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#18181b] to-[#0a0a0a] shadow-[0_4px_15px_-4px_rgba(0,0,0,0.8)]">
              <NotificationDropdown className="!p-0 !bg-transparent hover:!bg-transparent" />
            </div>
            
            {/* Chat Icon */}
            <div data-tour="chat-header-icon" className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#18181b] to-[#0a0a0a] shadow-[0_4px_15px_-4px_rgba(0,0,0,0.8)]">
              <ChatButtonWithNotification className="!p-0 !bg-transparent hover:!bg-transparent" iconSize={20} />
            </div>
            
            {/* Menu Button */}
            <button onClick={() => setMenuSheetOpen(true)} className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors bg-gradient-to-b from-[#18181b] to-[#0a0a0a] shadow-[0_4px_15px_-4px_rgba(0,0,0,0.8)]">
              <Menu className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Greeting - aligned with logo */}
        <div className="px-8 mb-10 flex items-center relative z-20">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-br from-[#1D64FF] to-[#1D64FF]/10">
                <img src={userProfile?.avatar_url || '/lovable-uploads/default-avatar.png'} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-[#020408]" />
              </div>
            </div>
            <div>
              <span className="text-zinc-500 font-medium font-jakarta block text-sm">
                Willkommen zurück,
              </span>
              <h1 className="block font-semibold font-jakarta text-white text-xl tracking-tight">
                {getUserDisplayName()}
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content / Cards List */}
        <div className="relative px-4 flex flex-col gap-5 md:px-8 z-20 pb-24">
          {/* Show add dropdown at top if no in-progress tax returns */}
          {inProgressYears.length === 0 && availableYears.length < 7 && (
            <AddTaxYearDropdown 
              onYearSelect={createNewTaxReturn}
              existingYears={existingYears}
              isCreating={isCreatingTaxReturn}
            />
          )}

          {/* In-Progress Tax Returns (Active) */}
          {inProgressYears.map((year, index) => {
          const existingReturn = getExistingReturn(year);
          const progress = calculateProgress(year) ?? 0;
          const strokeDashoffset = circumference - progress / 100 * circumference;
          return <motion.div key={year} data-tour="tax-year-card" initial={hasAnimatedRef.current ? false : {
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: hasAnimatedRef.current ? 0 : index * 0.1,
            duration: hasAnimatedRef.current ? 0 : 0.4,
            ease: 'easeOut'
          }} onClick={() => navigate(`/form?year=${year}`)} className="group relative w-full rounded-[1.5rem] transition-all duration-300 cursor-pointer hover:-translate-y-1"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(249,115,22,0.3), inset 0 1px 0 0 rgba(249,115,22,0.1)',
                border: '1px solid transparent',
                backgroundImage: 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(249,115,22,0.6), rgba(251,191,36,0.3), rgba(249,115,22,0.6))',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}>
                {/* Orange Border Beam for incomplete tax returns */}
                <BorderBeam 
                  size={200}
                  duration={10}
                  borderWidth={1.5}
                  colorFrom="#F97316"
                  colorTo="#FBBF24"
                  delay={0}
                />
                
                {/* Inner card content */}
                <div className="relative p-6 h-full">
                  {/* Active Indicator Gradient */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#1D64FF]/10 blur-[50px] rounded-full pointer-events-none" />

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1D64FF]/10 border border-[#1D64FF]/20 text-[#1D64FF] text-[10px] font-semibold tracking-wide uppercase font-jakarta mb-3">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D64FF] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D64FF]" />
                      </span>
                      Aktuell
                    </span>
                    <h2 className="text-4xl font-medium tracking-tighter font-jakarta bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                      {year}
                    </h2>
                  </div>
                  {/* Progress Circle */}
                  <AnimatedCircularProgressBar 
                    max={100} 
                    min={0} 
                    value={progress} 
                    gaugePrimaryColor="#1D64FF" 
                    gaugeSecondaryColor="#27272a"
                    className="size-14 text-xs"
                  />
                </div>

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-jakarta">Status</span>
                    <span className="text-zinc-200 font-medium font-jakarta">
                      In Bearbeitung
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-jakarta">Frist</span>
                    <span className="text-zinc-200 font-medium font-jakarta">
                      31. März {parseInt(year) + 1}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between group-hover:border-white/10 transition-colors">
                  <span className="text-xs text-zinc-500 font-jakarta">
                    Zuletzt bearbeitet: Heute
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#1D64FF] group-hover:text-white transition-all text-zinc-400">
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                </div>
                </div>
              </motion.div>;
        })}

          {/* Completed Tax Returns */}
          {completedYears.map((year, index) => {
          const existingReturn = getExistingReturn(year);
          const completedReturn = completedTaxReturns?.[year];
          return <motion.div key={year} initial={hasAnimatedRef.current ? false : {
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: hasAnimatedRef.current ? 0 : (inProgressYears.length + index) * 0.1,
            duration: hasAnimatedRef.current ? 0 : 0.4,
            ease: 'easeOut'
          }} onClick={() => {
            if (completedReturn?.id) {
              navigate(`/tax-return-actions/${completedReturn.id}?year=${year}`);
            }
          }} className="group relative w-full border border-white/5 rounded-[1.5rem] p-6 hover:border-white/20 transition-all duration-300 cursor-pointer bg-gradient-to-b from-[#111111] to-[#050505] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-semibold tracking-wide uppercase font-jakarta mb-3">
                      <Check className="w-3 h-3" strokeWidth={3} />
                      Erledigt
                    </span>
                    <h2 className="text-3xl font-medium tracking-tighter font-jakarta group-hover:text-white transition-colors bg-clip-text text-transparent bg-gradient-to-b from-zinc-200 to-zinc-500">
                      {year}
                    </h2>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <FileCheck className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 font-jakarta group-hover:text-zinc-500 transition-colors">
                      Eingereicht am
                    </span>
                    <span className="text-zinc-400 font-medium font-jakarta group-hover:text-zinc-300 transition-colors">
                      {existingReturn?.updated_at ? new Date(existingReturn.updated_at).toLocaleDateString('de-CH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : '–'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-zinc-300 font-medium hover:bg-white/10 hover:text-white transition-colors">
                    PDF Anzeigen
                  </button>
                </div>
              </motion.div>;
        })}

          {/* Show add dropdown at bottom only if there are in-progress tax returns */}
          {inProgressYears.length > 0 && availableYears.length < 7 && (
            <AddTaxYearDropdown 
              onYearSelect={createNewTaxReturn}
              existingYears={existingYears}
              isCreating={isCreatingTaxReturn}
            />
          )}
        </div>

        {/* Floating Semi-Circle Island Button */}
        <div className="fixed bottom-0 left-0 right-0 w-full pointer-events-none z-50">
          {/* Gradient Fade Background */}
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#020203] via-[#020203]/90 to-transparent pointer-events-none" />

          {/* The Semi-Circle Button Container */}
          <div className="relative w-full flex justify-center items-end pb-0 pointer-events-auto">
            <motion.button
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => navigate('/documents')}
              data-tour="floating-document-button"
              className="group relative w-full h-24 bg-gradient-to-t from-[#060609] to-[#13131a] border-t border-white/10 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.9),0_-5px_15px_-5px_rgba(59,130,246,0.15)] flex flex-col items-center justify-start pt-4 transition-all duration-300 overflow-visible rounded-t-[50%] hover:h-28 active:scale-95"
            >
              {/* Vibrant Glow Background inside button */}
              <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-blue-600/20 via-blue-500/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity rounded-t-[50%]" />

              {/* Main Icon Circle */}
              <div className="relative z-10 w-14 h-14 mb-1 rounded-full bg-gradient-to-br from-[#1D64FF] to-[#0040CC] text-white flex items-center justify-center shadow-[0_0_30px_-5px_rgba(29,100,255,0.6)] animate-[pulse-glow_3s_ease-in-out_infinite] -mt-8 border-4 border-[#030305]">
                <ScanLine className="w-6 h-6" />
              </div>

              {/* Text Content */}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <span className="text-white font-medium text-lg tracking-tight">
                  Dokumente anzeigen
                </span>
                <span className="text-[#1D64FF]/80 text-xs font-medium tracking-wide">
                  Scan oder Upload
                </span>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </div>;
};
export default UserTaxReturns;