import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Eye, Trash2, Download, Edit2, Check, X, Calendar, Grid, List } from 'lucide-react';
import YearReassignmentModal from './YearReassignmentModal';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DocumentViewer from '@/components/DocumentViewer';
import { useIsMobile } from '@/hooks/use-mobile';
import { DocumentMetadata } from '@/services/DocumentService';
import { thumbnailService } from '@/services/ThumbnailService';
import DocumentPreviewGrid from './DocumentPreviewGrid';

interface YearDocumentManagerProps {
  year: string;
  documents: any[];
  loading: boolean;
  onDocumentsChange: () => void;
  availableYears: string[];
}

const YearDocumentManager: React.FC<YearDocumentManagerProps> = ({
  year,
  documents,
  loading,
  onDocumentsChange,
  availableYears
}) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Load PDF.js library
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      setPdfLibLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Generate thumbnails when documents change
  useEffect(() => {
    if (!pdfLibLoaded || documents.length === 0) return;

    const generateThumbnails = async () => {
      setLoadingThumbnails(true);
      
      try {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No user found for thumbnail generation');
          return;
        }

        const docsToGenerate = await Promise.all(
          documents.map(async (doc) => {
            const isEncrypted = doc.metadata?.encrypted === true;
            
            // For encrypted documents, we don't need a signed URL
            if (isEncrypted) {
              return {
                id: doc.id,
                fileUrl: '', // Not needed for encrypted docs
                fileType: doc.file_type,
                isEncrypted: true,
                userId: user.id
              };
            }
            
            // For non-encrypted documents, get signed URL
            const { data } = await supabase.storage
              .from('documents')
              .createSignedUrl(doc.file_path, 3600);
            
            if (!data?.signedUrl) return null;
            
            return {
              id: doc.id,
              fileUrl: data.signedUrl,
              fileType: doc.file_type,
              isEncrypted: false,
              userId: user.id
            };
          })
        );

        const validDocs = docsToGenerate.filter((doc): doc is NonNullable<typeof doc> => doc !== null);
        const thumbnailMap = await thumbnailService.generateThumbnailsBatch(validDocs);
        setThumbnails(thumbnailMap);
      } catch (error) {
        console.error('Failed to generate thumbnails:', error);
      } finally {
        setLoadingThumbnails(false);
      }
    };

    generateThumbnails();
  }, [documents, pdfLibLoaded]);

  const filteredDocuments = documents.filter((doc) => {
    // Apply search filter
    const searchFiltered = searchQuery === '' || 
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return searchFiltered;
  });

  // Convert documents to DocumentMetadata format for viewer
  const convertedDocuments: DocumentMetadata[] = filteredDocuments.map((doc) => ({
    id: doc.id,
    fileName: doc.file_name,
    fileType: doc.file_type,
    uploadDate: new Date(doc.upload_date),
    status: doc.status || 'active',
    checklistItemId: doc.checklist_item_id || '',
    url: doc.file_path ? null : null, // Will be generated by DocumentService
    metadata: {
      ...doc.metadata,
      size: doc.metadata?.size || 0,
      originalName: doc.file_name
    }
  }));

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete from storage
      const document = documents.find((d) => d.id === documentId);
      if (document?.file_path) {
        await supabase.storage.from('documents').remove([document.file_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('uploaded_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Dokument erfolgreich gelöscht"
      });
      onDocumentsChange();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen des Dokuments",
        variant: "destructive"
      });
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Herunterladen des Dokuments",
        variant: "destructive"
      });
    }
  };

  const handlePreviewDocument = (index: number) => {
    setSelectedDocumentIndex(index);
    setViewerOpen(true);
  };

  const startEditingName = (documentId: string, currentName: string) => {
    setEditingDocumentId(documentId);
    setEditingName(currentName);
  };

  const cancelEditingName = () => {
    setEditingDocumentId(null);
    setEditingName('');
  };

  const saveDocumentName = async (documentId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Fehler",
        description: "Der Dateiname darf nicht leer sein",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('uploaded_documents')
        .update({ file_name: editingName.trim() })
        .eq('id', documentId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Dateiname erfolgreich geändert"
      });
      
      setEditingDocumentId(null);
      setEditingName('');
      onDocumentsChange();
    } catch (error) {
      console.error('Rename error:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Umbenennen der Datei",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded h-16 w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Search Input */}
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-gray-400">
                  <circle cx="9.80541" cy="9.80541" r="7.49047" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.0151 15.4043L17.9518 18.3334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <Input
                type="text"
                placeholder="Dateien suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-16 py-2 w-full bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white focus:border-gray-300"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded shadow-sm">
                  ⌘ K
                </kbd>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1 border border-gray-300 rounded-full p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={`h-8 w-8 ${viewMode === 'grid' 
                    ? '' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={`h-8 w-8 ${viewMode === 'list' 
                    ? '' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Dokumente vorhanden
              </h3>
              <p className="text-gray-500">
                Lade deine ersten Dokumente hoch
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <DocumentPreviewGrid
              documents={filteredDocuments}
              thumbnails={thumbnails}
              loadingThumbnails={loadingThumbnails}
              onDocumentClick={handlePreviewDocument}
              onDelete={handleDeleteDocument}
              onDownload={handleDownloadDocument}
              onRename={async (documentId, newName) => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;

                  const { error } = await supabase
                    .from('uploaded_documents')
                    .update({ file_name: newName })
                    .eq('id', documentId)
                    .eq('user_id', user.id);

                  if (error) throw error;

                  toast({
                    title: "Erfolg",
                    description: "Dokument erfolgreich umbenannt"
                  });
                  onDocumentsChange();
                } catch (error) {
                  console.error('Rename error:', error);
                  toast({
                    title: "Fehler",
                    description: "Fehler beim Umbenennen des Dokuments",
                    variant: "destructive"
                  });
                }
              }}
              onYearChange={() => {
                setYearModalOpen(true);
              }}
            />
          ) : (
            <div className="space-y-1">
              {filteredDocuments.map((doc, index) => (
                <div
                  key={doc.id}
                  className="group p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-1.5 bg-gray-100 rounded">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {editingDocumentId === doc.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="text-sm h-7 text-gray-900"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveDocumentName(doc.id);
                              if (e.key === 'Escape') cancelEditingName();
                            }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveDocumentName(doc.id)}
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditingName}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-gray-900 break-words">
                            {doc.file_name}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500">
                          {format(new Date(doc.upload_date), 'dd.MM.yyyy', { locale: de })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.is_assigned_to_checklist ? 'Zugeordnet' : 'Unzugeordnet'}
                        </p>
                      </div>
                      
                      {/* Action buttons below filename and date */}
                      <div className="flex items-center space-x-0.5 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setYearModalOpen(true)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                          title="Jahr ändern"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditingName(doc.id, doc.file_name)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewDocument(index)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isMobile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer */}
      <DocumentViewer
        documents={convertedDocuments}
        initialDocumentIndex={selectedDocumentIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />

      {/* Year Reassignment Modal */}
      <YearReassignmentModal
        open={yearModalOpen}
        onClose={() => setYearModalOpen(false)}
        currentYear={year}
        availableYears={availableYears}
        onReassignment={onDocumentsChange}
      />
    </>
  );
};

export default YearDocumentManager;
