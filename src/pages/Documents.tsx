import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, FileText, MoreVertical, Plus, Calendar, ScanLine, Search, SlidersHorizontal, X, Lock, Upload, Shield, Sparkles, Wallet, Building2, HeartPulse, Landmark, Receipt, FileBadge, ChevronRight, ImageIcon, Menu } from 'lucide-react';
import ditaxLogoMask from '@/assets/ditax-logo-mask.svg';
import { ProfileWithNotifications } from '@/components/ui/profile-with-notifications';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormContext, FormProvider } from '@/contexts';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import EnhancedDocumentUploader from '@/components/EnhancedDocumentUploader';
import { DocumentsTour } from '@/components/DocumentsTour';
import { useDocumentsTour } from '@/contexts/DocumentsTourContext';
import { useI18n } from '@/contexts/I18nContext';

import DocumentActionSheet from '@/components/documents/DocumentActionSheet';
import UploadActionSheet from '@/components/documents/UploadActionSheet';
import { de, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useStatusBar } from '@/hooks/useStatusBar';
import { useProfile } from '@/hooks/useProfile';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { sanitizeFileName } from '@/utils/fileValidation';
import uploadIcon from '@/assets/upload-icon.svg';
import documentsEmptyImg from '@/assets/documents-empty.svg';
import documentsHero from '@/assets/documents-hero.webp';
import { useTaxReturnStatus } from '@/hooks/useTaxReturnStatus';
import { DocumentThumbnail } from '@/components/documents/DocumentThumbnail';
import { HomeBottomNav } from '@/components/dashboard/HomeBottomNav';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
import { YearPillSelector } from '@/components/dashboard/YearPillSelector';
import { useSidebar } from '@/contexts/SidebarContext';
import { getAvailableTaxYears } from '@/config/availableTaxYears';

