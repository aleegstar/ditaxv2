import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, Search, Eye, Image as ImageIcon, Folder, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DocumentViewer from '@/components/DocumentViewer';
import { DocumentMetadata } from '@/services/DocumentService';

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
  const { toast } = useToast();

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

      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', taxYear)
        .eq('status', 'active')
        .order('upload_date', { ascending: false });

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="w-full h-full max-w-none max-h-none rounded-none m-0 p-0 border-0 gap-0 flex flex-col overflow-hidden bg-white"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <header className="flex z-30 pt-8 px-6 pb-6 relative items-center justify-between shrink-0">
          <button 
            onClick={onClose}
            className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-32 relative z-20">
          {/* Page Title Section */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Folder className="w-6 h-6 text-blue-600" />
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight leading-tight">Hochgeladene Dokumente</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">{documents.length} Dokumente</p>
            </div>
          </div>

          {/* Context Text */}
          <div className="mb-6">
            <p className="text-xs text-slate-500 leading-relaxed">
              Zuordnen zu: <span className="text-slate-900 font-medium">{checklistItemTitle}</span>
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6 group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setAssignmentFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                assignmentFilter === 'all'
                  ? 'border border-blue-500 bg-blue-500 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setAssignmentFilter('unassigned')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                assignmentFilter === 'unassigned'
                  ? 'border border-blue-500 bg-blue-500 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Unzugeordnet
            </button>
          </div>

          {/* Document List */}
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-100 border border-slate-200 rounded-xl h-20"></div>
                </div>
              ))
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="text-slate-300 mx-auto mb-4 h-12 w-12" />
                <h3 className="font-medium text-slate-600 mb-2 text-base">
                  Keine Dokumente gefunden
                </h3>
                <p className="text-slate-400 text-sm px-4">
                  {assignmentFilter === 'unassigned' 
                    ? 'Alle Dokumente sind bereits zugeordnet.'
                    : 'Keine Dokumente entsprechen Ihren Suchkriterien.'}
                </p>
              </div>
            ) : (
              filteredDocuments.map((doc, index) => {
                const isSelected = selectedDocuments.has(doc.id);
                const isImage = doc.file_type?.startsWith('image/');
                
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocumentSelection(doc.id)}
                    className={`p-4 rounded-xl relative group overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {/* File Icon */}
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          {isImage ? (
                            <ImageIcon className="w-5 h-5 text-slate-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                          <h3 className="text-sm font-medium text-slate-900 leading-tight mb-1 truncate">
                            {doc.file_name}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-slate-500">
                              {format(new Date(doc.upload_date), 'dd.MM.yyyy', { locale: de })}
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium w-fit ${
                            doc.is_assigned_to_checklist
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                              : 'bg-slate-100 border border-slate-200 text-slate-500'
                          }`}>
                            {doc.is_assigned_to_checklist ? 'Zugeordnet' : 'Unzugeordnet'}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => handleViewDocument(e, doc, index)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-6 z-40">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs text-slate-500 font-medium">
              {selectedDocuments.size} Dokument(e) ausgewählt
            </span>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAssignDocuments}
                disabled={selectedDocuments.size === 0}
                className="px-4 py-2.5 rounded-lg bg-blue-500 text-xs font-semibold text-white hover:bg-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Dokumente zuordnen
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
    </Dialog>
  );
};

export default DocumentAssignmentModal;