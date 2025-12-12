import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, CheckCircle2, Plus, Calendar, FileText, Image, MoreHorizontal } from 'lucide-react';
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

// Separate content component that uses FormContext
const DocumentsContent: React.FC<{ selectedYear: string; onYearChange: (year: string) => void }> = ({ selectedYear, onYearChange }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checklistItems, generateChecklist, taxYear, formDataLoaded } = useFormContext();
  const { showTour, isReady, completeTour, skipTour } = useDocumentsTour();

  // Generate year options (2024-2034)
  const allYears = Array.from({ length: 11 }, (_, i) => (2024 + i).toString());
  const mountedRef = React.useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    loadCompletedTaxYears();
    return () => { mountedRef.current = false; };
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('completed_tax_returns').select('tax_year').eq('user_id', user.id);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('uploaded_documents').select('*').eq('user_id', user.id).eq('tax_year', selectedYear).eq('status', 'active').order('upload_date', { ascending: false });
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
    toast({
      title: "Upload erfolgreich",
      description: "Deine Dokumente wurden hochgeladen",
    });
  };

  const currentMonth = format(new Date(), 'MMM', { locale: de });
  
  // Show uploader view
  if (showUploader || hasFilesInUploader) {
    return (
      <div className="min-h-screen bg-[#020408] text-zinc-200 antialiased flex justify-center selection:bg-[#1D64FF]/30">
        <div className="min-h-screen md:max-w-2xl bg-[#020408] w-full max-w-[500px] mr-auto ml-auto relative flex flex-col shadow-2xl overflow-hidden border-x border-white/[0.02]">
          {/* Background Ambient Glow */}
          <div 
            className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none opacity-100"
            style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.01) 50%, transparent 70%)',
              filter: 'blur(90px)'
            }}
          />
          
          {/* Header */}
          <div className="z-20 w-full px-6 pt-8 pb-4 flex items-center justify-center relative shrink-0">
            {/* Back Button */}
            <button 
              onClick={() => {
                setShowUploader(false);
                setHasFilesInUploader(false);
              }}
              className="absolute left-6 w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 group shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Title */}
            <h1 className="font-medium text-lg tracking-tight text-white/90 leading-tight">
              Dokumente hochladen
            </h1>
          </div>
          
          <div className="z-20 flex-1 flex flex-col w-full relative px-6 md:px-8 pb-8">
            <EnhancedDocumentUploader
              key={uploaderKey}
              onBack={() => {
                setShowUploader(false);
                setHasFilesInUploader(false);
              }}
              onDocumentSubmitted={handleUploadSuccess}
              hasUploadedFiles={documents.length > 0}
              onPreviewChange={setHasFilesInUploader}
              autoTriggerUpload={showUploader}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showTour && isReady && (
        <DocumentsTour 
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}
      
      <div className="min-h-screen bg-[#020408] text-zinc-200 antialiased flex justify-center selection:bg-[#1D64FF]/30">
        {/* Mobile Container */}
        <div className="h-screen md:max-w-2xl bg-[#020408] w-full max-w-[500px] mr-auto ml-auto relative flex flex-col shadow-2xl overflow-hidden border-x border-white/[0.02]">
          
          {/* Background Ambient Glow */}
          <div 
            className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none opacity-100"
            style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.01) 50%, transparent 70%)',
              filter: 'blur(90px)'
            }}
          />

          {/* Header */}
          <div className="z-20 w-full px-6 pt-8 pb-4 flex items-center justify-center relative shrink-0">
            {/* Back Button */}
            <button 
              onClick={() => navigate(-1)}
              className="absolute left-6 w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 group shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Title */}
            <h1 className="font-medium text-lg tracking-tight text-white/90 leading-tight">
              Dokumente
            </h1>
          </div>

          {/* Main Content */}
          <div className="z-10 flex-1 flex flex-col px-6 pb-20 relative overflow-y-auto">
            
            {/* Tax Year Selection */}
            <div className="mt-4 mb-12 space-y-2.5" data-tour="documents-year-selector">
              <label className="text-sm text-zinc-500 font-medium ml-1 block">Steuerjahr auswählen</label>
              <div className="relative">
                <button 
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className="w-full relative group transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                  <div className="relative w-full bg-[#0A0C10] hover:bg-[#0F1218] border border-white/10 group-hover:border-white/20 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1D64FF]/10 flex items-center justify-center border border-[#1D64FF]/20">
                        <Calendar className="w-4 h-4 text-[#1D64FF]" />
                      </div>
                      <span className="text-base font-medium text-zinc-200 group-hover:text-white transition-colors">Steuererklärung {selectedYear}</span>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-all", isYearDropdownOpen && "rotate-180")} />
                  </div>
                </button>
                
                {isYearDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[59]" onClick={() => setIsYearDropdownOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 right-0 z-[60] bg-[#0A0C10] border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto py-1">
                        {availableYears.map(year => (
                          <button 
                            key={year} 
                            onClick={() => handleYearSelect(year)}
                            className={cn(
                              "w-full text-left px-5 py-3 text-zinc-200 hover:bg-white/[0.05] transition-colors",
                              year === selectedYear && "bg-[#1D64FF]/20 text-white"
                            )}
                          >
                            Steuererklärung {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Content Area - Show documents or empty state */}
            {documents.length > 0 ? (
              /* Document List */
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-medium text-white">Hochgeladene Dokumente</h2>
                  <span className="text-xs text-zinc-500 font-medium">{documents.length} Dateien</span>
                </div>
                
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocument(doc);
                        setShowActionSheet(true);
                      }}
                      className="group flex items-center gap-4 p-4 bg-[#0A0C10] border border-white/[0.06] rounded-2xl hover:border-[#1D64FF]/30 transition-all duration-300 cursor-pointer"
                    >
                      {/* File Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        doc.file_type?.startsWith('image/') 
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : "bg-[#1D64FF]/10 border border-[#1D64FF]/20"
                      )}>
                        {doc.file_type?.startsWith('image/') 
                          ? <Image className="w-5 h-5 text-emerald-500" />
                          : <FileText className="w-5 h-5 text-[#1D64FF]" />
                        }
                      </div>
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {format(new Date(doc.upload_date), 'dd. MMM yyyy', { locale: de })}
                        </p>
                      </div>
                      
                      {/* Badge */}
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0",
                        doc.file_type?.startsWith('image/') 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-[#1D64FF]/20 text-[#1D64FF]"
                      )}>
                        {doc.file_type?.startsWith('image/') ? 'Bild' : 'PDF'}
                      </span>
                      
                      {/* Menu Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocument(doc);
                          setShowActionSheet(true);
                        }}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                <div className="text-center space-y-6 relative">
                  {/* Icon placeholder */}
                  <div className="relative mx-auto w-24 h-24 mb-4">
                    <div className="absolute inset-0 bg-[#1D64FF] rounded-full blur-[40px] opacity-20" />
                    <div className="relative w-full h-full rounded-[32px] bg-gradient-to-b from-[#16191F] to-[#0A0C10] border border-white/[0.08] shadow-2xl flex items-center justify-center group cursor-default">
                      <FolderOpen className="w-10 h-10 text-[#1D64FF] group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    {/* Status Badge */}
                    <div className="absolute -top-2 -right-2 bg-[#0A0C10] border border-white/10 p-1.5 rounded-full shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-medium text-white tracking-tight">Belege sammeln</h2>
                    <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                      Füge deine Rechnungen und Quittungen direkt hinzu, um sie für deine Steuererklärung zu speichern.
                    </p>
                  </div>

                  {/* Stats / Counter */}
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center min-w-[80px]">
                      <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Gesamt</span>
                      <span className="text-sm text-zinc-200 font-medium font-mono">{documents.length}</span>
                    </div>
                    <div className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col items-center min-w-[80px]">
                      <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Monat</span>
                      <span className="text-sm text-zinc-200 font-medium">{currentMonth}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Upload Button */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 animate-[float_5s_ease-in-out_infinite] w-max">
            <button 
              onClick={() => setShowUploader(true)}
              className="group flex hover:border-[#1D64FF]/50 hover:shadow-[0_0_25px_-5px_rgba(29,100,255,0.4)] transition-all duration-300 cursor-pointer active:scale-95 bg-[#0A0C10] border-white/10 border rounded-full pt-2 pr-5 pb-2 pl-2 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),0_0_20px_-5px_rgba(29,100,255,0.15)] backdrop-blur-xl gap-x-3 gap-y-3 items-center"
              data-tour="document-upload-card"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-[#1D64FF] to-[#0040CC] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/10 group-hover:scale-105 transition-transform duration-300">
                <Plus className="w-5 h-5 text-white stroke-[2.5px]" />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-medium text-white group-hover:text-white transition-colors">
                  Dokument hinzufügen
                </span>
                <span className="text-[10px] text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium">
                  Scan oder Upload
                </span>
              </div>
            </button>
          </div>

          {/* Footer info */}
          <div className="absolute bottom-4 w-full text-center z-20">
            <p className="text-[10px] text-zinc-700 font-medium tracking-wide uppercase">
              Verschlüsselt & Sicher
            </p>
          </div>
        </div>

        <CameraCapture 
          open={showCamera} 
          onClose={() => setShowCamera(false)} 
          onCapture={handleCameraCapture}
          taxYear={selectedYear}
        />

        <DocumentActionSheet
          document={selectedDocument}
          open={showActionSheet}
          onClose={() => {
            setShowActionSheet(false);
            setSelectedDocument(null);
          }}
          onUpdate={loadDocuments}
          availableYears={allYears}
        />
      </div>
    </>
  );
};

// Main component that wraps DocumentsContent with FormProvider
const Documents: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  return (
    <FormProvider taxYear={selectedYear}>
      <DocumentsContent selectedYear={selectedYear} onYearChange={setSelectedYear} />
    </FormProvider>
  );
};

export default Documents;