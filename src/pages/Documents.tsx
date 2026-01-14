import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, Plus, CalendarDays, FileText, Image, MoreVertical, ShieldCheck, Search, ArrowUpDown, File } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormContext, FormProvider } from '@/contexts';
import EnhancedDocumentUploader from '@/components/EnhancedDocumentUploader';
import { DocumentsTour } from '@/components/DocumentsTour';
import { useDocumentsTour } from '@/contexts/DocumentsTourContext';
import CameraCapture from '@/components/documents/CameraCapture';
import DocumentActionSheet from '@/components/documents/DocumentActionSheet';
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
              {/* Section Header - "Meine Dateien" with count badge */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Meine Dateien
                </h2>
                <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600 tabular-nums">
                    {documents.length}
                  </span>
                </div>
              </div>

              {/* Search and Sort Toolbar */}
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" strokeWidth={1.5} />
                  </div>
                  <input type="text" placeholder="Search briefs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100 outline-none transition-all" />
                </div>
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

              // Rotate colors for variety
              const colorVariants = [{
                bg: 'bg-blue-50',
                border: 'border-blue-100/50',
                text: 'text-blue-600',
                hoverBg: 'group-hover:bg-blue-100'
              }, {
                bg: 'bg-indigo-50',
                border: 'border-indigo-100/50',
                text: 'text-indigo-600',
                hoverBg: 'group-hover:bg-indigo-100'
              }, {
                bg: 'bg-emerald-50',
                border: 'border-emerald-100/50',
                text: 'text-emerald-600',
                hoverBg: 'group-hover:bg-emerald-100'
              }, {
                bg: 'bg-violet-50',
                border: 'border-violet-100/50',
                text: 'text-violet-600',
                hoverBg: 'group-hover:bg-violet-100'
              }];
              const color = colorVariants[index % colorVariants.length];
              return <button key={doc.id} onClick={() => {
                setSelectedDocument(doc);
                setShowActionSheet(true);
              }} className="group flex flex-col items-start text-left bg-white p-6 rounded-[2rem] border border-slate-200 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:border-slate-300 transition-all duration-300">
                      {/* Icon Container */}
                      <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center mb-10 group-hover:scale-110 transition-all duration-300", color.bg, color.border, color.text, color.hoverBg)}>
                        {isImage ? <Image className="w-5 h-5 stroke-[1.5]" /> : isPdf ? <FileText className="w-5 h-5 stroke-[1.5]" /> : <File className="w-5 h-5 stroke-[1.5]" />}
                      </div>
                      
                      {/* Document Info */}
                      <div className="w-full">
                        <div className="flex items-center justify-between w-full mb-1">
                          <h3 className="font-bold text-slate-900 truncate pr-2">
                            {doc.file_name.replace(/\.[^/.]+$/, '')}
                          </h3>
                        </div>
                        <p className="text-xs font-medium text-slate-400 flex items-center gap-2">
                          <span>Aktualisiert vor {timeAgo}</span>
                        </p>
                      </div>
                    </button>;
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

        {/* Fixed Bottom Action Bar - Semi-circle design */}
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          {/* Gradient Fade Background */}
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
          
          {/* Hidden File Input */}
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              setSelectedFiles(Array.from(e.target.files));
              setShowUploader(true);
            }
            e.target.value = '';
          }} />

          {/* Semi-Circle Button Container */}
          <div className="relative w-full flex justify-center items-end pointer-events-auto">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="group relative w-full h-24 bg-gradient-to-t from-slate-100 to-white border-t border-slate-200/50 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.15),0_-5px_15px_-5px_rgba(59,130,246,0.1)] flex flex-col items-center justify-start pt-4 transition-all duration-300 overflow-visible rounded-t-[50%] hover:h-28 active:scale-95"
              data-tour="document-upload-card"
            >
              {/* Glow Background on hover */}
              <div className="group-hover:opacity-100 transition-opacity bg-gradient-to-t from-blue-50 via-blue-50/50 to-transparent opacity-0 h-full rounded-t-[50%] absolute right-0 bottom-0 left-0" />

              {/* Main Icon Circle - positioned to overflow */}
              <div className="relative z-10 w-14 h-14 mb-1 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] animate-pulse -mt-8 border-4 border-white">
                <Plus className="w-6 h-6" strokeWidth={2.5} />
              </div>

              {/* Text Content */}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <span className="text-slate-900 font-medium text-lg tracking-tight">
                  Dokument hinzufügen
                </span>
                <span className="text-blue-500 text-xs font-medium tracking-wide">
                  Scan oder Upload
                </span>
              </div>
            </button>
          </div>
        </div>

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