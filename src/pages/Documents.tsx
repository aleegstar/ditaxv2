import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, FileText, MoreVertical, Plus, Calendar, ScanLine, Search, SlidersHorizontal, X, Lock, Upload, Shield, Sparkles, Wallet, Building2, HeartPulse, Landmark, Receipt, FileBadge, ChevronRight, ImageIcon } from 'lucide-react';
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
import { useTaxReturnStatus } from '@/hooks/useTaxReturnStatus';
import { DocumentThumbnail } from '@/components/documents/DocumentThumbnail';
import { HomeBottomNav } from '@/components/dashboard/HomeBottomNav';
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
      
      let query = supabase.from('completed_tax_returns').select('tax_year').eq('user_id', user.id);
      
      if (activeTaxFilerId) {
        query = query.eq('tax_filer_id', activeTaxFilerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      const completed = data?.map(item => item.tax_year) || [];
      setCompletedYears(completed);
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
    return <div className="min-h-screen bg-transparent text-slate-800 antialiased overflow-x-hidden">
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

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = { income: [], insurance: [], bank: [], property: [], tax: [], other: [] };
    filteredDocuments.forEach(doc => {
      const cat = categorize(doc.file_name);
      map[cat].push(doc);
    });
    return map;
  }, [filteredDocuments]);

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

      <div className="min-h-screen flex flex-col text-foreground antialiased">
        {/* Workspace Header */}
        <div
          className="px-5 md:px-8 pb-4 border-b border-border/60"
          style={{ paddingTop: 'calc(20px + var(--safe-area-top, env(safe-area-inset-top, 0px)))' }}
        >
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/65 inline-flex items-center gap-1.5 mb-1.5">
                  <Shield className="w-3 h-3" strokeWidth={2.25} />
                  Verschlüsselter Tax Vault
                </p>
                <div className="flex items-center gap-3 flex-wrap" data-tour="documents-year-selector">
                  <h1 className="text-[26px] md:text-[28px] font-semibold text-foreground tracking-[-0.024em] leading-tight">
                    Dokumente
                  </h1>
                  <div className="relative">
                    <button
                      onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-muted/60 hover:bg-muted text-[13px] font-medium text-foreground/85 transition-colors tabular-nums"
                    >
                      Steuerjahr {selectedYear}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-muted-foreground", isYearDropdownOpen && "rotate-180")} strokeWidth={2} />
                    </button>
                    {isYearDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[199]" onClick={() => setIsYearDropdownOpen(false)} />
                        <div className="absolute top-full left-0 mt-2 z-[200] bg-white rounded-xl shadow-2xl ring-1 ring-black/5 border border-border overflow-hidden min-w-[160px]">
                          <div className="max-h-64 overflow-y-auto py-1">
                            {availableYears.map(year => (
                              <button
                                key={year}
                                onClick={() => handleYearSelect(year)}
                                className={cn(
                                  "w-full px-4 py-2.5 text-left text-[13px] transition-colors",
                                  year === selectedYear ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-muted"
                                )}
                              >
                                Steuerjahr {year}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[13.5px] text-muted-foreground mt-2 tabular-nums">
                  <span className="text-foreground font-medium">{totalDocs}</span> {totalDocs === 1 ? 'Dokument' : 'Dokumente'}
                  <span className="mx-1.5 text-muted-foreground/40">·</span>
                  <span className="text-emerald-600 inline-flex items-center gap-1">
                    <Shield className="w-3 h-3" strokeWidth={2.25} />
                    Ende-zu-Ende verschlüsselt
                  </span>
                  {totalThisMonth > 0 && (
                    <>
                      <span className="mx-1.5 text-muted-foreground/40">·</span>
                      <span>{totalThisMonth} diesen Monat</span>
                    </>
                  )}
                </p>
              </div>

              {!isLocked && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  data-tour="document-upload-card"
                  className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 transition-colors flex-shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" strokeWidth={2.25} />
                  Hochladen
                </button>
              )}
            </div>

            {/* Search + filter row */}
            <div className="flex items-center gap-2 relative">
              <div className="relative flex-1 flex items-center rounded-lg bg-muted/50 hover:bg-muted/70 focus-within:bg-white focus-within:ring-1 focus-within:ring-border focus-within:shadow-sm transition-all">
                <Search className="absolute left-3.5 h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Dokumente durchsuchen…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 p-1 rounded-md hover:bg-foreground/5 transition-colors">
                    <X className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-[13px] font-medium transition-colors",
                  showSortDropdown ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">Sortieren</span>
              </button>
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 z-[60] bg-white rounded-xl shadow-2xl ring-1 ring-black/5 border border-border overflow-hidden min-w-[220px]">
                    <div className="py-1">
                      {sortOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-[13px] transition-colors",
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
        </div>

        {/* Locked Banner */}
        {isLocked && (
          <div className="max-w-6xl w-full mx-auto px-5 md:px-8 pt-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" strokeWidth={2} />
              <p className="text-[13px] text-amber-800">{t.documentsPage.lockedBanner}</p>
            </div>
          </div>
        )}

        {/* Document workspace */}
        <div
          className="flex-1 overflow-y-auto px-5 md:px-8 pb-32 pt-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onDragOver={(e) => { e.preventDefault(); if (!isLocked) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="max-w-6xl mx-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              !isLocked ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center py-20 px-6 text-center",
                    isDragging ? "border-primary bg-primary/[0.04]" : "border-border hover:border-foreground/25 bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center mb-4 shadow-sm">
                    <Upload className="w-5 h-5 text-foreground/70" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-[16px] font-semibold text-foreground tracking-[-0.012em] mb-1.5">
                    Dokumente hier ablegen
                  </h2>
                  <p className="text-[13px] text-muted-foreground max-w-md">
                    Lohnausweise, Versicherungen, Bankauszüge — die KI ordnet alles automatisch dem richtigen Bereich zu.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-[12px] text-muted-foreground/75">
                    <Sparkles className="w-3 h-3" strokeWidth={2} />
                    Automatische Kategorisierung · OCR · Verschlüsselung
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <img src={documentsEmptyImg} alt="" className="w-40 h-40 object-contain opacity-70 mb-2" />
                  <h2 className="text-[15px] font-semibold text-foreground tracking-tight mb-1.5">{t.documentsPage.collectReceipts}</h2>
                  <p className="text-[13px] text-muted-foreground max-w-sm">{t.documentsPage.collectReceiptsDescription}</p>
                </div>
              )
            ) : (
              <div className="space-y-9">
                {!isLocked && isDragging && (
                  <div className="rounded-2xl border-2 border-dashed border-primary bg-primary/[0.05] py-10 text-center text-[13.5px] font-medium text-primary">
                    Hier loslassen, um hochzuladen
                  </div>
                )}

                {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map(catKey => {
                  const items = grouped[catKey] || [];
                  if (items.length === 0) return null;
                  const meta = CATEGORY_META[catKey];
                  const Icon = meta.icon;
                  return (
                    <section key={catKey}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", meta.tileBg)}>
                          <Icon className={cn("w-3.5 h-3.5", meta.iconClass)} strokeWidth={2} />
                        </div>
                        <h2 className="text-[14px] font-semibold text-foreground tracking-[-0.008em]">{meta.label}</h2>
                        <span className="text-[12px] text-muted-foreground tabular-nums">{items.length}</span>
                        <div className="flex-1 h-px bg-border/60 ml-2" />
                      </div>
                      <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-white overflow-hidden">
                        {items.map(doc => {
                          const isImage = doc.file_type?.startsWith('image/');
                          const fileExt = doc.file_name?.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';
                          const uploadDate = new Date(doc.upload_date).toLocaleDateString(
                            language === 'de' ? 'de-CH' : 'en-GB',
                            { day: '2-digit', month: 'short', year: 'numeric' }
                          );
                          return (
                            <button
                              key={doc.id}
                              onClick={() => { setSelectedDocument(doc); setShowActionSheet(true); }}
                              className="group w-full flex items-center gap-3.5 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg bg-muted/70 border border-border/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {isImage ? (
                                  <ImageIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                                ) : (
                                  <span className="text-[9px] font-bold text-muted-foreground tracking-tight">{fileExt}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-medium text-foreground tracking-[-0.005em] truncate">{doc.file_name}</p>
                                <p className="text-[11.5px] text-muted-foreground/75 tabular-nums truncate">
                                  {meta.label} · {uploadDate}{doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                                </p>
                              </div>
                              <div className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex-shrink-0">
                                <Shield className="w-2.5 h-2.5" strokeWidth={2.5} />
                                Verschlüsselt
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors flex-shrink-0" strokeWidth={2} />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}

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

        {/* Floating upload FAB - mobile only */}
        {!isLocked && createPortal(
          <div className="fixed bottom-0 right-0 z-[90] pr-5 pb-[calc(20px+var(--safe-area-bottom,env(safe-area-inset-bottom,0px))+84px)] pointer-events-none md:hidden">
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label={t.documentsPage.upload}
              className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full cursor-pointer transition-all duration-200 active:scale-[0.95] hover:scale-[1.03]"
              style={{
                background: 'linear-gradient(180deg, hsl(222,100%,60%) 0%, hsl(222,100%,47%) 100%)',
                boxShadow: '0 8px 24px -4px rgba(0,67,224,0.45), 0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
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