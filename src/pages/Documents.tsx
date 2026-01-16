import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, FileText, MoreVertical, Plus, Calendar, ScanLine, Search, ArrowUpDown } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormContext, FormProvider } from '@/contexts';
import EnhancedDocumentUploader from '@/components/EnhancedDocumentUploader';
import { DocumentsTour } from '@/components/DocumentsTour';
import { useDocumentsTour } from '@/contexts/DocumentsTourContext';
import CameraCapture from '@/components/documents/CameraCapture';
import DocumentActionSheet from '@/components/documents/DocumentActionSheet';
import UploadActionSheet from '@/components/documents/UploadActionSheet';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useStatusBar } from '@/hooks/useStatusBar';
import { useProfile } from '@/hooks/useProfile';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import uploadIcon from '@/assets/upload-icon.svg';

// Global image cache to prevent re-fetching
const imageCache = new Map<string, string>();

// Memoized component to render document thumbnail with actual image
const DocumentThumbnail = memo<{ doc: any }>(({ doc }) => {
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        
        const metadata = doc.metadata as any;
        
        // Check if document is encrypted
        if (metadata?.encrypted) {
          // Use encrypted document service to decrypt
          const encryptedService = EncryptedDocumentService.getInstance();
          const { blob } = await encryptedService.downloadOwnDecryptedDocument(doc.id, user.id);
          
          if (!isMounted) return;
          
          objectUrl = URL.createObjectURL(blob);
          imageCache.set(doc.id, objectUrl);
          setImageUrl(objectUrl);
        } else {
          // Non-encrypted: get signed URL from documents bucket
          const { data, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.file_path, 3600);
          
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
    return (
      <div className="w-full h-full bg-zinc-100 animate-pulse" />
    );
  }

  // Get file extension for fallback
  const fileExt = doc.file_name?.split('.').pop()?.toUpperCase() || 'FILE';

  // Show error/fallback state
  if (error || !imageUrl) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 relative overflow-hidden">
        {/* Decorative gradient orb */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-violet-400/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-tr from-orange-400/15 to-pink-400/15 rounded-full blur-2xl" />
        
        {/* Blue square with pill inside */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center justify-center">
          <span className="px-2.5 py-1 rounded-full bg-white/90 text-[10px] font-bold text-blue-600 shadow-sm">
            {fileExt}
          </span>
        </div>
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={doc.file_name}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setError(true)}
    />
  );
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [completedYears, setCompletedYears] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [uploaderKey, setUploaderKey] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
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
  const {
    showTour,
    isReady,
    completeTour,
    skipTour
  } = useDocumentsTour();
  const { profile } = useProfile();

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
  const allYears = React.useMemo(() => 
    Array.from({ length: 11 }, (_, i) => (2024 + i).toString()), 
  []);
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
      const {
        data,
        error
      } = await supabase.from('completed_tax_returns').select('tax_year').eq('user_id', user.id);
      if (error) throw error;
      const completed = data?.map(item => item.tax_year) || [];
      setCompletedYears(completed);
    } catch (error) {
      console.error('Error loading completed tax years:', error);
    }
  }, []);
  
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
      const {
        data,
        error
      } = await supabase.from('uploaded_documents').select('*').eq('user_id', user.id).eq('tax_year', selectedYear).eq('status', 'active').order('upload_date', {
        ascending: false
      });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Fehler",
        description: "Dokumente konnten nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [selectedYear, toast]);
  
  // Initial load effect
  useEffect(() => {
    mountedRef.current = true;
    loadCompletedTaxYears();
    return () => {
      mountedRef.current = false;
    };
  }, [loadCompletedTaxYears]);
  
  // Load documents when year changes
  useEffect(() => {
    if (mountedRef.current) {
      loadDocuments();
    }
  }, [selectedYear, loadDocuments]);
  
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

  const handleCameraCapture = async (blob: Blob) => {
    setShowCamera(false);
    // Document is already uploaded by CameraCapture component
    // Use soft reload (no spinner) to avoid flicker
    loadDocuments(false);
  };

  // Direct upload function - uploads files immediately without confirmation step
  const uploadFilesDirectly = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Fehler",
        description: "Bitte melde dich an",
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
            title: "Fehler",
            description: `${file.name} ist zu gross (max. 10 MB)`,
            variant: "destructive"
          });
          errorCount++;
          continue;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "Fehler",
            description: `${file.name} hat ein ungültiges Format`,
            variant: "destructive"
          });
          errorCount++;
          continue;
        }

        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `documents/${user.id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save to database
        const { error: dbError } = await supabase
          .from('uploaded_documents')
          .insert({
            user_id: user.id,
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
        title: "Upload erfolgreich",
        description: `${successCount} ${successCount === 1 ? 'Datei' : 'Dateien'} hochgeladen`
      });
      // Use soft reload (no spinner) to avoid flicker since user just uploaded
      loadDocuments(false);
    }

    if (errorCount > 0 && successCount === 0) {
      toast({
        title: "Fehler",
        description: "Dateien konnten nicht hochgeladen werden",
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

  // Handle camera input change for direct upload
  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      title: "Upload erfolgreich",
      description: "Deine Dokumente wurden hochgeladen"
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

  // Sort options
  const sortOptions = [{
    value: 'date_desc',
    label: 'Datum (Neueste zuerst)'
  }, {
    value: 'date_asc',
    label: 'Datum (Älteste zuerst)'
  }, {
    value: 'name_asc',
    label: 'Name (A-Z)'
  }, {
    value: 'name_desc',
    label: 'Name (Z-A)'
  }, {
    value: 'type',
    label: 'Dateityp'
  }] as const;

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
                Dokumente hochladen
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
          title="Dokumente"
          onBack={() => navigate(-1)}
          showAvatar={true}
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 bg-white min-h-screen">
          
          {/* Year Dropdown - Centered, Secondary Appearance */}
          <div className="mb-4 flex justify-center" data-tour="documents-year-selector">
            <div className="relative">
              <button 
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="flex items-center gap-2 rounded-xl bg-zinc-100 hover:bg-zinc-150 px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:shadow active:scale-[0.98]"
              >
                <Calendar className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                <span>{selectedYear}</span>
                <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", isYearDropdownOpen && "rotate-180")} strokeWidth={1.5} />
              </button>

              {isYearDropdownOpen && <>
                <div className="fixed inset-0 z-[59]" onClick={() => setIsYearDropdownOpen(false)} />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[60] bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden min-w-[160px]">
                  <div className="max-h-64 overflow-y-auto py-1.5">
                    {availableYears.map(year => (
                      <button 
                        key={year} 
                        onClick={() => handleYearSelect(year)} 
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-zinc-50 transition-colors",
                          year === selectedYear && "bg-zinc-50"
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
                        </div>
                        <span className={cn(
                          "text-sm font-medium text-zinc-600",
                          year === selectedYear && "text-zinc-900"
                        )}>{year}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>}
            </div>
          </div>

          {/* Search Bar with Count and Sort - Grouped Secondary Actions */}
          <div className="mb-6 flex items-center gap-2">
            {/* Search Input - Dominant */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Dokumente durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            
            {/* Secondary Actions Group */}
            <div className="flex items-center gap-1.5">
              {/* Document Count Badge */}
              <div className="flex items-center justify-center h-11 min-w-[44px] px-3 rounded-xl border border-zinc-200 bg-zinc-50/80">
                <span className="text-sm font-medium text-zinc-500">{filteredDocuments.length}</span>
              </div>
              
              {/* Sort Button */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center justify-center h-11 w-11 rounded-xl border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 transition-colors"
                >
                  <ArrowUpDown className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                </button>
                
                {showSortDropdown && <>
                  <div className="fixed inset-0 z-[59]" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute top-full right-0 mt-2 z-[60] bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden min-w-[200px]">
                    <div className="py-1.5">
                      {sortOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 transition-colors",
                            sortBy === option.value ? "text-blue-600 font-medium bg-blue-50/60" : "text-zinc-600"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>}
              </div>
            </div>
          </div>

          {/* Documents Section */}
          {loading ? (
            /* Skeleton Loading State */
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-zinc-100 animate-pulse overflow-hidden">
                  <div className="h-full w-full flex flex-col">
                    <div className="flex-1 bg-zinc-200/60" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-zinc-200 rounded-full w-3/4" />
                      <div className="h-2.5 bg-zinc-200/70 rounded-full w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length > 0 ? (
            /* Document Grid - Cards as Neutral Containers */
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:gap-5">
              {filteredDocuments.map((doc) => {
                const isImage = doc.file_type?.startsWith('image/');
                const fileExt = doc.file_name?.split('.').pop()?.toUpperCase() || 'FILE';
                const fileSize = formatFileSize((doc.metadata as any)?.size);

                return (
                  <button 
                    key={doc.id} 
                    onClick={() => {
                      setSelectedDocument(doc);
                      setShowActionSheet(true);
                    }} 
                    className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition-shadow text-left"
                  >
                    {/* Document Thumbnail */}
                    <div className="h-full w-full">
                      {isImage ? (
                        <DocumentThumbnail doc={doc} />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 via-zinc-100/80 to-zinc-100 relative overflow-hidden">
                          {/* Decorative gradient orb */}
                          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-blue-400/15 to-violet-400/15 rounded-full blur-2xl" />
                          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-tr from-orange-400/10 to-pink-400/10 rounded-full blur-2xl" />
                          
                          {/* Blue square with pill inside */}
                          <div className="relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/20 flex items-center justify-center">
                            <span className="px-2 py-0.5 rounded-full bg-white/90 text-[9px] font-bold text-blue-600 shadow-sm">
                              {fileExt}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Hover Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    
                    {/* More Options Button */}
                    <div className="absolute right-2.5 top-2.5 translate-y-1 rounded-full bg-white/90 p-1.5 text-zinc-700 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white group-hover:translate-y-0 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" strokeWidth={2} />
                    </div>
                    
                    {/* File Info (on hover) */}
                    <div className="absolute bottom-3 left-3 right-3 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
                      <p className="text-xs text-zinc-300 mt-0.5">{fileExt}{fileSize ? ` • ${fileSize}` : ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Empty State - Improved Clarity */
            <div className="flex flex-col items-center justify-center py-16 lg:py-24">
              <div className="text-center space-y-5 max-w-sm mx-auto">
                <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl" />
                  <div className="relative w-full h-full rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center">
                    <FolderOpen strokeWidth={1.5} className="w-9 h-9 text-zinc-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-zinc-800 tracking-tight">Noch keine Dokumente</h2>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Lade deine Belege, Rechnungen und Quittungen für {selectedYear} hoch, um sie sicher zu speichern.
                  </p>
                </div>
                <button 
                  onClick={() => setShowUploadSheet(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Dokument hochladen
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Hidden File Inputs - Direct upload without confirmation */}
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*,application/pdf" 
          multiple 
          className="hidden" 
          onChange={handleFileInputChange} 
        />
        <input 
          ref={cameraInputRef} 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleCameraInputChange} 
        />

        {/* Floating Upload Button - Reduced Visual Dominance */}
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <button 
            onClick={() => setShowUploadSheet(true)}
            data-tour="document-upload-card"
            className="flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 border-t border-blue-400/50 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <img src={uploadIcon} alt="Upload" className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-semibold text-white font-jakarta tracking-wide">
                Hochladen
              </span>
            </div>
          </button>
        </div>

        {/* Upload Action Sheet */}
        <UploadActionSheet 
          open={showUploadSheet}
          onClose={() => setShowUploadSheet(false)}
          onScan={() => {
            setShowCamera(true);
          }}
          onPhoto={() => {
            cameraInputRef.current?.click();
          }}
          onFile={() => {
            fileInputRef.current?.click();
          }}
        />

        <CameraCapture open={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} taxYear={selectedYear} />

        <DocumentActionSheet document={selectedDocument} open={showActionSheet} onClose={() => {
        setShowActionSheet(false);
        setSelectedDocument(null);
      }} onUpdate={loadDocuments} availableYears={allYears} />
      </div>
    </>;
};

// Main component that wraps DocumentsContent with FormProvider
const Documents: React.FC = () => {
  const [searchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const isTransitionEntry = searchParams.get('transition') === 'true';
  return <FormProvider taxYear={selectedYear}>
      <DocumentsContent selectedYear={selectedYear} onYearChange={setSelectedYear} isTransitionEntry={isTransitionEntry} />
    </FormProvider>;
};
export default Documents;