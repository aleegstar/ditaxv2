import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, FileText, MoreVertical, Plus, Calendar, ScanLine, Search, SlidersHorizontal, X, Lock } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
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
import uploadIcon from '@/assets/upload-icon.svg';
import { useTaxReturnStatus } from '@/hooks/useTaxReturnStatus';

// Global image cache to prevent re-fetching
const imageCache = new Map<string, string>();

// Memoized component to render document thumbnail with actual image
const DocumentThumbnail = memo<{
  doc: any;
}>(({
  doc
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(() => {
    // Check cache first
    return imageCache.get(doc.id) || null;
  });
  const [loading, setLoading] = useState(!imageCache.has(doc.id));
  const [error, setError] = useState(false);
  useEffect(() => {
    // Skip if already cached
    if (imageCache.has(doc.id)) {
      setImageUrl(imageCache.get(doc.id)!);
      setLoading(false);
      return;
    }
    let isMounted = true;
    let objectUrl: string | null = null;
    const loadImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        const metadata = doc.metadata as any;

        // Check if document is encrypted
        if (metadata?.encrypted) {
          // Use encrypted document service to decrypt
          const encryptedService = EncryptedDocumentService.getInstance();
          const {
            blob
          } = await encryptedService.downloadOwnDecryptedDocument(doc.id, user.id);
          if (!isMounted) return;
          objectUrl = URL.createObjectURL(blob);
          imageCache.set(doc.id, objectUrl);
          setImageUrl(objectUrl);
        } else {
          // Non-encrypted: get signed URL from documents bucket
          const {
            data,
            error: urlError
          } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
          if (urlError) {
            console.error('Error getting signed URL:', urlError);
            setError(true);
          } else if (data?.signedUrl && isMounted) {
            imageCache.set(doc.id, data.signedUrl);
            setImageUrl(data.signedUrl);
          }
        }
      } catch (err) {
        console.error('Error loading image:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadImage();
    return () => {
      isMounted = false;
      // Don't revoke cached URLs - they may be reused
    };
  }, [doc.id, doc.file_path, doc.metadata]);

  // Show loading state
  if (loading) {
    return <div className="w-full h-full bg-zinc-100 animate-pulse" />;
  }

  // Get file extension for fallback
  const fileExt = doc.file_name?.split('.').pop()?.toUpperCase() || 'FILE';

  // Show error/fallback state
  if (error || !imageUrl) {
    return <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 relative overflow-hidden">
        {/* Decorative gradient orb */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-violet-400/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-tr from-orange-400/15 to-pink-400/15 rounded-full blur-2xl" />
        
        {/* Blue square with pill inside */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center justify-center">
          <span className="px-2.5 py-1 rounded-full bg-white/90 text-[10px] font-bold text-blue-600 shadow-sm">
            {fileExt}
          </span>
        </div>
      </div>;
  }
  return <img src={imageUrl} alt={doc.file_name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setError(true)} />;
});
// Separate content component that uses FormContext
const DocumentsContent: React.FC<{
  selectedYear: string;
  onYearChange: (year: string) => void;
  isTransitionEntry: boolean;
}> = ({
  selectedYear,
  onYearChange,
  isTransitionEntry
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
  const [contentReady, setContentReady] = useState(false);
  const [showContent, setShowContent] = useState(!isTransitionEntry);
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

  // Handle transition entry - wait for content to load then fade in
  useEffect(() => {
    if (isTransitionEntry && contentReady && !showContent) {
      // Small delay to ensure everything is painted
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitionEntry, contentReady, showContent]);

  // Mark content as ready when documents are loaded
  useEffect(() => {
    if (!loading) {
      setContentReady(true);
    }
  }, [loading]);

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
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${user.id}/unassigned/${fileName}`;

        // Upload to storage
        const {
          error: uploadError
        } = await supabase.storage.from('documents').upload(filePath, file);
        if (uploadError) throw uploadError;

        // Save to database
        const {
          error: dbError
        } = await supabase.from('uploaded_documents').insert({
          user_id: user.id,
          tax_filer_id: activeTaxFilerId || null,
          file_name: file.name,
          file_type: file.type,
          file_path: filePath,
          tax_year: selectedYear,
          status: 'active',
          is_assigned_to_checklist: false,
          document_category: 'upload'
        });
        if (dbError) {
          // Clean up uploaded file
          await supabase.storage.from('documents').remove([filePath]);
          throw dbError;
        }
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
            }} className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors active:scale-95">
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
  // Show white screen during transition until content is ready
  if (isTransitionEntry && !showContent) {
    return <div className="min-h-screen bg-white" />;
  }
  return <>
      {showTour && isReady && <DocumentsTour onComplete={completeTour} onSkip={skipTour} />}
      
      <div className={cn("min-h-screen bg-white text-zinc-900 antialiased", isTransitionEntry && "animate-fade-in")}>
        {/* Top Navigation */}
        <SubpageHeader 
          onBack={() => navigate(-1)} 
          showAvatar={true} 
          titleElement={
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

                {isYearDropdownOpen && <>
                  <div className="fixed inset-0 z-[59]" onClick={() => setIsYearDropdownOpen(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[60] bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden min-w-[140px]">
                    <div className="max-h-64 overflow-y-auto py-1">
                      {availableYears.map(year => (
                        <button 
                          key={year} 
                          onClick={() => handleYearSelect(year)} 
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 transition-colors",
                            year === selectedYear ? "text-blue-600 font-medium bg-blue-50" : "text-zinc-700"
                          )}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>
                </>}
              </div>
            </div>
          } 
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-32 bg-white min-h-screen">

          {/* Locked Banner */}
          {isLocked && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-amber-800">
                {t.documentsPage.lockedBanner}
              </p>
            </div>
          )}

          {/* Combined Search and Filter Bar */}
          <div className="mb-6 relative">
            <div className="flex items-center min-h-[56px] px-6 py-4 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden focus-within:border-[#1D64FF] focus-within:ring-[3px] focus-within:ring-[#1D64FF]/20 transition-shadow">
              {/* Search Icon */}
              <div className="pr-3 flex items-center justify-center">
                <Search className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
              </div>
              
              {/* Search Input */}
              <input type="text" placeholder={t.documentsPage.search} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 h-full bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none" />
              
              {/* Filter Button */}
              <button onClick={() => setShowSortDropdown(!showSortDropdown)} className={cn("h-full px-3 flex items-center justify-center border-l border-input hover:bg-muted/50 transition-colors", showSortDropdown && "bg-muted/50")}>
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </button>
              
              {/* Clear Button */}
              {searchQuery && <button onClick={() => setSearchQuery('')} className="h-full px-3 flex items-center justify-center border-l border-input hover:bg-muted/50 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </button>}
            </div>
            
            {/* Sort Dropdown */}
            {showSortDropdown && <>
              <div className="fixed inset-0 z-[59]" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute top-full right-0 mt-2 z-[60] bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden min-w-[200px]">
                <div className="py-1">
                  {sortOptions.map(option => <button key={option.value} onClick={() => {
                  setSortBy(option.value);
                  setShowSortDropdown(false);
                }} className={cn("w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 transition-colors", sortBy === option.value ? "text-blue-600 font-medium bg-blue-50" : "text-zinc-700")}>
                      {option.label}
                    </button>)}
                </div>
              </div>
            </>}
          </div>

          {/* Documents Section */}
          {documents.length > 0 ? (/* Document Grid Container */
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredDocuments.map(doc => {
              const isImage = doc.file_type?.startsWith('image/');
              const fileExt = doc.file_name?.split('.').pop()?.toUpperCase() || 'FILE';
              const uploadDate = new Date(doc.upload_date).toLocaleDateString(language === 'de' ? 'de-CH' : 'en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              return <button key={doc.id} onClick={() => {
                setSelectedDocument(doc);
                setShowActionSheet(true);
              }} className="group bg-white rounded-2xl p-3 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]">
                      {/* Thumbnail Area */}
                      <div className="aspect-square rounded-xl overflow-hidden bg-zinc-100 mb-3">
                        {isImage ? <DocumentThumbnail doc={doc} /> : <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                              <span className="px-2 py-0.5 rounded-full bg-white/90 text-[9px] font-bold text-blue-600">
                                {fileExt}
                              </span>
                            </div>
                          </div>}
                      </div>
                      
                      {/* File Info */}
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-zinc-900 truncate leading-tight">{doc.file_name}</p>
                        <p className="text-xs text-zinc-400">{uploadDate}</p>
                      </div>
                    </button>;
            })}
              </div>
            </div>) : (/* Empty State */
        <div className="bg-zinc-50/70 rounded-2xl p-8">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-6 relative">
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-[40px] opacity-10" />
                    <div className="relative w-full h-full rounded-[32px] bg-white border border-zinc-200 shadow-lg flex items-center justify-center">
                      <FolderOpen strokeWidth={1.5} className="w-10 h-10 text-blue-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-white border border-zinc-200 p-1.5 rounded-full shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">{t.documentsPage.collectReceipts}</h2>
                    <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                      {t.documentsPage.collectReceiptsDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>)}
        </main>

        {/* Hidden File Inputs - Direct upload without confirmation */}
        {/* Galerie/Fotos - ohne capture Attribut */}
        <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInputChange} />
        {/* Dokument scannen - mit capture="environment" für Kamera */}
        <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInputChange} />
        {/* Dateien (PDF, Docs) - ohne capture, spezifische Dateitypen */}
        <input ref={fileInputRef} type="file" accept="application/pdf,.doc,.docx,.xls,.xlsx,.txt" multiple className="hidden" onChange={handleFileInputChange} />

        {/* Floating Upload Button - only show if not locked */}
        {!isLocked && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <button onClick={() => fileInputRef.current?.click()} data-tour="document-upload-card" className="flex items-center gap-3 pl-2.5 pr-5 py-2 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 border-t border-blue-400 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                <img src={uploadIcon} alt="Upload" className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-semibold text-white font-jakarta tracking-wide">
                  {t.documentsPage.upload}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Upload Action Sheet */}
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
  
  // URL-Parameter hat Priorität für das Steuerjahr
  const yearFromUrl = searchParams.get('year');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(
    yearFromUrl || currentYear.toString()
  );
  const isTransitionEntry = searchParams.get('transition') === 'true';
  
  // Handler für Jahreswechsel - aktualisiert auch die URL
  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    navigate(`/documents?year=${newYear}`, { replace: true });
  };
  
  // Redirect to person selection if multiple filers exist and no selection confirmed
  useEffect(() => {
    if (hasMultipleFilers && !selectionConfirmed) {
      navigate('/select-person', { replace: true });
    }
  }, [hasMultipleFilers, selectionConfirmed, navigate]);

  // Show loading while redirecting
  if (hasMultipleFilers && !selectionConfirmed) {
    return null;
  }

  return <FormProvider taxYear={selectedYear}>
      <DocumentsContent selectedYear={selectedYear} onYearChange={handleYearChange} isTransitionEntry={isTransitionEntry} />
    </FormProvider>;
};
export default Documents;