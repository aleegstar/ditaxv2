import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, ChevronDown, FolderOpen, CheckCircle2, FileText, Download, Plus, ArrowLeft } from 'lucide-react';
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

// Component to render document thumbnail with actual image
const DocumentThumbnail: React.FC<{ doc: any }> = ({ doc }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const loadImage = async () => {
      try {
        const { data } = await supabase.storage
          .from('tax-documents')
          .createSignedUrl(doc.file_path, 3600);
        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Error loading image:', error);
      }
    };
    
    if (doc.file_type?.startsWith('image/')) {
      loadImage();
    }
  }, [doc]);

  if (!imageUrl) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={doc.file_name}
      className="w-full h-full object-cover"
    />
  );
};

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

  // Generate year options (2024-2034)
  const allYears = Array.from({
    length: 11
  }, (_, i) => (2024 + i).toString());
  const mountedRef = React.useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    loadCompletedTaxYears();
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (mountedRef.current) {
      loadDocuments();
    }
  }, [selectedYear]);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mountedRef.current) {
        loadDocuments();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedYear]);
  useEffect(() => {
    if (selectedYear === taxYear && formDataLoaded && mountedRef.current) {
      generateChecklist();
    }
  }, [selectedYear, taxYear, formDataLoaded, generateChecklist]);
  useEffect(() => {
    const available = allYears.filter(year => !completedYears.includes(year));
    setAvailableYears(available);
    if (available.length > 0 && completedYears.includes(selectedYear)) {
      onYearChange(available[0]);
    }
  }, [completedYears, selectedYear, onYearChange, allYears]);
  const loadCompletedTaxYears = async () => {
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
  };
  const loadDocuments = async () => {
    setLoading(true);
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
    }
  };
  const handleCameraCapture = async (blob: Blob) => {
    setShowCamera(false);
    toast({
      title: "Foto aufgenommen",
      description: "Öffne den Upload-Dialog um das Foto hochzuladen."
    });
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
      
      <div className={cn("min-h-screen bg-white text-slate-900 flex flex-col", isTransitionEntry && "animate-fade-in")}>
        {/* Minimal Header */}
        <header className="sticky top-0 z-30 bg-white">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
            {/* Menu Button */}
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors">
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {/* Year Selector - Center */}
            <div className="relative" data-tour="documents-year-selector">
              <button 
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} 
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
                <span className="text-sm font-medium text-slate-900">{selectedYear}</span>
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isYearDropdownOpen && "rotate-180")} strokeWidth={1.5} />
              </button>

              {isYearDropdownOpen && <>
                <div className="fixed inset-0 z-[59]" onClick={() => setIsYearDropdownOpen(false)} />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[60] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden min-w-[140px]">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {availableYears.map(year => (
                      <button 
                        key={year} 
                        onClick={() => handleYearSelect(year)} 
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors",
                          year === selectedYear && "bg-blue-50 text-blue-600 font-medium"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              </>}
            </div>

            {/* Profile Avatar */}
            <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-orange-100 hover:ring-orange-200 transition-all">
              <img src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} alt="Profil" className="w-full h-full object-cover" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-lg mx-auto px-4 pb-32">

          {/* Documents Section */}
          {documents.length > 0 ? (
            <>
              {/* Document Grid - 2 columns gallery style */}
              <div className="grid grid-cols-2 gap-3">
                {filteredDocuments.map((doc) => {
                  const isImage = doc.file_type?.startsWith('image/');

                  return (
                    <button 
                      key={doc.id} 
                      onClick={() => {
                        setSelectedDocument(doc);
                        setShowActionSheet(true);
                      }} 
                      className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 group"
                    >
                      {/* Document Thumbnail */}
                      {isImage ? (
                        <DocumentThumbnail doc={doc} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <FileText className="w-12 h-12 text-slate-400" strokeWidth={1} />
                        </div>
                      )}
                      
                      {/* Download Icon */}
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                        <Download className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div className="text-center space-y-6 relative">
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-[40px] opacity-10" />
                  <div className="relative w-full h-full rounded-[32px] bg-white border border-slate-200 shadow-lg flex items-center justify-center">
                    <FolderOpen strokeWidth={1.5} className="w-10 h-10 text-blue-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-white border border-slate-200 p-1.5 rounded-full shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Belege sammeln</h2>
                  <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                    Füge deine Rechnungen und Quittungen direkt hinzu.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Input Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 px-4 py-4 pb-8">
          <div className="max-w-lg mx-auto">
            {/* Hidden File Inputs */}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                setSelectedFiles(Array.from(e.target.files));
                setShowUploader(true);
              }
              e.target.value = '';
            }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                setSelectedFiles(Array.from(e.target.files));
                setShowUploader(true);
              }
              e.target.value = '';
            }} />

            {/* Input-like button */}
            <button 
              onClick={() => setShowUploadSheet(true)} 
              className="w-full flex items-center gap-3 text-left"
              data-tour="document-upload-card"
            >
              <span className="flex-1 text-slate-400 text-base">Unterlagen hinzufügen</span>
              <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors">
                <Plus className="w-4 h-4" strokeWidth={2} />
              </div>
            </button>
          </div>
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