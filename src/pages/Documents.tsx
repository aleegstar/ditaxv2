import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FileText, Image, Plus, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormContext, FormProvider } from '@/contexts';
import EnhancedDocumentUploader from '@/components/EnhancedDocumentUploader';
import { DocumentsTour } from '@/components/DocumentsTour';
import { useDocumentsTour } from '@/contexts/DocumentsTourContext';
import CameraCapture from '@/components/documents/CameraCapture';
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

  const areAllDocumentsUploaded = (): boolean => {
    const requiredItems = checklistItems.filter(item => item.required);
    if (requiredItems.length === 0 || !formDataLoaded) {
      return false;
    }
    const missingItems = requiredItems.filter(item => {
      const hasDoc = documents.some(doc => 
        doc.is_assigned_to_checklist === true && 
        doc.checklist_item_id === item.id &&
        doc.tax_year === selectedYear
      );
      return !hasDoc;
    });
    return missingItems.length === 0;
  };

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
    toast({
      title: "Upload erfolgreich",
      description: "Deine Dokumente wurden hochgeladen",
    });
  };

  const formatDocDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Heute';
      if (diffDays === 1) return 'Gestern';
      return format(date, 'dd.MM.yyyy', { locale: de });
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) {
      return <Image className="w-10 h-10 text-zinc-600/60 drop-shadow-lg" />;
    }
    return <FileText className="w-10 h-10 text-zinc-600/60 drop-shadow-lg" />;
  };

  const getFileBadge = (doc: any) => {
    if (doc.file_type?.startsWith('image/')) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold tracking-wide shadow-lg shadow-emerald-900/20">
          IMG
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-[#1D64FF] text-white text-[11px] font-bold tracking-wide shadow-lg shadow-blue-900/20">
        {doc.tax_year}
      </span>
    );
  };
  
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
        <div className="min-h-screen md:max-w-2xl bg-[#020408] w-full max-w-[500px] mr-auto ml-auto relative flex flex-col px-6 md:px-8 py-8 md:py-12 shadow-2xl overflow-hidden">
          
          {/* Background Ambient Glow */}
          <div 
            className="absolute top-0 left-0 w-full h-[600px] z-0 pointer-events-none opacity-100"
            style={{
              background: 'radial-gradient(circle at 50% -20%, rgba(29, 100, 255, 0.12) 0%, rgba(29, 100, 255, 0.01) 60%, transparent 80%)',
              filter: 'blur(80px)'
            }}
          />

          {/* Main Content */}
          <div className="z-20 flex-1 flex flex-col w-full relative">
            
            {/* Header / Navigation - hidden when uploading */}
            {!hasFilesInUploader && (
              <div className="flex items-center justify-between mb-10">
                <button 
                  onClick={() => navigate(-1)}
                  className="w-12 h-12 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] hover:shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)] transition-all duration-300 group shadow-lg shadow-black/40 backdrop-blur-md"
                >
                  <ArrowLeft className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                </button>
                
                <h1 className="font-medium text-xl tracking-tight text-white/90">Dokumente</h1>
                
                <div className="w-12" />
              </div>
            )}

            {/* Content Section */}
            <div className="space-y-10 flex-1">
              
              {/* Tax Year Selection - hidden when uploading */}
              {!hasFilesInUploader && (
                <div className="space-y-3 group" data-tour="documents-year-selector">
                  <label className="text-sm font-medium text-zinc-400 ml-1 group-focus-within:text-[#1D64FF] transition-colors">
                    Steuerjahr auswählen
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                      className="w-full h-14 px-5 text-base bg-[#0A0C10] border border-white/[0.08] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1D64FF]/30 focus:border-[#1D64FF]/50 text-zinc-200 cursor-pointer transition-all duration-200 font-medium shadow-sm hover:border-white/10 hover:bg-[#0F1216] flex items-center justify-between"
                    >
                      <span>Steuererklärung {selectedYear}</span>
                      <ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform", isYearDropdownOpen && "rotate-180")} />
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
              )}

              {/* Upload Area - Direct Uploader */}
              <div className="space-y-3" data-tour="document-upload-card">
                {!hasFilesInUploader && (
                  <label className="text-sm font-medium text-zinc-400 ml-1">Dateien hochladen</label>
                )}
                <EnhancedDocumentUploader
                  key={uploaderKey}
                  onBack={() => {}}
                  onDocumentSubmitted={handleUploadSuccess}
                  hasUploadedFiles={documents.length > 0}
                  onPreviewChange={setHasFilesInUploader}
                />
              </div>

              {/* Uploaded Files Grid - hidden when uploading */}
              {!hasFilesInUploader && (
                <div className="space-y-4 pt-2" data-tour="uploaded-documents-accordion">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-base font-medium text-white tracking-tight">Bereits hochgeladen</h3>
                    <span className="text-xs font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.05] px-2.5 py-1 rounded-full shadow-sm">
                      {documents.length} Dateien
                    </span>
                  </div>

                  {/* Grid Layout for Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="group relative flex flex-col bg-[#0A0C10] border border-white/[0.06] rounded-[24px] overflow-hidden hover:border-[#1D64FF]/30 hover:shadow-[0_0_30px_-10px_rgba(29,100,255,0.15)] transition-all duration-300"
                      >
                        {/* Preview Image Area */}
                        <div className={cn(
                          "h-40 w-full relative overflow-hidden",
                          doc.file_type?.startsWith('image/') 
                            ? "bg-gradient-to-br from-emerald-900/10 via-zinc-800/10 to-zinc-900/30"
                            : "bg-gradient-to-br from-zinc-800/20 via-zinc-800/10 to-zinc-900/30"
                        )}>
                          {/* Decorative gradient blob */}
                          <div className={cn(
                            "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl",
                            doc.file_type?.startsWith('image/') 
                              ? "bg-emerald-500/10 opacity-40"
                              : "bg-[#1D64FF]/10 opacity-50"
                          )} />
                          
                          {/* Top Bar (Menu & Badge) */}
                          <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start z-10">
                            <button className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-white/20 transition-colors text-white">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {getFileBadge(doc)}
                          </div>
                          
                          {/* Center Icon Placeholder */}
                          <div className="absolute inset-0 flex items-center justify-center z-0 group-hover:scale-105 transition-transform duration-500">
                            {getFileIcon(doc.file_type)}
                          </div>
                        </div>
                        
                        {/* Footer Info */}
                        <div className="p-4 bg-[#0A0C10] z-10 relative">
                          <p className="text-[13px] font-medium text-white truncate leading-snug">{doc.file_name}</p>
                          <p className="text-[11px] text-zinc-500 mt-1 font-medium">{formatDocDate(doc.upload_date)}</p>
                        </div>
                      </div>
                    ))}

                    {/* Add More Placeholder - scrolls to uploader */}
                    <div 
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="relative flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/[0.06] rounded-[24px] overflow-hidden hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 cursor-pointer h-full min-h-[220px]"
                    >
                      <Plus className="w-6 h-6 text-zinc-500 mb-2" />
                      <span className="text-xs font-medium text-zinc-500">Mehr hinzufügen</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions - hidden when uploading */}
            {!hasFilesInUploader && (
              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => navigate(-1)}
                  className="px-8 bg-transparent hover:bg-white/[0.03] border border-transparent hover:border-white/10 text-zinc-400 hover:text-white rounded-2xl py-4 text-sm font-medium transition-all duration-300"
                >
                  Zurück
                </button>
                
                <button 
                  onClick={() => areAllDocumentsUploaded() ? navigate('/payment') : null}
                  disabled={!areAllDocumentsUploaded()}
                  className={cn(
                    "flex-1 relative overflow-hidden border text-white rounded-2xl py-4 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 group",
                    areAllDocumentsUploaded()
                      ? "bg-gradient-to-b from-[#1D64FF] to-[#1450CC] hover:to-[#1D64FF] border-[#1D64FF] shadow-[0_0_30px_-5px_rgba(29,100,255,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_-5px_rgba(29,100,255,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]"
                      : "bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="relative z-10">Weiter</span>
                </button>
              </div>
            )}
          </div>
        </div>


        <CameraCapture 
          open={showCamera} 
          onClose={() => setShowCamera(false)} 
          onCapture={handleCameraCapture}
          taxYear={selectedYear}
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