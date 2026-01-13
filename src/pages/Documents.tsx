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
          }} className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors active:scale-95">
              <ArrowLeft className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
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
      
      <div className={cn("min-h-screen w-full flex flex-col text-slate-900 antialiased relative overflow-hidden bg-white selection:bg-[#1D64FF]/10 selection:text-[#1D64FF]", isTransitionEntry && "animate-fade-in")}>
        {/* Top Navigation */}
        <header className="flex-none px-6 py-6 flex items-center justify-between relative z-10">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
          </button>

          <h1 className="text-lg font-semibold tracking-tight text-slate-900 absolute left-1/2 -translate-x-1/2">
            Dokumente
          </h1>

          {/* Placeholder for symmetry */}
          <div className="w-10" />
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
          <div className="max-w-2xl mx-auto px-6 w-full flex flex-col gap-8">
            {/* Section: Year Selection */}
            <div className="space-y-3" data-tour="documents-year-selector">
              <label className="block text-xs font-bold text-slate-400 mb-2 ml-4 ">
                Steuerjahr auswählen
              </label>

              <div className="relative">
                <button onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)} className="flex hover:shadow-[0_8px_30px_-4px_rgba(29,100,255,0.3)] transition-all duration-300 group ring-offset-2 focus:ring-2 outline-none hover:-translate-y-0.5 focus:ring-white/30 bg-gradient-to-br from-[#1D64FF] to-[#0040C0] w-full border-white/20 border rounded-[2rem] p-5 shadow-[0_4px_20px_-4px_rgba(29,100,255,0.2)] items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl text-white shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300 bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
                      <Calendar className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-semibold text-white transition-colors">
                        Steuererklärung {selectedYear}
                      </div>
                      <div className="text-sm text-blue-100 mt-0.5 font-medium">
                        Aktuelles Jahr
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-blue-200 group-hover:text-white transition-colors", isYearDropdownOpen && "rotate-180")} />
                </button>

                {isYearDropdownOpen && <>
                  <div className="fixed inset-0 z-[59]" onClick={() => setIsYearDropdownOpen(false)} />
                  <div className="absolute top-full mt-2 left-0 right-0 z-[60] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto py-1">
                      {availableYears.map(year => <button key={year} onClick={() => handleYearSelect(year)} className={cn("w-full text-left px-5 py-3 text-slate-700 hover:bg-slate-50 transition-colors", year === selectedYear && "bg-[#1D64FF]/5 text-[#1D64FF]")}>
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
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight pl-2">
                    Hochgeladene Dokumente
                  </h2>
                  <span className="bg-white border border-slate-100 shadow-sm text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                    {documents.length} {documents.length === 1 ? 'Datei' : 'Dateien'}
                  </span>
                </div>

                {/* Document List */}
                <div className="flex flex-col gap-3">
                  {documents.map(doc => <div key={doc.id} onClick={() => {
                setSelectedDocument(doc);
                setShowActionSheet(true);
              }} className="group bg-white/60 backdrop-blur-md rounded-[2rem] p-4 border border-white/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-0.5">
                      <div className="flex items-center gap-4 relative z-10">
                        {/* Icon / Preview */}
                        <div className={cn("w-12 h-12 shrink-0 rounded-xl flex items-center justify-center", doc.file_type?.startsWith('image/') ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100")}>
                          {doc.file_type?.startsWith('image/') ? <Image className="w-6 h-6" strokeWidth={1.5} /> : <FileText className="w-6 h-6" strokeWidth={1.5} />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 py-1">
                          <h3 className="text-sm font-medium text-slate-900 truncate pr-4 transition-colors group-hover:text-[#1D64FF]">
                            {doc.file_name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-slate-500 font-medium">
                              {format(new Date(doc.upload_date), 'd. MMM yyyy', {
                          locale: de
                        })}
                            </p>

                            {/* Badge */}
                            <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset tracking-wide uppercase", doc.file_type?.startsWith('image/') ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10" : "bg-red-50 text-red-700 ring-red-600/10")}>
                              {doc.file_type?.startsWith('image/') ? 'Bild' : 'PDF'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <button onClick={e => {
                    e.stopPropagation();
                    setSelectedDocument(doc);
                    setShowActionSheet(true);
                  }} className="shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                          <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>)}
                </div>
              </div> : (/* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-20">
                <div className="text-center space-y-6 relative">
                  {/* Icon placeholder */}
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    <div className="absolute inset-0 bg-[#1D64FF] rounded-full blur-[40px] opacity-10" />
                    <div className="relative w-full h-full rounded-[32px] bg-white border border-slate-200 shadow-lg flex items-center justify-center group cursor-default">
                      <FolderOpen strokeWidth={1.5} className="w-10 h-10 group-hover:scale-110 transition-transform duration-500 text-[#1D64FF]" />
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
          </div>
        </main>

        {/* Floating Action Button Area */}
        <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
          {/* Gradient Fade */}
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t to-transparent from-white via-white/95" />

          {/* Button Container */}
          <div className="relative pb-8 px-6 flex flex-col items-center pointer-events-auto max-w-2xl mx-auto w-full">
            {/* Hidden File Input */}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              setSelectedFiles(Array.from(e.target.files));
              setShowUploader(true);
            }
            e.target.value = '';
          }} />

            <button onClick={() => fileInputRef.current?.click()} className="group relative w-auto min-w-[280px] active:scale-95 text-white pl-4 pr-6 py-4 rounded-full transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-4 overflow-hidden bg-[#1D64FF] hover:bg-[#1854D9] shadow-[0_20px_40px_-12px_rgba(29,100,255,0.4)]" data-tour="document-upload-card">
              {/* Icon Circle */}
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center transition-colors border border-white/10 shadow-inner backdrop-blur-sm">
                <Plus className="w-6 h-6 text-white" strokeWidth={2} />
              </div>

              {/* Text Content */}
              <div className="flex flex-col items-start mr-2">
                <span className="text-base font-semibold tracking-tight text-lg">
                  Dokument hinzufügen
                </span>
                <span className="text-xs font-medium group-hover:text-white transition-colors text-white/80">
                  Scan oder Upload
                </span>
              </div>

              {/* Subtle Shine Effect */}
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
            </button>

            {/* Security Footer */}
            <div className="mt-5 flex items-center gap-1.5 text-slate-400 select-none">
              <Lock className="w-3 h-3" strokeWidth={2} />
              <span className="text-[10px] font-semibold tracking-widest uppercase opacity-80">
                Verschlüsselt &amp; Sicher
              </span>
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
      <DocumentsContent selectedYear={selectedYear} onYearChange={setSelectedYear} isTransitionEntry={isTransitionEntry} />
    </FormProvider>;
};
export default Documents;