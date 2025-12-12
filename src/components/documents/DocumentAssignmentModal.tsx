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

      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          checklist_item_id: checklistItemId,
          is_assigned_to_checklist: true,
          assigned_date: new Date().toISOString()
        })
        .in('id', Array.from(selectedDocuments))
        .eq('user_id', user.id);

      if (error) throw error;

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
        className="w-full h-full max-w-none max-h-none rounded-none m-0 p-0 bg-[#020408] border-0 gap-0 flex flex-col overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Ambient Background Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <header className="flex z-30 pt-8 px-6 pb-6 relative items-center justify-between shrink-0">
          <button 
            onClick={onClose}
            className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 hover:to-white/5 transition-all shadow-lg backdrop-blur-sm group"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" strokeWidth={1.5} />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-32 relative z-20">
          {/* Page Title Section */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_-5px_rgba(37,99,235,0.3)]">
              <Folder className="w-6 h-6 text-blue-400" />
            </div>
            <div className="pt-0.5">
              <h1 className="text-xl font-semibold text-white tracking-tight leading-tight">Hochgeladene Dokumente</h1>
              <p className="text-sm text-zinc-400 font-medium mt-1">{documents.length} Dokumente</p>
            </div>
          </div>

          {/* Context Text */}
          <div className="mb-6">
            <p className="text-xs text-zinc-500 leading-relaxed">
              Zuordnen zu: <span className="text-zinc-200">{checklistItemTitle}</span>
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6 group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner shadow-black/20"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setAssignmentFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                assignmentFilter === 'all'
                  ? 'border border-blue-500/30 bg-blue-600/20 text-blue-400 shadow-[0_0_15px_-5px_rgba(37,99,235,0.3)]'
                  : 'border border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setAssignmentFilter('unassigned')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                assignmentFilter === 'unassigned'
                  ? 'border border-blue-500/30 bg-blue-600/20 text-blue-400 shadow-[0_0_15px_-5px_rgba(37,99,235,0.3)]'
                  : 'border border-white/5 bg-white/[0.02] text-zinc-400 hover:bg-white/5 hover:text-white'
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
                  <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl h-20"></div>
                </div>
              ))
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="text-zinc-600 mx-auto mb-4 h-12 w-12" />
                <h3 className="font-medium text-zinc-400 mb-2 text-base">
                  Keine Dokumente gefunden
                </h3>
                <p className="text-zinc-500 text-sm px-4">
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
                        ? 'bg-blue-600/10 border border-blue-500/30'
                        : 'bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.12]'
                    }`}
                  >
                    {/* Hover Beam */}
                    <div className="absolute top-0 left-0 w-full h-[1px] overflow-hidden z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div 
                        className="absolute top-0 h-[1px] w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent blur-[1px]"
                        style={{ animation: 'beam-move-h 3s linear infinite' }}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {/* File Icon */}
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">
                          {isImage ? (
                            <ImageIcon className="w-5 h-5 text-zinc-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                          <h3 className="text-sm font-medium text-zinc-200 leading-tight mb-1 truncate">
                            {doc.file_name}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-zinc-500">
                              {format(new Date(doc.upload_date), 'dd.MM.yyyy', { locale: de })}
                            </span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium w-fit ${
                            doc.is_assigned_to_checklist
                              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                              : 'bg-zinc-800/50 border border-white/5 text-zinc-400'
                          }`}>
                            {doc.is_assigned_to_checklist ? 'Zugeordnet' : 'Unzugeordnet'}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => handleViewDocument(e, doc, index)}
                        className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
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
        <div className="absolute bottom-0 left-0 right-0 bg-[#020408]/80 backdrop-blur-xl border-t border-white/10 p-6 z-40">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs text-zinc-400 font-medium">
              {selectedDocuments.size} Dokument(e) ausgewählt
            </span>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-white/10 text-xs font-medium text-white hover:bg-white/5 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAssignDocuments}
                disabled={selectedDocuments.size === 0}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Dokumente zuordnen
              </button>
            </div>
          </div>
        </div>

        {/* CSS for beam animation */}
        <style>{`
          @keyframes beam-move-h {
            0% { left: -100px; opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { left: 100%; opacity: 0; }
          }
        `}</style>
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