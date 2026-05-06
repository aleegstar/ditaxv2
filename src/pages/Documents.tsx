import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, FileText, MoreVertical, Plus, Calendar, ScanLine, Search, SlidersHorizontal, X, Lock } from 'lucide-react';
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
import { useTaxReturnStatus } from '@/hooks/useTaxReturnStatus';
import { DocumentThumbnail } from '@/components/documents/DocumentThumbnail';

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

  // Generate year options (2024-2034) - memoized to prevent infinite loops
  const allYears = React.useMemo(() => Array.from({
    length: 11
  }, (_, i) => (2024 + i).toString()), []);
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
  return <>
      {showTour && isReady && <DocumentsTour onComplete={completeTour} onSkip={skipTour} />}

      <div className="min-h-screen flex flex-col text-foreground antialiased">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pb-3"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2" data-tour="documents-year-selector">
            <span className="text-lg font-semibold text-foreground">{t.documentsPage.taxYear}</span>
            <div className="relative">
              <button
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="flex items-center gap-1 text-base text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{selectedYear}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isYearDropdownOpen && "rotate-180")} strokeWidth={1.5} />
              </button>
              {isYearDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[199]" onClick={() => setIsYearDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 z-[200] bg-white rounded-xl shadow-2xl ring-1 ring-black/5 border border-zinc-200 overflow-hidden min-w-[140px]">
                    <div className="max-h-64 overflow-y-auto py-1">
                      {availableYears.map(year => (
                        <button
                          key={year}
                          onClick={() => handleYearSelect(year)}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-sm transition-colors",
                            year === selectedYear ? "text-primary font-medium bg-primary/10" : "text-zinc-800 hover:bg-zinc-100"
                          )}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.05] active:scale-[0.95]"
            style={{
              background: 'rgb(255,255,255)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.12)',
            }}
          >
            <X className="w-4 h-4 text-zinc-800" strokeWidth={2} />
          </button>
        </div>

        {/* Locked Banner */}
        {isLocked && (
          <div className="mx-5 mb-3 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-sm text-amber-800">{t.documentsPage.lockedBanner}</p>
          </div>
        )}

        {/* Search bar */}
        <div className="px-5 mb-4 relative">
          <div className="relative flex items-center rounded-full overflow-hidden bg-white border border-zinc-200 shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <input
              type="text"
              placeholder={t.documentsPage.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-[18px] bg-transparent text-[15px] font-medium tracking-tight text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className={cn("p-1.5 rounded-lg hover:bg-zinc-100 transition-colors", showSortDropdown && "bg-zinc-100")}
              >
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-[59]" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute right-5 mt-2 z-[60] bg-white rounded-xl shadow-2xl ring-1 ring-black/5 border border-zinc-200 overflow-hidden min-w-[200px]">
                <div className="py-1">
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => { setSortBy(option.value); setShowSortDropdown(false); }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm transition-colors",
                        sortBy === option.value ? "text-primary font-medium bg-primary/10" : "text-zinc-800 hover:bg-zinc-100"
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

        {/* Document grid / empty state */}
        <div className="flex-1 overflow-y-auto px-5 pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : documents.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredDocuments.map(doc => {
                const isImage = doc.file_type?.startsWith('image/');
                const fileExt = doc.file_name?.split('.').pop()?.toUpperCase() || 'FILE';
                const uploadDate = new Date(doc.upload_date).toLocaleDateString(
                  language === 'de' ? 'de-CH' : 'en-GB',
                  { day: '2-digit', month: '2-digit', year: 'numeric' }
                );
                return (
                  <button
                    key={doc.id}
                    onClick={() => { setSelectedDocument(doc); setShowActionSheet(true); }}
                    className="group relative flex flex-col bg-white p-3 rounded-2xl text-left transition-all duration-300 cursor-pointer border border-zinc-200 hover:border-zinc-300 shadow-sm hover:shadow-md"
                  >
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-50 mb-3">
                      {isImage ? (
                        <DocumentThumbnail doc={doc} />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 relative overflow-hidden">
                          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full blur-2xl" />
                          <div className="relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(221,100%,42%)] shadow-lg shadow-primary/25 flex items-center justify-center">
                            <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-primary">
                              {fileExt}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-1 pb-1">
                      <p className="text-sm font-medium text-foreground truncate leading-snug mb-0.5">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">{uploadDate}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(221,100%,42%)] flex items-center justify-center mb-5 shadow-[0_8px_24px_-6px_rgba(29,100,255,0.3)]">
                <FolderOpen strokeWidth={1.5} className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight mb-1">{t.documentsPage.collectReceipts}</h2>
              <p className="text-sm text-muted-foreground max-w-[260px] mx-auto text-center leading-relaxed">
                {t.documentsPage.collectReceiptsDescription}
              </p>
            </div>
          )}
        </div>

        {/* Hidden File Inputs */}
        <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInputChange} />
        <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInputChange} />
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" multiple className="hidden" onChange={handleFileInputChange} />

        {/* Floating upload FAB - icon only, bottom right */}
        {!isLocked && createPortal(
          <div className="fixed bottom-0 right-0 z-[90] pr-5 pb-[calc(max(20px,env(safe-area-inset-bottom))+84px)] pointer-events-none">
            <button
              onClick={() => fileInputRef.current?.click()}
              data-tour="document-upload-card"
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
    </>;
};

// Main component that wraps DocumentsContent with FormProvider
const Documents: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasMultipleFilers, selectionConfirmed } = useTaxFiler();
  
  const yearFromUrl = searchParams.get('year');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(
    yearFromUrl || currentYear.toString()
  );
  
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