// Separate content component that uses FormContext
// Separate content component that uses FormContext
const DocumentsContent: React.FC<{
  selectedYear: string;
  onYearChange: (year: string) => void;
}> = ({
  selectedYear,
  onYearChange,
}) => {
  const { t, language } = useI18n();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [completedYears, setCompletedYears] = useState<string[]>([]);
  const [signedYearInfo, setSignedYearInfo] = useState<Record<string, { signed_at: string; documents_deleted_at: string | null }>>({});
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [uploaderKey, setUploaderKey] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const scanInputRef = React.useRef<HTMLInputElement>(null);
  const [hasFilesInUploader, setHasFilesInUploader] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'type'>('date_desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  
  const {
    checklistItems,
    generateChecklist,
    taxYear,
    formDataLoaded
  } = useFormContext();
  const { activeTaxFilerId } = useTaxFiler();
  const {
    showTour,
    isReady,
    completeTour,
    skipTour
  } = useDocumentsTour();
  const {
    profile
  } = useProfile();
  const { setMenuSheetOpen } = useSidebar();

  // Check if tax return is locked (paid/completed)
  const { isLocked } = useTaxReturnStatus(selectedYear);

  // Set light status bar for this page (white background, dark text)
  useStatusBar('light');

  // System-managed tax years (see src/config/availableTaxYears.ts)
  const allYears = React.useMemo(() => getAvailableTaxYears(), []);
  const mountedRef = React.useRef(true);

  // Ref to track if documents are currently being loaded to prevent duplicate requests
  const loadingRef = React.useRef(false);
  const loadCompletedTaxYears = useCallback(async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      
      let query = supabase
        .from('completed_tax_returns')
        .select('tax_year, signed_at, documents_deleted_at')
        .eq('user_id', user.id);
      
      if (activeTaxFilerId) {
        query = query.eq('tax_filer_id', activeTaxFilerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      const completed = data?.map(item => item.tax_year) || [];
      setCompletedYears(completed);
      const info: Record<string, { signed_at: string; documents_deleted_at: string | null }> = {};
      for (const item of data || []) {
        if (item.signed_at) {
          info[item.tax_year] = {
            signed_at: item.signed_at,
            documents_deleted_at: item.documents_deleted_at,
          };
        }
      }
      setSignedYearInfo(info);
    } catch (error) {
      console.error('Error loading completed tax years:', error);
    }
  }, [activeTaxFilerId]);
  const loadDocuments = useCallback(async (showLoadingSpinner = true) => {
    // Prevent concurrent loading requests
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (showLoadingSpinner) {
      setLoading(true);
    }
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      let query = supabase.from('uploaded_documents').select('*').eq('user_id', user.id).eq('tax_year', selectedYear).eq('status', 'active');
      
      if (activeTaxFilerId) {
        query = query.eq('tax_filer_id', activeTaxFilerId);
      }
      
      const {
        data,
        error
      } = await query.order('upload_date', {
        ascending: false
      });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: t.documentsPage.error,
        description: t.documentsPage.loadError,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [selectedYear, toast, activeTaxFilerId]);

  // Initial load effect
  useEffect(() => {
    mountedRef.current = true;
    loadCompletedTaxYears();
    return () => {
      mountedRef.current = false;
    };
  }, [loadCompletedTaxYears]);

  // Load documents when year or person changes
  useEffect(() => {
    if (mountedRef.current) {
      loadDocuments();
    }
  }, [selectedYear, loadDocuments, activeTaxFilerId]);

  // Reload on visibility change (returning to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mountedRef.current) {
        // Soft reload when returning to page - no spinner
        loadDocuments(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadDocuments]);

  // Generate checklist when form data is loaded
  useEffect(() => {
    if (selectedYear === taxYear && formDataLoaded && mountedRef.current) {
      generateChecklist();
    }
  }, [selectedYear, taxYear, formDataLoaded, generateChecklist]);

  // Filter available years
  useEffect(() => {
    const available = allYears.filter(year => !completedYears.includes(year));
    // Newest year first (descending)
    available.sort((a, b) => Number(b) - Number(a));
    setAvailableYears(available);
    if (available.length > 0 && completedYears.includes(selectedYear)) {
      onYearChange(available[0]);
    }
  }, [completedYears, selectedYear, onYearChange, allYears]);

  // Direct upload function - uploads files immediately without confirmation step
  const uploadFilesDirectly = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: t.documentsPage.error,
        description: t.documentsPage.pleaseLogin,
        variant: "destructive"
      });
      return;
    }
    let successCount = 0;
    let errorCount = 0;
    const encryptedDocService = EncryptedDocumentService.getInstance();
    for (const file of fileArray) {
      try {
        // Validate file
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: t.documentsPage.error,
            description: `${file.name} ${t.documentsPage.fileTooLarge}`,
            variant: "destructive"
          });
          errorCount++;
          continue;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: t.documentsPage.error,
            description: `${file.name} ${t.documentsPage.invalidFormat}`,
            variant: "destructive"
          });
          errorCount++;
          continue;
        }

        // Use encrypted upload service (consistent with DocumentUploadSheet)
        await encryptedDocService.uploadEncryptedDocument(
          file,
          null, // no checklist item
          user.id,
          selectedYear,
          undefined, // no checklist item title
          activeTaxFilerId || null
        );
        successCount++;
      } catch (error) {
        console.error('Error uploading file:', error);
        errorCount++;
      }
    }
    if (successCount > 0) {
      toast({
        title: t.documentsPage.uploadSuccess,
        description: `${successCount} ${successCount === 1 ? t.documentChecklist.file : t.documentChecklist.files} ${t.documentChecklist.uploaded}`
      });
      // Use soft reload (no spinner) to avoid flicker since user just uploaded
      loadDocuments(false);
    }
    if (errorCount > 0 && successCount === 0) {
      toast({
        title: t.documentsPage.error,
        description: t.documentsPage.uploadFailed,
        variant: "destructive"
      });
    }
  };

  // Handle file input change for direct upload
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFilesDirectly(e.target.files);
      // Reset input so the same file can be selected again
      e.target.value = '';
    }
  };
  const handleYearSelect = (year: string) => {
    onYearChange(year);
    setIsYearDropdownOpen(false);
  };
  const handleUploadSuccess = () => {
    loadDocuments();
    setUploaderKey(prev => prev + 1);
    setShowUploader(false);
    setSelectedFiles([]);
    toast({
      title: t.documentsPage.uploadSuccess,
      description: t.documentsPage.uploadSuccessDescription.replace('{count}', 'Deine')
    });
  };

  // Filter and sort documents
  const filteredDocuments = documents.filter(doc => doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => {
    switch (sortBy) {
      case 'date_desc':
        return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
      case 'date_asc':
        return new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
      case 'name_asc':
        return a.file_name.localeCompare(b.file_name, 'de');
      case 'name_desc':
        return b.file_name.localeCompare(a.file_name, 'de');
      case 'type':
        return (a.file_type || '').localeCompare(b.file_type || '', 'de');
      default:
        return 0;
    }
  });

  // Sort options - translated
  const sortOptions = useMemo(() => [{
    value: 'date_desc',
    label: t.documentsPage.sortByDateDesc
  }, {
    value: 'date_asc',
    label: t.documentsPage.sortByDateAsc
  }, {
    value: 'name_asc',
    label: t.documentsPage.sortByNameAsc
  }, {
    value: 'name_desc',
    label: t.documentsPage.sortByNameDesc
  }, {
    value: 'type',
    label: t.documentsPage.sortByType
  }] as const, [t]);

  // Format file size
  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Show uploader view (light theme)
  if (showUploader || hasFilesInUploader) {
    return <div className="min-h-screen bg-white text-slate-800 antialiased overflow-x-hidden">
        <div className="min-h-screen flex flex-col w-full relative">
          
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
              <button onClick={() => {
              setShowUploader(false);
              setHasFilesInUploader(false);
              setSelectedFiles([]);
            }} className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-transparent hover:bg-slate-50 transition-colors active:scale-95">
                <ArrowLeft className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
              </button>

              <h1 className="text-base font-semibold tracking-tight text-slate-900">
                {t.documentsPage.uploadDocuments}
              </h1>
              <div className="w-10" />
            </div>
          </header>
          
          <div className="flex-1 flex flex-col w-full relative px-4 sm:px-6 pb-8 max-w-3xl mx-auto">
            <EnhancedDocumentUploader key={uploaderKey} onBack={() => {
            setShowUploader(false);
            setHasFilesInUploader(false);
            setSelectedFiles([]);
          }} onDocumentSubmitted={handleUploadSuccess} hasUploadedFiles={documents.length > 0} onPreviewChange={setHasFilesInUploader} initialFiles={selectedFiles} />
          </div>
        </div>
      </div>;
  }
  // Intelligent categorization based on filename heuristics
  const categorize = (name: string): keyof typeof CATEGORY_META => {
    const n = (name || '').toLowerCase();
    if (/(lohn|salary|gehalt|payslip|lohnausweis)/.test(n)) return 'income';
    if (/(versicher|krankenkasse|insurance|pr[aä]mie|säule|saule|3a|pension|bvg|ahv)/.test(n)) return 'insurance';
    if (/(bank|konto|kontoauszug|zinsen|depot|wertschrift|securities|statement)/.test(n)) return 'bank';
    if (/(liegenschaft|miete|hypothek|eigenheim|immobil|property|mortgage|rent)/.test(n)) return 'property';
    if (/(steuer|tax|veranlagung|rechnung)/.test(n)) return 'tax';
    return 'other';
  };

  // Smart AI hint based on filename — gentle, optional
  const detectHint = (name: string): string | null => {
    const n = (name || '').toLowerCase();
    if (/(lohnausweis|lohn|salary|gehalt|payslip)/.test(n)) return 'Vermutlich Lohnausweis';
    if (/(krankenkasse|insurance|prämie|praemie)/.test(n)) return 'Vermutlich Krankenkasse';
    if (/(säule|saule|3a|pension|bvg)/.test(n)) return 'Vermutlich Vorsorge';
    if (/(kontoauszug|bank|depot|wertschrift)/.test(n)) return 'Vermutlich Bankauszug';
    if (/(hypothek|mortgage|liegenschaft|eigenheim)/.test(n)) return 'Vermutlich Liegenschaft';
    if (/(steuer|veranlagung|tax)/.test(n)) return 'Vermutlich Steuerunterlage';
    if (/(quittung|rechnung|invoice|receipt)/.test(n)) return 'Vermutlich Beleg';
    return null;
  };

  // Chronological grouping — Heute / Diese Woche / Monat YYYY
  const chronoGroups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000; // last 7d window (excl today)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    type Group = { key: string; label: string; items: any[] };
    const buckets: Record<string, Group> = {};
    const order: string[] = [];
    const ensure = (key: string, label: string) => {
      if (!buckets[key]) { buckets[key] = { key, label, items: [] }; order.push(key); }
      return buckets[key];
    };

    const monthFmt = new Intl.DateTimeFormat(language === 'de' ? 'de-CH' : 'en-GB', { month: 'long', year: 'numeric' });

    filteredDocuments.forEach(doc => {
      const ts = new Date(doc.upload_date).getTime();
      let g: Group;
      if (ts >= startOfToday) g = ensure('today', language === 'de' ? 'Heute' : 'Today');
      else if (ts >= startOfWeek) g = ensure('week', language === 'de' ? 'Diese Woche' : 'This week');
      else if (ts >= startOfMonth) g = ensure('month', language === 'de' ? 'Diesen Monat' : 'This month');
      else {
        const d = new Date(doc.upload_date);
        const key = `m-${d.getFullYear()}-${d.getMonth()}`;
        const label = monthFmt.format(d).replace(/^\w/, c => c.toUpperCase());
        g = ensure(key, label);
      }
      g.items.push(doc);
    });

    return order.map(k => buckets[k]);
  }, [filteredDocuments, language]);

  const totalDocs = documents.length;
  const totalThisMonth = useMemo(() => {
    const now = new Date();
    return documents.filter(d => {
      const dt = new Date(d.upload_date);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    }).length;
  }, [documents]);

  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLocked) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFilesDirectly(e.dataTransfer.files);
    }
  };

  return <>
      {showTour && isReady && <DocumentsTour onComplete={completeTour} onSkip={skipTour} />}

      <div className="min-h-screen flex flex-col text-foreground antialiased bg-background">
        {/* Compact Header */}
        <div
          className="px-5 md:px-8"
          style={{ paddingTop: 'calc(20px + var(--safe-area-top, env(safe-area-inset-top, 0px)))' }}
        >
          <div className="max-w-[960px] mx-auto w-full pb-4">
            {/* Mobile top bar — matches main page (logo + bell + menu) */}
            <header className="md:hidden flex pb-5 items-center justify-between">
              <div className="flex items-center">
                <img src={ditaxLogoMask} alt="ditax" className="h-[22px] w-auto object-contain" />
              </div>
              <div className="flex items-center gap-1 -mr-1">
                <ProfileWithNotifications avatarUrl={profile?.avatar_url} firstName={profile?.first_name} />
                <button
                  onClick={() => setMenuSheetOpen(true)}
                  aria-label="Menü"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                >
                  <Menu className="w-[17px] h-[17px]" strokeWidth={1.75} />
                </button>
              </div>
            </header>

            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h1 className="text-[22px] md:text-[24px] font-semibold text-foreground tracking-[-0.022em] leading-[1.1]">
                    Dokumente
                  </h1>
                  <TaxFilerSelector className="md:hidden flex-shrink-0" />
                </div>
                <div data-tour="documents-year-selector">
                  <YearPillSelector
                    years={availableYears}
                    selectedYear={selectedYear}
                    onSelect={handleYearSelect}
                  />
                </div>
              </div>


              {!isLocked && (
                <button
                  onClick={() => navigate(`/documents/bulk?year=${selectedYear}`)}
                  data-tour="document-upload-card"
                  className="hidden md:inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white transition-all flex-shrink-0 hover:shadow-md active:scale-[0.98] shadow-sm"
                  style={{ background: 'linear-gradient(180deg, #1E3A5F 0%, #0F1B3D 100%)' }}
                >
                  <Upload className="w-3.5 h-3.5" strokeWidth={2.25} />
                  Hochladen
                </button>
              )}
            </div>
          </div>
        </div>



        {/* Sticky search + sort */}

        <div
          className="sticky top-0 z-30 px-5 md:px-8 py-2.5 bg-background/85 backdrop-blur-md"
          style={{ paddingTop: 'calc(10px + var(--safe-area-top, env(safe-area-inset-top, 0px)))' }}
        >
          <div className="max-w-[960px] mx-auto w-full flex items-center gap-2 relative">
            <div className="relative flex-1 flex items-center rounded-xl bg-[#F7F7F5] hover:bg-[#F2F2EF] focus-within:bg-white focus-within:ring-1 focus-within:ring-border focus-within:shadow-sm transition-all">
              <Search className="absolute left-3.5 h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={2} />
              <input
                type="text"
                placeholder="In Dokumenten suchen"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-10 pr-9 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 p-1 rounded-md hover:bg-foreground/5 transition-colors">
                  <X className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              aria-label="Sortieren"
              className={cn(
                "inline-flex items-center justify-center h-9 w-9 rounded-xl transition-colors",
                showSortDropdown ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-[#F2F2EF]"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-[59]" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 z-[60] bg-white rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden min-w-[220px]">
                  <div className="py-1">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                        className={cn(
                          "w-full px-3.5 py-2 text-left text-[13px] transition-colors",
                          sortBy === option.value ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-muted"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Locked Banner */}
        {isLocked && (
          <div className="max-w-[960px] w-full mx-auto px-5 md:px-8 pt-2">
            <div className="p-3 bg-amber-50 rounded-xl flex items-center gap-3">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" strokeWidth={2} />
              <p className="text-[13px] text-amber-800">{t.documentsPage.lockedBanner}</p>
            </div>
          </div>
        )}

        {/* Retention Banner: 30 Tage nach Unterschrift werden Belege gelöscht */}
        {(() => {
          const info = signedYearInfo[selectedYear];
          if (!info) return null;
          const signedAt = new Date(info.signed_at);
          const deletionDate = new Date(signedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          const now = new Date();
          const deletionDateStr = deletionDate.toLocaleDateString('de-CH', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          });

          if (info.documents_deleted_at) {
            return (
              <div className="max-w-[960px] w-full mx-auto px-5 md:px-8 pt-2">
                <div className="p-3 bg-muted/60 border border-border rounded-xl flex items-start gap-3">
                  <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                    Die hochgeladenen Belege für {selectedYear} wurden gemäss unserer 30-Tage-Regel gelöscht.
                    Deine unterschriebene Steuererklärung bleibt als PDF verfügbar.
                  </p>
                </div>
              </div>
            );
          }

          const daysLeft = Math.max(0, Math.ceil((deletionDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
          return (
            <div className="max-w-[960px] w-full mx-auto px-5 md:px-8 pt-2">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-[12.5px] text-amber-900 leading-relaxed">
                  Diese Belege werden am <span className="font-medium">{deletionDateStr}</span> automatisch gelöscht
                  {daysLeft > 0 ? ` (noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'})` : ''}.
                  Lade sie bei Bedarf vorher herunter. Deine unterschriebene Steuererklärung bleibt als PDF verfügbar.
                </p>
              </div>
            </div>
          );
        })()}


        {/* Document workspace */}
        <div
          className="flex-1 overflow-y-auto px-5 md:px-8 pb-32 md:pb-12 pt-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onDragOver={(e) => { e.preventDefault(); if (!isLocked) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="max-w-[960px] mx-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              !isLocked ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full rounded-2xl transition-all flex flex-col items-center justify-center py-16 px-6 text-center",
                    isDragging ? "bg-primary/[0.04] ring-2 ring-primary/30" : "bg-[#F7F7F5] hover:bg-[#F2F2EF]"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-[0_1px_2px_rgba(15,27,61,0.06),0_8px_24px_-12px_rgba(15,27,61,0.12)]">
                    <Upload className="w-4.5 h-4.5 text-foreground/70" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-[16px] font-semibold text-foreground tracking-[-0.012em] mb-1.5">
                    Dein Tresor ist noch leer
                  </h2>
                  <p className="text-[13px] text-muted-foreground max-w-[360px] leading-[1.5]">
                    Lade einfach alles hoch, was du übers Jahr sammelst. Wir sortieren es später für dich.
                  </p>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <img src={documentsEmptyImg} alt="" className="w-40 h-40 object-contain opacity-70 mb-2" />
                  <h2 className="text-[15px] font-semibold text-foreground tracking-tight mb-1.5">{t.documentsPage.collectReceipts}</h2>
                  <p className="text-[13px] text-muted-foreground max-w-sm">{t.documentsPage.collectReceiptsDescription}</p>
                </div>
              )
            ) : (
              <div className="space-y-6">
                {!isLocked && isDragging && (
                  <div className="rounded-2xl bg-primary/[0.05] ring-2 ring-primary/30 py-8 text-center text-[13px] font-medium text-primary">
                    Hier loslassen, um hochzuladen
                  </div>
                )}

                {chronoGroups.map(group => (
                  <section key={group.key}>
                    <div className="flex items-baseline gap-2 mb-1.5 px-2">
                      <h2 className="text-[10.5px] font-semibold text-muted-foreground/70 uppercase tracking-[0.08em]">{group.label}</h2>
                      <span className="text-[10.5px] text-muted-foreground/45 tabular-nums">{group.items.length}</span>
                    </div>
                    <div className="space-y-px">
                      {group.items.map(doc => {
                        const isImage = doc.file_type?.startsWith('image/');
                        const fileExt = doc.file_name?.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';
                        const uploadDate = new Date(doc.upload_date).toLocaleDateString(
                          language === 'de' ? 'de-CH' : 'en-GB',
                          { day: '2-digit', month: 'short' }
                        );
                        const hint = detectHint(doc.file_name);
                        return (
                          <button
                            key={doc.id}
                            onClick={() => { setSelectedDocument(doc); setShowActionSheet(true); }}
                            className="group w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left hover:bg-[#F7F7F5] transition-colors"
                          >
                            <div className="w-9 h-9 rounded-md bg-[#F7F7F5] flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {isImage ? (
                                <DocumentThumbnail doc={doc} />
                              ) : (
                                <span className="text-[9px] font-bold text-muted-foreground/70 tracking-tight">{fileExt}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <p className="text-[13.5px] font-medium text-foreground tracking-[-0.008em] truncate flex-shrink min-w-0">{doc.file_name}</p>
                              {hint && (
                                <span className="hidden sm:inline-flex items-center text-[10.5px] font-medium text-foreground/70 bg-foreground/[0.05] px-1.5 py-0.5 rounded-md flex-shrink-0">
                                  {hint}
                                </span>
                              )}
                            </div>
                            <p className="text-[11.5px] text-muted-foreground/70 tabular-nums flex-shrink-0 hidden sm:block">
                              {uploadDate}
                              {doc.file_size ? <span className="text-muted-foreground/40"> · {formatFileSize(doc.file_size)}</span> : null}
                            </p>
                            <p className="text-[11px] text-muted-foreground/60 tabular-nums flex-shrink-0 sm:hidden">
                              {uploadDate}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {filteredDocuments.length === 0 && searchQuery && (
                  <div className="py-12 text-center">
                    <p className="text-[13px] text-muted-foreground">Keine Dokumente für „{searchQuery}" gefunden</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>



        {/* Hidden File Inputs */}
        <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInputChange} />
        <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInputChange} />
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" multiple className="hidden" onChange={handleFileInputChange} />

        {/* Sticky bottom upload bar — mobile only, sits above bottom nav */}
        {!isLocked && createPortal(
          <div
            className="fixed right-5 z-[10005] md:hidden pointer-events-none"
            style={{ bottom: 'calc(88px + var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)))' }}
          >
            <button
              onClick={() => setShowUploadSheet(true)}
              aria-label={t.documentsPage.upload}
              data-tour="document-upload-floating"
              className="pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-[0.94]"
              style={{
                background: 'linear-gradient(180deg, #1E3A5F 0%, #0F1B3D 100%)',
                boxShadow: '0 14px 32px -8px rgba(15,27,61,0.5), 0 2px 6px rgba(0,0,0,0.1)',
              }}
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>,
          document.body
        )}

        <UploadActionSheet
          open={showUploadSheet}
          onClose={() => setShowUploadSheet(false)}
          onPhoto={() => galleryInputRef.current?.click()}
          onScan={() => scanInputRef.current?.click()}
          onFile={() => fileInputRef.current?.click()}
        />

        <DocumentActionSheet document={selectedDocument} open={showActionSheet} onClose={() => {
          setShowActionSheet(false);
          setSelectedDocument(null);
        }} onUpdate={loadDocuments} availableYears={allYears} isLocked={isLocked} />
      </div>

      <HomeBottomNav
        onChatClick={() => navigate('/chat')}
        onDocumentsClick={() => {}}
        onMenuClick={() => {}}
        onActionClick={() => navigate('/')}
        activeTab="documents"
      />
    </>;
};

// Category metadata for intelligent grouping
const CATEGORY_META = {
  income:    { label: 'Einkommen',                  icon: Wallet,     iconClass: 'text-emerald-600', tileBg: 'bg-emerald-50' },
  insurance: { label: 'Versicherungen & Vorsorge',  icon: HeartPulse, iconClass: 'text-rose-600',    tileBg: 'bg-rose-50' },
  bank:      { label: 'Bank & Wertschriften',       icon: Landmark,   iconClass: 'text-blue-600',    tileBg: 'bg-blue-50' },
  property:  { label: 'Immobilien',                 icon: Building2,  iconClass: 'text-violet-600',  tileBg: 'bg-violet-50' },
  tax:       { label: 'Steuern',                    icon: Receipt,    iconClass: 'text-amber-600',   tileBg: 'bg-amber-50' },
  other:     { label: 'Sonstige Unterlagen',        icon: FileBadge,  iconClass: 'text-slate-600',   tileBg: 'bg-slate-100' },
} as const;

// Main component that wraps DocumentsContent with FormProvider
const Documents: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasMultipleFilers, selectionConfirmed } = useTaxFiler();
  
  const yearFromUrl = searchParams.get('year');
  const allowedYears = React.useMemo(() => getAvailableTaxYears(), []);
  const initialYear = yearFromUrl && allowedYears.includes(yearFromUrl)
    ? yearFromUrl
    : allowedYears[allowedYears.length - 1];
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);

  // If URL holds an unavailable year, normalize it.
  useEffect(() => {
    if (yearFromUrl && !allowedYears.includes(yearFromUrl)) {
      navigate(`/documents?year=${initialYear}`, { replace: true });
    }
  }, [yearFromUrl, allowedYears, initialYear, navigate]);

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    navigate(`/documents?year=${newYear}`, { replace: true });
  };
  
  useEffect(() => {
    if (hasMultipleFilers && !selectionConfirmed) {
      navigate('/select-person', { replace: true });
    }
  }, [hasMultipleFilers, selectionConfirmed, navigate]);

  if (hasMultipleFilers && !selectionConfirmed) {
    return null;
  }

  return <FormProvider taxYear={selectedYear}>
      <DocumentsContent selectedYear={selectedYear} onYearChange={handleYearChange} />
    </FormProvider>;
};
export default Documents;