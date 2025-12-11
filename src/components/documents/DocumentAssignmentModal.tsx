import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Check, Search, Filter, Eye, Image as ImageIcon } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import DocumentViewer from '@/components/DocumentViewer';
import { DocumentMetadata } from '@/services/DocumentService';
import { thumbnailService } from '@/services/ThumbnailService';

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
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open, taxYear]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, assignmentFilter]);

  useEffect(() => {
    if (documents.length > 0) {
      loadThumbnails();
    }
  }, [documents]);

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

  const loadThumbnails = async () => {
    setLoadingThumbnails(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const documentsToProcess = documents.map(doc => ({
        id: doc.id,
        fileUrl: doc.file_path,
        fileType: doc.file_type,
        isEncrypted: doc.metadata?.encrypted || false,
        userId: user.id
      }));

      const generatedThumbnails = await thumbnailService.generateThumbnailsBatch(documentsToProcess);
      setThumbnails(generatedThumbnails);
    } catch (error) {
      console.error('Error loading thumbnails:', error);
    } finally {
      setLoadingThumbnails(false);
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
    e.stopPropagation(); // Prevent selection toggle
    
    // Convert to DocumentMetadata format
    const documentMetadata: DocumentMetadata = {
      id: doc.id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      url: doc.file_path, // Add url field for DocumentViewer
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

      // Update selected documents
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
        className="w-full h-full max-w-none max-h-none rounded-none m-0 p-0 bg-white border-gray-200 gap-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className={`bg-white border-b border-gray-100 flex-shrink-0 ${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-600">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 20.75H6C3.582 20.75 2.25 19.418 2.25 17V7C2.25 4.582 3.582 3.25 6 3.25H10C10.199 3.25 10.39 3.329 10.53 3.47L13.3101 6.25H18C20.418 6.25 21.75 7.582 21.75 10V17C21.75 19.418 20.418 20.75 18 20.75ZM6 4.75C4.423 4.75 3.75 5.423 3.75 7V17C3.75 18.577 4.423 19.25 6 19.25H18C19.577 19.25 20.25 18.577 20.25 17V10C20.25 8.423 19.577 7.75 18 7.75H13C12.801 7.75 12.61 7.671 12.47 7.53L9.68994 4.75H6Z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h2 className={`font-semibold text-gray-800 ${isMobile ? 'text-base' : 'text-lg'}`}>Hochgeladene Dokumente</h2>
              <p className="text-sm text-gray-500">{documents.length} Dokumente</p>
            </div>
          </div>
          
          <p className={`text-gray-600 mb-4 ${isMobile ? 'text-sm' : 'text-sm'}`}>
            Zuordnen zu: <span className="font-medium">{checklistItemTitle}</span>
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 bg-white border-gray-200 text-gray-800 focus:border-blue-500 ${isMobile ? 'h-12' : ''}`}
            />
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            <Button
              variant={assignmentFilter === 'all' ? 'default' : 'outline'}
              size={isMobile ? 'default' : 'sm'}
              onClick={() => setAssignmentFilter('all')}
              className={`${assignmentFilter === 'all' ? 'bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} ${isMobile ? 'px-4 py-2' : ''}`}
            >
              Alle
            </Button>
            <Button
              variant={assignmentFilter === 'unassigned' ? 'default' : 'outline'}
              size={isMobile ? 'default' : 'sm'}
              onClick={() => setAssignmentFilter('unassigned')}
              className={`${assignmentFilter === 'unassigned' ? 'bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} ${isMobile ? 'px-4 py-2' : ''}`}
            >
              Unzugeordnet
            </Button>
          </div>
        </div>

        {/* Document List */}
        <div className={`flex-1 overflow-y-auto bg-white ${isMobile ? 'px-4' : 'px-6'}`}>
          {loading ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className={`bg-gray-100 rounded-lg ${isMobile ? 'h-20' : 'h-16'}`}></div>
                </div>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-16' : 'py-12'}`}>
              <FileText className={`text-gray-300 mx-auto mb-4 ${isMobile ? 'h-16 w-16' : 'h-12 w-12'}`} />
              <h3 className={`font-semibold text-gray-700 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                Keine Dokumente gefunden
              </h3>
              <p className={`text-gray-500 ${isMobile ? 'text-sm px-4' : 'text-sm'}`}>
                {assignmentFilter === 'unassigned' 
                  ? 'Alle Dokumente sind bereits zugeordnet oder es existieren keine Dokumente für dieses Jahr.'
                  : 'Keine Dokumente entsprechen Ihren Suchkriterien.'}
              </p>
            </div>
          ) : (
            <div className={`space-y-3 ${isMobile ? 'py-2' : 'py-4'}`}>
              {filteredDocuments.map((doc) => {
                const thumbnail = thumbnails.get(doc.id);
                const isImage = doc.file_type.startsWith('image/');
                const isPdf = doc.file_type === 'application/pdf';
                
                return (
                  <div
                    key={doc.id}
                    className={`cursor-pointer transition-all rounded-lg border ${isMobile ? 'p-4' : 'p-4'} ${
                      selectedDocuments.has(doc.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleDocumentSelection(doc.id)}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <div className={`relative ${isMobile ? 'w-20 h-20' : 'w-16 h-16'} bg-muted rounded-lg overflow-hidden flex items-center justify-center`}>
                          {loadingThumbnails && !thumbnail ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              {isImage ? (
                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                              ) : (
                                <FileText className="w-6 h-6 text-muted-foreground" />
                              )}
                              <div className="text-xs text-muted-foreground">Lädt...</div>
                            </div>
                          ) : thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={doc.file_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              {isImage ? (
                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                              ) : (
                                <FileText className="w-6 h-6 text-muted-foreground" />
                              )}
                              <div className="text-xs text-muted-foreground">
                                {isPdf ? 'PDF' : isImage ? 'Bild' : 'Datei'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Document info */}
                      <div className="flex items-start flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className={`text-gray-800 font-medium truncate ${isMobile ? 'text-base' : 'text-sm'}`}>
                            {doc.file_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className={`text-gray-500 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                              {format(new Date(doc.upload_date), 'dd.MM.yyyy', { locale: de })}
                            </p>
                            {doc.is_assigned_to_checklist ? (
                              <Badge variant="secondary" className={`bg-green-100 text-green-700 border-green-200 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                                Zugeordnet
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={`border-gray-200 text-gray-600 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                                Unzugeordnet
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleViewDocument(e, doc, 0)}
                          className="text-gray-600 hover:bg-gray-100 p-2 h-auto flex-shrink-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`bg-white border-t border-gray-100 flex-shrink-0 ${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between items-center'}`}>
            <p className={`text-gray-600 ${isMobile ? 'text-center text-sm' : 'text-sm'}`}>
              {selectedDocuments.size} Dokument(e) ausgewählt
            </p>
            <div className={`flex gap-3 ${isMobile ? 'w-full' : ''}`}>
              <Button
                variant="outline"
                onClick={onClose}
                className={`border-gray-200 text-gray-600 hover:bg-gray-50 ${isMobile ? 'flex-1 h-12' : ''}`}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAssignDocuments}
                disabled={selectedDocuments.size === 0}
                className={`bg-blue-600 hover:bg-blue-700 text-white ${isMobile ? 'flex-1 h-12' : ''}`}
              >
                {isMobile && selectedDocuments.size > 0 
                  ? 'Dokumente zuordnen'
                  : selectedDocuments.size > 0 
                  ? `${selectedDocuments.size} Dokument(e) zuordnen`
                  : 'Dokumente zuordnen'
                }
              </Button>
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