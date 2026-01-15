import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, CalendarDays, FileText, Image, MoreVertical, ShieldCheck, Search, ArrowUpDown, File, ScanLine, Plus } from 'lucide-react';
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
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useStatusBar } from '@/hooks/useStatusBar';
import { useProfile } from '@/hooks/useProfile';

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
  const currentMonth = format(new Date(), 'MMM', {
    locale: de
  });

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
        {/* Header - unified design */}
        <header className="sticky top-0 z-30 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between relative">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <h1 className="text-lg font-semibold tracking-tight text-slate-900 absolute left-1/2 -translate-x-1/2">
              Dokumente {selectedYear}
            </h1>

            {/* Profile Avatar */}
            <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-slate-200 ring-2 ring-white shadow-sm overflow-hidden shrink-0 hover:ring-blue-100 transition-all">
              <img src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} alt="Profil" className="w-full h-full object-cover" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-48">
          {/* Year Selector */}
          <div className="mb-8" data-tour="documents-year-selector">
            <div className="relative">
              <button onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 hover:border-slate-300 transition-all group text-left shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-all duration-300 shadow-sm">
                  <CalendarDays className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-500 mb-0.5">
                    Aktueller Ordner
                  </div>
                  <div className="text-lg font-semibold text-slate-900 tracking-tight">
                    Steuererklärung {selectedYear}
                  </div>
                </div>
                <div className="p-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                  <ChevronDown className={cn("w-5 h-5", isYearDropdownOpen && "rotate-180 transition-transform")} strokeWidth={1.5} />
                </div>
              </button>

              {isYearDropdownOpen && <>
                <div className="fixed inset-0 z-[59]" onClick={() => setIsYearDropdownOpen(false)} />
                <div className="absolute top-full mt-2 left-0 right-0 z-[60] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {availableYears.map(year => <button key={year} onClick={() => handleYearSelect(year)} className={cn("w-full text-left px-5 py-3 text-slate-700 hover:bg-slate-50 transition-colors", year === selectedYear && "bg-blue-50 text-blue-600")}>
                        Steuererklärung {year}
                      </button>)}
                  </div>
                </div>
              </>}
            </div>
          </div>

          {/* Documents Section */}
          {documents.length > 0 ? <>
              {/* Search and Sort Toolbar */}
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" strokeWidth={1.5} />
                  </div>
                  <input type="text" placeholder="Search briefs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100 outline-none transition-all" />
                </div>
                <div className="flex items-center gap-2">
                  {/* File count badge */}
                  <div className="w-10 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-600 tabular-nums">
                      {documents.length}
                    </span>
                  </div>
                  {/* Sort button */}
                  <div className="relative">
                    <button onClick={() => setShowSortDropdown(!showSortDropdown)} className={cn("flex-shrink-0 w-12 h-12 border rounded-xl flex items-center justify-center transition-all active:scale-95", showSortDropdown ? "border-blue-300 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50")}>
                      <ArrowUpDown className="w-5 h-5" strokeWidth={1.5} />
                    </button>

                    {showSortDropdown && <>
                      <div className="fixed inset-0 z-[59]" onClick={() => setShowSortDropdown(false)} />
                      <div className="absolute top-full mt-2 right-0 z-[60] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden min-w-[220px]">
                        <div className="py-1">
                          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Sortieren nach
                          </div>
                          {sortOptions.map(option => <button key={option.value} onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }} className={cn("w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3", sortBy === option.value ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-700 hover:bg-slate-50")}>
                            {sortBy === option.value && <CheckCircle2 className="w-4 h-4 text-blue-500" strokeWidth={2} />}
                            <span className={sortBy !== option.value ? "ml-7" : ""}>
                              {option.label}
                            </span>
                          </button>)}
                        </div>
                      </div>
                    </>}
                  </div>
                </div>
              </div>

              {/* Document Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDocuments.map((doc, index) => {
                  const isImage = doc.file_type?.startsWith('image/');
                  const isPdf = doc.file_type === 'application/pdf';
                  const uploadDate = new Date(doc.upload_date);
                  const timeAgo = formatDistanceToNow(uploadDate, {
                    locale: de,
                    addSuffix: false
                  });
                  const docYear = doc.tax_year || selectedYear;

                  return (
                    <button 
                      key={doc.id} 
                      onClick={() => {
                        setSelectedDocument(doc);
                        setShowActionSheet(true);
                      }} 
                      className="group flex flex-col text-left bg-white rounded-[1.5rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 overflow-hidden"
                    >
                      {/* Blue Header Area with Year */}
                      <div className="relative w-full bg-gradient-to-br from-blue-500 to-blue-600 px-5 py-6 flex flex-col items-center justify-center min-h-[120px]">
                        {/* Menu Dots */}
                        <div className="absolute top-3 right-3">
                          <MoreVertical className="w-5 h-5 text-white/60" strokeWidth={1.5} />
                        </div>
                        
                        {/* Year Display */}
                        <span className="text-3xl font-bold text-white tracking-tight">
                          {docYear}
                        </span>
                        
                        {/* AKTIV Badge */}
                        <div className="absolute bottom-3 left-4">
                          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                              Aktiv
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Document Info */}
                      <div className="p-5 flex flex-col gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-base leading-tight mb-1 truncate">
                            {doc.file_name.replace(/\.[^/.]+$/, '')}
                          </h3>
                          <p className="text-sm text-blue-500 leading-snug">
                            Hochgeladen vor {timeAgo}
                          </p>
                        </div>
                        
                        {/* Bottom Row with Stats */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-4 text-slate-400">
                            {/* File Type Icon */}
                            <div className="flex items-center gap-1.5">
                              {isImage ? <Image className="w-4 h-4" strokeWidth={1.5} /> : isPdf ? <FileText className="w-4 h-4" strokeWidth={1.5} /> : <File className="w-4 h-4" strokeWidth={1.5} />}
                              <span className="text-xs font-medium">
                                {isImage ? 'Bild' : isPdf ? 'PDF' : 'Datei'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Link */}
                          <div className="flex items-center gap-1 text-slate-700 font-medium text-sm group-hover:text-blue-600 transition-colors">
                            <span>Öffnen</span>
                            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </> : (/* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div className="text-center space-y-6 relative">
                {/* Icon placeholder */}
                <div className="relative mx-auto w-24 h-24 mb-4">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-[40px] opacity-10" />
                  <div className="relative w-full h-full rounded-[32px] bg-white border border-slate-200 shadow-lg flex items-center justify-center group cursor-default">
                    <FolderOpen strokeWidth={1.5} className="w-10 h-10 group-hover:scale-110 transition-transform duration-500 text-blue-500" />
                  </div>
                  {/* Status Badge */}
                  <div className="absolute -top-2 -right-2 bg-white border border-slate-200 p-1.5 rounded-full shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Belege sammeln</h2>
                  <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                    Füge deine Rechnungen und Quittungen direkt hinzu, um sie für deine Steuererklärung zu speichern.
                  </p>
                </div>

                {/* Stats / Counter */}
                
              </div>
            </div>)}
        </main>

        {/* Bottom Floating Pill Button */}
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
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

          {/* Pill Button */}
          <button 
            onClick={() => setShowUploadSheet(true)} 
            className="pointer-events-auto flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-[0_8px_30px_-4px_rgba(59,130,246,0.5)] hover:shadow-[0_12px_40px_-4px_rgba(59,130,246,0.6)] hover:scale-105 active:scale-95 transition-all duration-300"
            data-tour="document-upload-card"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="font-semibold text-base tracking-tight">Dokument hinzufügen</span>
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