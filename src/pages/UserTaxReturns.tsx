import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Menu, Plus } from 'lucide-react';
import { OverlayChatBar } from '@/components/chat/OverlayChatBar';
import ditaxLogoMask from '@/assets/ditax-logo-mask.svg';
import { DocumentsOverlay } from '@/components/documents/DocumentsOverlay';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { AddTaxYearSheet } from '@/components/ui/add-tax-year-sheet';
import { ProfileWithNotifications } from '@/components/ui/profile-with-notifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthValidation } from '@/hooks/use-auth-validation';
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
import { YearPillSelector } from '@/components/dashboard/YearPillSelector';
import { HomeBottomNav } from '@/components/dashboard/HomeBottomNav';
import { ProcessingContent } from '@/components/dashboard/ProcessingContent';
import { CompletedContent } from '@/components/dashboard/CompletedContent';
import { TaxYearDashboard } from '@/components/TaxYearDashboard';
import { FormProvider } from '@/contexts/form/FormContext';

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
  const { setMenuSheetOpen, documentsOverlayOpen, setDocumentsOverlayOpen } = useSidebar();
  const { profile: userProfile, loading: profileLoading } = useProfile();
  const { userId, isValid, isLoading: authLoading } = useAuthValidation();
  const { activeTaxFilerId, hasMultipleFilers, selectionConfirmed, isLoading: taxFilerLoading } = useTaxFiler();
  const { taxReturns, completedTaxReturns, loading, refetch } = useTaxYearData(userId, activeTaxFilerId);
  const { showTour } = useOnboardingTour();
  useUnreadMessages();
  const { pendingDocuments, pendingInformation } = usePendingMissingItemsCount(userId);
  const [chatOverlayOpen, setChatOverlayOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setChatOverlayOpen(!!detail?.open);
    };
    document.addEventListener('overlay-chat-state', handler);
    return () => document.removeEventListener('overlay-chat-state', handler);
  }, []);

  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 60,
    maxPullDistance: 100,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isValid || !userId) {
      navigate('/auth');
      return;
    }
    if (hasMultipleFilers && !selectionConfirmed) {
      navigate('/select-person', { replace: true });
    }
  }, [userId, isValid, authLoading, navigate, hasMultipleFilers, selectionConfirmed]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refetch]);

  const [isCreatingTaxReturn, setIsCreatingTaxReturn] = useState(false);
  const [showAddYearSheet, setShowAddYearSheet] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [safetyTimeout, setSafetyTimeout] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSafetyTimeout(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authLoading && !loading && !profileLoading && !taxFilerLoading) setSafetyTimeout(false);
  }, [authLoading, loading, profileLoading, taxFilerLoading]);

  const unsignedTaxReturn = useMemo(() => {
    for (const [, data] of Object.entries(completedTaxReturns || {})) {
      if (data && (data as any).signature_status !== 'signed') return data as any;
    }
    return null;
  }, [completedTaxReturns]);

  useEffect(() => {
    if (unsignedTaxReturn && isReady && userProfile && !signatureDialogOpen) {
      const timer = setTimeout(() => setSignatureDialogOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [unsignedTaxReturn, isReady, userProfile]);

  useEffect(() => {
    if (!loading && !authLoading && !profileLoading && !taxFilerLoading && activeTaxFilerId && !isReady) {
      setIsReady(true);
    }
  }, [loading, authLoading, profileLoading, taxFilerLoading, activeTaxFilerId, isReady]);

  const availableYears = useMemo(() => {
    const years = taxReturns.map((tr: TaxReturn) => tr.tax_year);
    return [...new Set(years)].sort((a, b) => parseInt(b) - parseInt(a));
  }, [taxReturns]);

  const getExistingReturn = (year: string) => taxReturns.find((tr: TaxReturn) => tr.tax_year === year);
  const isCompletedYear = (year: string) => {
    const r = getExistingReturn(year);
    return r?.status === 'completed' || r?.status === 'success' || !!completedTaxReturns[year];
  };

  // Default selectedYear: first unpaid, else newest
  useEffect(() => {
    if (!selectedYear && availableYears.length > 0) {
      const firstUnpaid = availableYears.find(y => {
        const r = getExistingReturn(y);
        return r?.payment_status !== 'paid' && !isCompletedYear(y);
      });
      setSelectedYear(firstUnpaid || availableYears[0]);
    }
    // If selectedYear not in list anymore, reset
    if (selectedYear && availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const createNewTaxReturn = async (year: string) => {
    if (!userId) return;
    setIsCreatingTaxReturn(true);
    try {
      const { data: existing } = await supabase
        .from('tax_returns').select('id').eq('user_id', userId).eq('tax_year', year)
        .eq('tax_filer_id', activeTaxFilerId).maybeSingle();
      if (existing) {
        toast.info(t.userDashboard.taxReturnExists.replace('{year}', year));
        await refetch();
        setSelectedYear(year);
        return;
      }
      const { error } = await supabase.from('tax_returns').insert({
        user_id: userId,
        tax_filer_id: activeTaxFilerId,
        tax_year: year,
        status: 'pending',
        payment_status: 'pending',
        workflow_step: 'data_collection',
      });
      if (error && error.code !== '23505') throw error;
      toast.success(t.userDashboard.taxReturnCreated.replace('{year}', year));
      await refetch();
      setSelectedYear(year);
    } catch (e) {
      console.error(e);
      toast.error(t.userDashboard.createError);
    } finally {
      setIsCreatingTaxReturn(false);
    }
  };

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
    } catch (e) {
      console.error(e);
      toast.error(t.userDashboard.deleteError);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setYearToDelete(null);
    }
  };

  if ((authLoading || loading || profileLoading || !isReady || taxFilerLoading || !activeTaxFilerId) && !safetyTimeout) {
    return null;
  }
  if (safetyTimeout && profileLoading && taxReturns.length === 0) return null;
  if (isValid && !profileLoading && !userProfile && !safetyTimeout) return null;
  if (hasMultipleFilers && !selectionConfirmed) return null;

  // New user without onboarding -> year selector
  if (!loading && !profileLoading && activeTaxFilerId && taxReturns.length === 0 && !userProfile?.first_name && !userProfile?.terms_accepted_at) {
    return <TaxYearSelector onYearSelect={createNewTaxReturn} isCreating={isCreatingTaxReturn} />;
  }

  const getUserDisplayName = () => userProfile?.first_name || null;
  const getGreeting = () => t.userDashboard.greeting;

  // Determine status of selected year
  const selectedReturn = selectedYear ? getExistingReturn(selectedYear) : undefined;
  const selectedCompleted = selectedYear ? completedTaxReturns?.[selectedYear] : undefined;
  const selectedStatus: 'draft' | 'processing' | 'completed' | 'empty' = (() => {
    if (!selectedYear) return 'empty';
    if (selectedCompleted || selectedReturn?.status === 'completed' || selectedReturn?.status === 'success') return 'completed';
    if (selectedReturn?.payment_status === 'paid') return 'processing';
    if (selectedReturn) return 'draft';
    return 'empty';
  })();

  return (
    <div
      className="antialiased min-h-screen bg-background selection:bg-primary/10 selection:text-foreground pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)))] text-foreground relative overflow-hidden"
      onTouchStart={pullHandlers.onTouchStart}
      onTouchMove={pullHandlers.onTouchMove}
      onTouchEnd={pullHandlers.onTouchEnd}
    >
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <main className="relative z-10 min-h-screen max-w-3xl lg:max-w-4xl mx-auto pt-[max(1.5rem,env(safe-area-inset-top))] px-4 md:px-8">
        {/* Header */}
        <header className="flex pb-6 items-center justify-between">
          <div className="flex items-center">
            <img src={ditaxLogoMask} alt="ditax" className="h-8 w-[106px] object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <ProfileWithNotifications avatarUrl={userProfile?.avatar_url} firstName={userProfile?.first_name} />
            <button
              onClick={() => setMenuSheetOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-foreground bg-white border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <Menu className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Greeting */}
        <section className="pb-5">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-base text-muted-foreground font-normal">{getGreeting()}</p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-tight truncate">
                {getUserDisplayName()}
              </h1>
            </div>
            <TaxFilerSelector className="flex-shrink-0" />
          </div>
        </section>

        {/* Missing Items */}
        <MissingItemsAlert pendingDocuments={pendingDocuments} pendingInformation={pendingInformation} />

        {/* Year Pills */}
        {availableYears.length > 0 && (
          <div className="mb-6">
            <YearPillSelector
              years={availableYears}
              selectedYear={selectedYear}
              onSelect={setSelectedYear}
              onAdd={() => setShowAddYearSheet(true)}
            />
          </div>
        )}

        {/* Active Year Content */}
        <motion.div
          key={`${selectedYear}-${selectedStatus}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-8"
        >
          {selectedStatus === 'empty' && (
            <button
              onClick={() => setShowAddYearSheet(true)}
              className="w-full rounded-[1.5rem] bg-white border border-slate-200/80 p-8 flex flex-col items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-all"
            >
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-primary-foreground"
                style={{ background: 'linear-gradient(135deg, #779DFF 0%, #2D68FF 100%)' }}
              >
                <Plus className="w-6 h-6" strokeWidth={2} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">Steuerjahr hinzufügen</h3>
                <p className="text-sm text-muted-foreground mt-1">Lege eine neue Steuererklärung an.</p>
              </div>
            </button>
          )}

          {selectedStatus === 'draft' && selectedYear && (
            <FormProvider taxYear={selectedYear}>
              <TaxYearDashboard embedded />
            </FormProvider>
          )}

          {selectedStatus === 'processing' && selectedReturn && (
            <ProcessingContent
              taxReturnId={selectedReturn.id}
              workflowStep={selectedReturn.workflow_step}
              expressService={!!selectedReturn.express_service}
            />
          )}

          {selectedStatus === 'completed' && selectedYear && selectedCompleted && (
            <CompletedContent
              taxYear={selectedYear}
              completedTaxReturnId={(selectedCompleted as any).id}
              signatureStatus={(selectedCompleted as any).signature_status}
            />
          )}
        </motion.div>
      </main>

      {/* Bottom Navbar */}
      {!showTour && <HomeBottomNav
        onChatClick={() => {
          document.dispatchEvent(new CustomEvent('open-overlay-chat'));
        }}
        onDocumentsClick={() => navigate('/documents')}
        onMenuClick={() => setMenuSheetOpen(true)}
        onActionClick={() => {
          setDocumentsOverlayOpen(false);
          document.dispatchEvent(new CustomEvent('close-overlay-chat'));
        }}
        activeTab={documentsOverlayOpen ? 'documents' : chatOverlayOpen ? 'chat' : 'home'}
      />}

      {/* Hidden chat overlay (controlled via event) */}
      {!showTour && userId && (
        <div className="hidden">
          {/* OverlayChatBar manages its own open state; we listen for event and click the bar */}
        </div>
      )}
      {!showTour && userId && <ChatOverlayMounted userId={userId} onMenuOpen={() => setMenuSheetOpen(true)} />}

      <DocumentsOverlay isOpen={documentsOverlayOpen} onClose={() => setDocumentsOverlayOpen(false)} />

      {/* Delete Dialog */}
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
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} className="w-full">
                {t.userDashboard.cancelDelete}
              </Button>
              <Button variant="destructive" onClick={() => yearToDelete && handleDeleteTaxYear(yearToDelete)} disabled={isDeleting} className="w-full">
                {isDeleting ? t.userDashboard.deleting : t.userDashboard.delete}
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <AddTaxYearSheet
        open={showAddYearSheet}
        onOpenChange={setShowAddYearSheet}
        existingYears={taxReturns.map((tr: TaxReturn) => tr.tax_year)}
        onYearSelect={(year) => { setShowAddYearSheet(false); createNewTaxReturn(year); }}
      />

      {userProfile && unsignedTaxReturn && (
        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          completedTaxReturn={{
            id: unsignedTaxReturn.id,
            tax_year: unsignedTaxReturn.tax_year,
            file_name: unsignedTaxReturn.file_name,
            file_path: unsignedTaxReturn.file_path,
          }}
          userProfile={{
            first_name: userProfile.first_name || '',
            last_name: userProfile.last_name || '',
            email: userProfile.email || '',
            date_of_birth: userProfile.date_of_birth || undefined,
          }}
          onSignatureComplete={() => { refetch(); setSignatureDialogOpen(false); }}
        />
      )}
    </div>
  );
};

// Wrapper that listens to event and opens chat overlay programmatically by simulating click
const ChatOverlayMounted: React.FC<{ userId: string; onMenuOpen: () => void }> = ({ userId, onMenuOpen }) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = () => {
      const trigger = wrapperRef.current?.querySelector('[data-tour="floating-chat-button"]') as HTMLElement | null;
      trigger?.click();
    };
    document.addEventListener('open-overlay-chat', handler);
    return () => document.removeEventListener('open-overlay-chat', handler);
  }, []);
  return (
    <div ref={wrapperRef} style={{ position: 'fixed', left: -99999, top: -99999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden>
      <div style={{ pointerEvents: 'auto' }}>
        <OverlayChatBar userId={userId} onMenuOpen={onMenuOpen} inline />
      </div>
    </div>
  );
};

export default UserTaxReturns;
