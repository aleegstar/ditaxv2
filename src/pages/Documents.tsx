import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, Plus, Calendar, FileText, Image, MoreHorizontal, Lock } from 'lucide-react';
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

  // Show uploader view (light theme)
  if (showUploader || hasFilesInUploader) {
    return <div className="min-h-screen bg-white text-slate-800 antialiased overflow-x-hidden">
        <div className="min-h-screen flex flex-col w-full relative">
          
          {/* Header */}
          <header className="sticky top-0 z-30 px-6 py-5 flex items-center justify-between backdrop-blur-md bg-white/90">
            {/* Back Button */}
            <button onClick={() => {
            setShowUploader(false);
            setHasFilesInUploader(false);
            setSelectedFiles([]);
          }} className="-ml-2 hover:bg-slate-100 transition-colors active:scale-95 text-slate-500 border-slate-200 border rounded-full p-2">
              <ArrowLeft className="w-6 h-5" strokeWidth={1.5} />
            </button>

            {/* Title */}
            <h1 className="font-semibold text-[17px] tracking-tight text-slate-900">
              Dokumente hochladen
            </h1>
            <div className="w-9" />
          </header>
          
          <div className="flex-1 flex flex-col w-full relative px-6 pb-8 max-w-2xl mx-auto">
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
      
      <div className={cn(
        "min-h-screen bg-white text-slate-800 antialiased flex justify-center selection:bg-indigo-100 selection:text-indigo-700",
        isTransitionEntry && "animate-fade-in"
      )}>
        {/* Container */}
        <div className="min-h-screen flex flex-col w-full max-w-2xl pb-32 relative bg-white">
          
          {/* Header */}
          <header className="sticky top-0 z-30 px-6 py-5 flex items-center justify-between backdrop-blur-md bg-white/90">
            <button onClick={() => navigate(-1)} className="-ml-2 hover:bg-slate-200/50 transition-colors active:scale-95 text-slate-500 border-slate-200 border rounded-full p-2">
              <ArrowLeft className="w-6 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="font-semibold text-[17px] tracking-tight text-slate-900">Dokumente</h1>
            <div className="w-9" /> {/* Spacer for optical centering */}
          </header>

          {/* Main Content */}
          <main className="px-6 flex flex-col gap-8 mt-2">
            
            {/* Section: Year Selection */}
            <div className="space-y-3" data-tour="documents-year-selector">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide ml-1">Steuerjahr auswählen</label>
              <div className="relative group">
                <button onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-indigo-200 transition-all duration-300 group-active:scale-[0.99]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50/80 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                      <Calendar strokeWidth={1.5} className="w-5 h-5 text-[#1f66ff]" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-slate-900 text-[15px] tracking-tight">Steuererklärung {selectedYear}</span>
                      <span className="text-xs text-slate-500 font-medium">Aktuelles Jahr</span>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors", isYearDropdownOpen && "rotate-180")} strokeWidth={1.5} />
                </button>
                
                {isYearDropdownOpen && <>
                    <div className="fixed inset-0 z-[59]" onClick={() => setIsYearDropdownOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 right-0 z-[60] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto py-1">
                        {availableYears.map(year => <button key={year} onClick={() => handleYearSelect(year)} className={cn("w-full text-left px-5 py-3 text-slate-700 hover:bg-slate-50 transition-colors", year === selectedYear && "bg-indigo-50 text-indigo-700")}>
                            Steuererklärung {year}
                          </button>)}
                      </div>
                    </div>
                  </>}
              </div>
            </div>

            {/* Section: Uploaded Documents */}
            {documents.length > 0 ? <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-semibold text-slate-900 text-[16px] tracking-tight">Hochgeladene Dokumente</h2>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 border-slate-200/60 border rounded-full py-1 px-2">{documents.length} Dateien</span>
                </div>

                <div className="space-y-3">
                  {documents.map(doc => <div key={doc.id} onClick={() => {
                setSelectedDocument(doc);
                setShowActionSheet(true);
              }} className="group bg-white rounded-2xl p-3 pr-4 border border-slate-200 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] hover:border-indigo-100 transition-all duration-300 flex items-center gap-3.5 cursor-pointer">
                      {/* Icon */}
                      <div className={cn("w-12 h-12 shrink-0 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform", doc.file_type?.startsWith('image/') ? "bg-emerald-50/80 border border-emerald-100/50 text-emerald-600" : "bg-red-50/80 border border-red-100/50 text-red-600")}>
                        {doc.file_type?.startsWith('image/') ? <Image className="w-5 h-5" strokeWidth={1.5} /> : <FileText className="w-5 h-5" strokeWidth={1.5} />}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800 text-[14px] truncate leading-snug">{doc.file_name}</span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(doc.upload_date), 'd. MMM yyyy', {
                      locale: de
                    })}
                        </span>
                      </div>

                      {/* Badge */}
                      <div className={cn("hidden sm:flex px-2 py-0.5 rounded-md", doc.file_type?.startsWith('image/') ? "bg-emerald-50 border border-emerald-100/50" : "bg-red-50 border border-red-100/50")}>
                        <span className={cn("text-[10px] font-bold tracking-wide uppercase", doc.file_type?.startsWith('image/') ? "text-emerald-700" : "text-red-700")}>
                          {doc.file_type?.startsWith('image/') ? 'Bild' : 'PDF'}
                        </span>
                      </div>

                      {/* Menu */}
                      <button onClick={e => {
                  e.stopPropagation();
                  setSelectedDocument(doc);
                  setShowActionSheet(true);
                }} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                        <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>)}
                </div>
              </div> : (/* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-20">
                <div className="text-center space-y-6 relative">
                  {/* Icon placeholder */}
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[40px] opacity-10" />
                    <div className="relative w-full h-full rounded-[32px] bg-white border border-slate-200 shadow-lg flex items-center justify-center group cursor-default">
                      <FolderOpen strokeWidth={1.5} className="w-10 h-10 group-hover:scale-110 transition-transform duration-500 text-[#1f66ff]" />
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
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center min-w-[80px]">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Gesamt</span>
                      <span className="text-sm text-slate-700 font-medium font-mono">{documents.length}</span>
                    </div>
                    <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center min-w-[80px]">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Monat</span>
                      <span className="text-sm text-slate-700 font-medium">{currentMonth}</span>
                    </div>
                  </div>
                </div>
              </div>)}
          </main>

          {/* Floating Action Footer */}
          <div className="fixed bottom-0 w-full max-w-[420px] pointer-events-none z-50 left-1/2 -translate-x-1/2">
            {/* Gradient Overlay */}
            <div className="absolute bottom-0 w-full h-40 pointer-events-none" style={{
            background: 'linear-gradient(to top, #F7F9FB 10%, rgba(247,249,251,0.8) 50%, rgba(247,249,251,0) 100%)'
          }} />

            <div className="relative w-full flex flex-col items-center pb-6 pt-4 pointer-events-auto gap-4">
              
              {/* Hidden File Input */}
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                // Store the files before resetting the input
                setSelectedFiles(Array.from(e.target.files));
                setShowUploader(true);
              }
              // Reset input so same file can be selected again
              e.target.value = '';
            }} />
              
              {/* Main Action Button */}
              <button onClick={() => fileInputRef.current?.click()} className="group relative flex items-center gap-3 pl-2 pr-6 py-2 bg-primary rounded-full shadow-[0_8px_30px_-6px_rgba(29,100,255,0.4)] hover:shadow-[0_8px_35px_-4px_rgba(29,100,255,0.5)] hover:scale-[1.02] active:scale-95 transition-all duration-300" data-tour="document-upload-card">
                <div className="flex transition-colors text-primary w-10 h-10 rounded-full shadow-inner items-center justify-center bg-white">
                  <Plus className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[14px] font-semibold text-white tracking-tight">Dokument hinzufügen</span>
                  <span className="text-[11px] font-medium text-white/70">Scan oder Upload</span>
                </div>
              </button>

              {/* Security Text */}
              <div className="flex items-center gap-1.5 text-slate-400/80">
                <Lock className="w-3 h-3" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold tracking-wider uppercase">Verschlüsselt & Sicher</span>
              </div>
            </div>
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
      <DocumentsContent 
        selectedYear={selectedYear} 
        onYearChange={setSelectedYear} 
        isTransitionEntry={isTransitionEntry}
      />
    </FormProvider>;
};
export default Documents;