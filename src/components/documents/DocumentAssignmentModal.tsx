import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, Search, Eye, Image as ImageIcon, Folder, Loader2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DocumentViewer from '@/components/DocumentViewer';
import { DocumentMetadata } from '@/services/DocumentService';
import DocumentValidator from '@/services/DocumentValidator';
import DocumentCheckScreen from './DocumentCheckScreen';
import { ValidationResult, ValidationProgress } from '@/types/documentProfile';
import AIDocumentValidation from '@/components/ui/ai-document-validation';
import { isMobileAppContext } from '@/utils/platform';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import {
  ModernUploadDialog,
  ModernUploadDialogContent,
  ModernUploadDialogHeader,
  ModernUploadDialogTitle,
  ModernUploadDialogDescription,
} from '@/components/ui/modern-upload-dialog';
import assignmentHero from '@/assets/assignment-hero.png';


// Thumbnail with lazy decryption for images, styled tile for PDFs/others
const DocumentThumbnail: React.FC<{ doc: any }> = ({ doc }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = doc.file_type?.startsWith('image/');
  const isPdf = doc.file_type === 'application/pdf' || doc.file_name?.toLowerCase().endsWith('.pdf');
  const ext = (doc.file_name?.split('.').pop() || '').toUpperCase().slice(0, 4);

  useEffect(() => {
    if (!isImage) return;
    let revoke: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const svc = EncryptedDocumentService.getInstance();
        const { blob } = await svc.downloadOwnDecryptedDocument(doc.id, user.id);
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        revoke = objectUrl;
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [doc.id, isImage]);

  if (isImage && url) {
    return (
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
        <img src={url} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (isImage && !failed) {
    return (
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
      </div>
    );
  }
  return (
    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0 border border-border flex flex-col items-center justify-center gap-1 ${isPdf ? 'bg-rose-50' : 'bg-muted'}`}>
      <FileText className={`w-5 h-5 ${isPdf ? 'text-rose-500' : 'text-muted-foreground'}`} strokeWidth={1.5} />
      <span className={`text-[9px] font-semibold tracking-wider ${isPdf ? 'text-rose-600' : 'text-muted-foreground'}`}>{ext || 'DOC'}</span>
    </div>
  );
};


interface DocumentAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  checklistItemId: string;
  checklistItemTitle: string;
  taxYear: string;
  onAssignment: () => void;
}

const DocumentAssignmentModal: React.FC<DocumentAssignmentModalProps> = ({
  open,
  onClose,
  checklistItemId,
  checklistItemTitle,
  taxYear,
  onAssignment
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'unassigned'>('unassigned');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDocuments, setViewerDocuments] = useState<DocumentMetadata[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // New document validation state (replaces OCR)
  const [showCheckScreen, setShowCheckScreen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [pendingDoc, setPendingDoc] = useState<any>(null);
  const [validationProgress, setValidationProgress] = useState<ValidationProgress | null>(null);
  
  const documentValidator = DocumentValidator.getInstance();
  const { toast } = useToast();
  const { activeTaxFilerId } = useTaxFiler();

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open, taxYear]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, assignmentFilter]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('uploaded_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', taxYear)
        .eq('status', 'active');

      if (activeTaxFilerId) {
        query = query.eq('tax_filer_id', activeTaxFilerId);
      }

      const { data, error } = await query.order('upload_date', { ascending: false });

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

  const filterDocuments = () => {
    let filtered = documents;

    // Filter by assignment status
    if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter(doc => !doc.is_assigned_to_checklist);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocuments(filtered);
  };

  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const handleViewDocument = (e: React.MouseEvent, doc: any, index: number) => {
    e.stopPropagation();
    
    const documentMetadata: DocumentMetadata = {
      id: doc.id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      url: doc.file_path,
      uploadDate: new Date(doc.upload_date),
      checklistItemId: doc.checklist_item_id || '',
      status: doc.status || 'active',
      metadata: {
        ...(doc.metadata || {}),
        taxYear: doc.tax_year || taxYear
      }
    };
    
    setViewerDocuments([documentMetadata]);
    setViewerInitialIndex(0);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setViewerDocuments([]);
    setViewerInitialIndex(0);
  };

  const handleAssignDocuments = async () => {
    if (selectedDocuments.size === 0) return;

    // Get the first selected document for validation
    const selectedArray = Array.from(selectedDocuments);
    const firstDocId = selectedArray[0];
    const firstDoc = documents.find(d => d.id === firstDocId);

    // Perform document validation if not already verified
    if (firstDoc && !isVerifying) {
      setIsVerifying(true);
      setValidationProgress({ step: 'preparing', percent: 0, message: 'Starte Prüfung...' });
      
      console.log('[Assignment] Starting document validation:', {
        documentId: firstDoc.id,
        fileName: firstDoc.file_name,
        checklistItemId,
        fileType: firstDoc.file_type
      });
      
      try {
        // Fetch the document file for validation
        const { data: urlData, error: urlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(firstDoc.file_path, 60);

        // If we can't get the signed URL, proceed with assignment (already uploaded)
        if (urlError || !urlData?.signedUrl) {
          console.warn('[Assignment] Could not get signed URL, proceeding with assignment');
          setIsVerifying(false);
          setValidationProgress(null);
          await performAssignment();
          return;
        }

        // Fetch the file as a blob
        setValidationProgress({ step: 'preparing', percent: 20, message: 'Dokument wird geladen...' });
        const response = await fetch(urlData.signedUrl);
        const blob = await response.blob();
        const file = new File([blob], firstDoc.file_name, { type: firstDoc.file_type });

        const result = await documentValidator.validate(
          file, 
          checklistItemId,
          (progress) => setValidationProgress(progress)
        );

        console.log('[Assignment] Validation result:', {
          fileName: file.name,
          bestMatch: result.best.docTypeId,
          confidence: result.best.confidence,
          needsConfirmation: result.needsUserConfirmation
        });

        setValidationProgress(null);

        // Show check screen if manual confirmation is required
        if (result.needsUserConfirmation) {
          setValidationResult(result);
          setPendingDoc(firstDoc);
          setShowCheckScreen(true);
          setIsVerifying(false);
          return;
        }
      } catch (err) {
        console.error('[Assignment] Validation error:', err);
        setValidationProgress(null);
        // On error, proceed with assignment anyway
        toast({
          title: "Hinweis",
          description: "Dokumentenprüfung übersprungen. Bitte stelle sicher, dass du das richtige Dokument zuordnest.",
          variant: "default"
        });
      }
      setIsVerifying(false);
    }

    // Proceed with assignment
    await performAssignment();
  };

  const performAssignment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get selected documents to update their filenames
      const { data: docs, error: fetchError } = await supabase
        .from('uploaded_documents')
        .select('id, file_name')
        .in('id', Array.from(selectedDocuments))
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;
      if (!docs) throw new Error('Dokumente nicht gefunden');

      // Update each document with new filename including checklist item title prefix
      for (const doc of docs) {
        // Remove any existing prefix (if document was previously assigned)
        const originalName = doc.file_name.includes(' - ') 
          ? doc.file_name.split(' - ').slice(1).join(' - ')
          : doc.file_name;
        
        const newFileName = `${checklistItemTitle} - ${originalName}`;

        const { error: updateError } = await supabase
          .from('uploaded_documents')
          .update({
            checklist_item_id: checklistItemId,
            is_assigned_to_checklist: true,
            assigned_date: new Date().toISOString(),
            file_name: newFileName
          })
          .eq('id', doc.id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Erfolg",
        description: `${selectedDocuments.size} Dokument(e) erfolgreich zugeordnet`,
      });

      onAssignment();
      onClose();
    } catch (error) {
      console.error('Error assigning documents:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Zuordnen der Dokumente",
        variant: "destructive"
      });
    }
  };

  // Handlers for DocumentCheckScreen
  const handleCheckConfirm = () => {
    setShowCheckScreen(false);
    setValidationResult(null);
    setPendingDoc(null);
    performAssignment();
  };

  const handleCheckReupload = () => {
    setShowCheckScreen(false);
    setValidationResult(null);
    // Deselect the problematic document
    if (pendingDoc) {
      const newSelection = new Set(selectedDocuments);
      newSelection.delete(pendingDoc.id);
      setSelectedDocuments(newSelection);
    }
    setPendingDoc(null);
  };

  const handleCheckChangeType = () => {
    setShowCheckScreen(false);
    setValidationResult(null);
    setPendingDoc(null);
    onClose();
  };

  return (
    <>
      {/* AI Document Validation Modal - Outside Dialog to ensure visibility */}
      {isVerifying && validationProgress && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card dark:bg-card rounded-2xl w-full max-w-sm p-6 shadow-xl border border-border">
            <AIDocumentValidation 
              progress={validationProgress}
              documentType={checklistItemTitle}
              documentTypeId={checklistItemId}
              foundKeywords={validationProgress.foundKeywords}
            />
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className="w-full h-full max-w-none max-h-none rounded-none m-0 p-0 border-0 gap-0 flex flex-col overflow-hidden bg-background"
          hideCloseButton
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <header className="flex z-30 pt-6 sm:pt-8 px-4 sm:px-8 pb-5 items-center gap-4 shrink-0 border-b border-border bg-card/40">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight truncate">
                  Dokumente zuordnen
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Zuordnen zu <span className="font-medium text-foreground">{checklistItemTitle}</span>
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              aria-label="Schließen"
            >
              <X className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-32 pt-6 relative z-20">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.6fr] gap-6">
              {/* Hero Card – left column */}
              <aside className="hidden lg:block">
                <div className="sticky top-6 bg-card rounded-3xl border border-border shadow-[0_20px_60px_-20px_rgba(15,27,61,0.12)] overflow-hidden">
                  <div className="relative h-56">
                    <img src={assignmentHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/85 via-[#0F1B3D]/15 to-transparent" />
                    <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                      <Folder className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                      <span className="text-[11px] font-semibold text-foreground">Zuordnen</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 mb-1.5">Schnell erledigt</p>
                      <h2 className="text-xl font-semibold leading-tight">Wähle dein Dokument.</h2>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                      Wähle das passende Dokument aus deinen Uploads und ordne es{' '}
                      <span className="font-medium text-foreground">{checklistItemTitle}</span> zu.
                    </p>
                    <div className="space-y-2.5 text-[12.5px] text-muted-foreground">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Mehrfachauswahl möglich</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Vorschau über das Augen-Symbol</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Wir prüfen den Inhalt automatisch</span>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Right column – search + list */}
              <div className="min-w-0">

              {/* Search */}
              <div className="relative mb-4 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Dokument suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl h-12 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setAssignmentFilter('all')}
                  className={`px-4 h-9 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    assignmentFilter === 'all'
                      ? 'bg-foreground text-background'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Alle ({documents.length})
                </button>
                <button
                  onClick={() => setAssignmentFilter('unassigned')}
                  className={`px-4 h-9 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    assignmentFilter === 'unassigned'
                      ? 'bg-foreground text-background'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Unzugeordnet ({documents.filter(d => !d.is_assigned_to_checklist).length})
                </button>
              </div>

              {/* Document List */}
              <div className="space-y-3">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-card border border-border rounded-2xl h-24"></div>
                    </div>
                  ))
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-20 bg-card border border-border rounded-3xl">
                    <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                      <FileText className="text-muted-foreground h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5 text-base">
                      Keine Dokumente gefunden
                    </h3>
                    <p className="text-muted-foreground text-sm px-6 max-w-sm mx-auto">
                      {assignmentFilter === 'unassigned' 
                        ? 'Alle Dokumente sind bereits zugeordnet.'
                        : 'Keine Dokumente entsprechen deiner Suche.'}
                    </p>
                  </div>
                ) : (
                  filteredDocuments.map((doc, index) => {
                    const isSelected = selectedDocuments.has(doc.id);
                    
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocumentSelection(doc.id)}
                        className={`p-3 sm:p-4 rounded-2xl relative group cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-card border-2 border-primary shadow-[0_4px_16px_-4px_rgba(15,27,61,0.12)]'
                            : 'bg-card border border-border hover:border-border/80 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Selection indicator */}
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-border bg-background'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                          </div>

                          {/* Thumbnail */}
                          <DocumentThumbnail doc={doc} />

                          {/* Info */}
                          <div className="flex flex-col min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-foreground leading-tight mb-1 truncate">
                              {doc.file_name}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {format(new Date(doc.upload_date), 'dd. MMM yyyy', { locale: de })}
                            </p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium w-fit ${
                              doc.is_assigned_to_checklist
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}>
                              {doc.is_assigned_to_checklist ? 'Zugeordnet' : 'Unzugeordnet'}
                            </span>
                          </div>

                          {/* Preview action */}
                          <button 
                            onClick={(e) => handleViewDocument(e, doc, index)}
                            className="w-9 h-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center shrink-0"
                            aria-label="Vorschau"
                          >
                            <Eye className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border px-4 sm:px-8 py-4 z-40">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 w-full">
              <span className="text-sm text-muted-foreground font-medium">
                <span className="text-foreground font-semibold">{selectedDocuments.size}</span> Dokument(e) ausgewählt
              </span>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="h-12 px-5 rounded-2xl border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAssignDocuments}
                  disabled={selectedDocuments.size === 0 || isVerifying}
                  className="h-12 px-6 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_-8px_rgba(15,27,61,0.4)]"
                  style={{ background: 'linear-gradient(180deg, #1E3A5F 0%, #0F1B3D 100%)' }}
                >
                  {isVerifying ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird geprüft...
                    </span>
                  ) : (
                    `Zuordnen${selectedDocuments.size > 0 ? ` (${selectedDocuments.size})` : ''}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>

        
        <DocumentViewer
          documents={viewerDocuments}
          initialDocumentIndex={viewerInitialIndex}
          isOpen={viewerOpen}
          onClose={handleCloseViewer}
        />

        {/* Document Check Screen Modal - Using ModernUploadDialog for consistent styling */}
        <ModernUploadDialog open={showCheckScreen} onOpenChange={(open) => !open && handleCheckReupload()}>
          <ModernUploadDialogContent className="sm:max-w-md">
            {validationResult && (
              <DocumentCheckScreen
                result={validationResult}
                fileName={pendingDoc?.file_name || ''}
                onConfirm={handleCheckConfirm}
                onReupload={handleCheckReupload}
                onClose={handleCheckReupload}
                isConfirming={false}
              />
            )}
          </ModernUploadDialogContent>
        </ModernUploadDialog>
      </Dialog>
    </>
  );
};

export default DocumentAssignmentModal;
