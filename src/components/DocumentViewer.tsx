import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/modern-dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ChevronLeft, ChevronRight, Eye, RefreshCw, AlertCircle, AlertTriangle, Shield, ShieldCheck } from 'lucide-react';
import { DocumentMetadata, documentService } from '@/services/DocumentService';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";

import { debug } from '@/utils/debug';
interface DocumentViewerProps {
  documents: DocumentMetadata[];
  initialDocumentIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}
const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  initialDocumentIndex = 0,
  isOpen,
  onClose
}) => {
  // ALL HOOKS MUST BE DECLARED FIRST - NO EARLY RETURNS BEFORE HOOKS
  const [currentIndex, setCurrentIndex] = useState(initialDocumentIndex);
  const [retrying, setRetrying] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [storageError, setStorageError] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<Record<string, {
    url: string;
    fileType: string;
    fileName: string;
    arrayBuffer?: ArrayBuffer;
  }>>({});
  const [decrypting, setDecrypting] = useState<Set<string>>(new Set());
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const encryptedDocService = EncryptedDocumentService.getInstance();
  
  // Calculate currentDoc early for use in hooks
  const currentDoc = documents[currentIndex];
  const isEncrypted = currentDoc ? encryptedDocService.isDocumentEncrypted(currentDoc) : false;
  const hasDecryptedContent = currentDoc ? decryptedContent[currentDoc.id] : false;
  const effectiveUrl = currentDoc && hasDecryptedContent ? hasDecryptedContent.url : (currentDoc ? signedUrls[currentDoc.id] || currentDoc.url : undefined);
  
  // Calculate effective properties for encrypted vs non-encrypted docs
  const effectiveFileType = hasDecryptedContent ? hasDecryptedContent.fileType : (currentDoc?.fileType || '');
  const effectiveFileName = hasDecryptedContent ? hasDecryptedContent.fileName : (currentDoc?.fileName || '');
  const isImage = effectiveFileType?.startsWith('image/');
  const isPdf = effectiveFileType === 'application/pdf';
  const isDecryptingCurrent = decrypting.has(currentDoc?.id || '');

  useEffect(() => {
    setCurrentIndex(initialDocumentIndex);
    setStorageError(null);
  }, [initialDocumentIndex]);

  // Clean up object URLs when component unmounts or documents change
  useEffect(() => {
    return () => {
      Object.values(decryptedContent).forEach(content => {
        URL.revokeObjectURL(content.url);
      });
    };
  }, [decryptedContent]);

  // Auto-decrypt when dialog opens and document is encrypted
  useEffect(() => {
    if (isOpen && documents.length > 0 && currentDoc) {
      const isCurrentEncrypted = encryptedDocService.isDocumentEncrypted(currentDoc);
      const hasCurrentDecryptedContent = decryptedContent[currentDoc.id];
      const isDecryptingCurrent = decrypting.has(currentDoc.id);
      if (isCurrentEncrypted && !hasCurrentDecryptedContent && !isDecryptingCurrent) {
        debug.log('🔓 Auto-decrypting document on open:', currentDoc.fileName);
        handleDecryptDocument();
      }
    }
  }, [isOpen, currentIndex, documents]);

  // Auto-generate signed URL for non-encrypted docs when opening viewer
  useEffect(() => {
    if (!documents.length || !currentDoc) return;
    
    if (
      isOpen &&
      currentDoc &&
      !isEncrypted &&
      !hasDecryptedContent &&
      !effectiveUrl &&
      !loadingUrls.has(currentDoc.id)
    ) {
      handleRefreshUrl();
    }
  }, [isOpen, currentIndex, documents, currentDoc, decryptedContent, signedUrls, loadingUrls, isEncrypted, hasDecryptedContent, effectiveUrl]);

  // Canvas-to-Image PDF rendering for encrypted PDFs (same approach as ThumbnailService)
  useEffect(() => {
    const renderPdfToImage = async () => {
      if (!isPdf || !hasDecryptedContent || typeof hasDecryptedContent === 'boolean' || !hasDecryptedContent.arrayBuffer) {
        debug.log('❌ PDF rendering skipped:', { isPdf, hasDecryptedContent: !!hasDecryptedContent, hasArrayBuffer: !!(hasDecryptedContent && typeof hasDecryptedContent !== 'boolean' && hasDecryptedContent.arrayBuffer) });
        setPdfImageUrl(null);
        return;
      }

      setPdfRendering(true);
      setPdfError(null);

      try {
        debug.log('📄 Starting PDF rendering to image...', { 
          arrayBufferType: hasDecryptedContent.arrayBuffer.constructor.name,
          arrayBufferSize: hasDecryptedContent.arrayBuffer.byteLength 
        });

        // Load PDF from ArrayBuffer
        const pdf = await window.pdfjsLib.getDocument(hasDecryptedContent.arrayBuffer).promise;
        const page = await pdf.getPage(currentPdfPage);

        // Create OFF-SCREEN canvas (like ThumbnailService)
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Could not get canvas context');
        }

        // Higher scale for better quality (1.5 instead of 0.5 for thumbnails)
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // White background
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Convert canvas to PNG Data URL (like ThumbnailService)
        const dataUrl = canvas.toDataURL('image/png');
        
        // Store Data URL for display
        setPdfImageUrl(dataUrl);
        setPdfRendering(false);

        debug.log('✅ PDF rendered to image successfully');
      } catch (error) {
        console.error('❌ PDF rendering error:', error);
        setPdfError('PDF konnte nicht geladen werden');
        setPdfRendering(false);
      }
    };

    renderPdfToImage();
  }, [isPdf, hasDecryptedContent, currentPdfPage]);

  // NOW WE CAN HANDLE GUARD CONDITIONS AFTER ALL HOOKS ARE DECLARED
  if (!documents.length) {
    return null;
  }
  if (!currentDoc) {
    debug.error('Current document is undefined at index:', currentIndex, 'Documents:', documents);
    return null;
  }

  const handlePrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : documents.length - 1);
    setStorageError(null);
  };
  const handleNext = () => {
    setCurrentIndex(prev => prev < documents.length - 1 ? prev + 1 : 0);
    setStorageError(null);
  };

  const handleDecryptDocument = async () => {
    if (!currentDoc || !isEncrypted) return;
    setDecrypting(prev => new Set(prev).add(currentDoc.id));
    setStorageError(null);
    try {
      // Get current user ID - using supabase directly
      const {
        data: sessionData,
        error: sessionError
      } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Du musst angemeldet sein, um verschlüsselte Dokumente zu entschlüsseln.');
      }
      const userId = sessionData.session.user.id;

      // Use the new method for user's own documents
      const {
        blob,
        fileName,
        fileType
      } = await encryptedDocService.downloadDecryptedDocument(currentDoc.id, userId);

      // Convert blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // Create blob URL for preview (images) and storage
      // For PDFs, we'll use canvas rendering with the ArrayBuffer
      const url = URL.createObjectURL(blob);
      
      setDecryptedContent(prev => ({
        ...prev,
        [currentDoc.id]: {
          url,
          fileType,
          fileName: fileName,
          arrayBuffer
        }
      }));
      if (!isOpen) {
        // Only show toast if not auto-decrypting on open
        toast({
          title: "Dokument entschlüsselt",
          description: "Das verschlüsselte Dokument wurde für die Vorschau entschlüsselt."
        });
      }
    } catch (error: any) {
      debug.error('Error decrypting document:', error);
      setStorageError(error.message);
      toast({
        title: "Entschlüsselungsfehler",
        description: error.message || "Das Dokument konnte nicht entschlüsselt werden.",
        variant: "destructive"
      });
    } finally {
      setDecrypting(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentDoc.id);
        return newSet;
      });
    }
  };
  const handleDownload = async () => {
    if (isEncrypted && hasDecryptedContent) {
      // Download decrypted content
      try {
        const link = window.document.createElement('a');
        link.href = hasDecryptedContent.url;
        link.download = hasDecryptedContent.fileName;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        toast({
          title: "Download gestartet",
          description: `${hasDecryptedContent.fileName} wird heruntergeladen.`
        });
      } catch (error) {
        debug.error('Download error:', error);
        toast({
          title: "Download-Fehler",
          description: "Die Datei konnte nicht heruntergeladen werden.",
          variant: "destructive"
        });
      }
    } else if (!currentDoc?.url) {
      await handleRefreshUrl();
      return;
    } else {
      // Normal download for unencrypted files
      try {
        debug.log('Downloading document:', currentDoc.fileName);
        const link = window.document.createElement('a');
        link.href = currentDoc.url;
        link.download = currentDoc.fileName;
        link.target = '_blank';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        toast({
          title: "Download gestartet",
          description: `${currentDoc.fileName} wird heruntergeladen.`
        });
      } catch (error) {
        debug.error('Download error:', error);
        toast({
          title: "Download-Fehler",
          description: "Die Datei konnte nicht heruntergeladen werden.",
          variant: "destructive"
        });
      }
    }
  };
  const handleRefreshUrl = async () => {
    if (!currentDoc) return;
    setLoadingUrls(prev => new Set(prev).add(currentDoc.id));
    setStorageError(null);
    try {
      debug.log('Refreshing URL for document:', currentDoc.id);
      const newUrl = await documentService.refreshDocumentUrl(currentDoc.id);
      if (newUrl) {
        setSignedUrls(prev => ({ ...prev, [currentDoc.id]: newUrl }));
        // Removed toast notification for automatic URL refresh
      } else {
        throw new Error('URL konnte nicht generiert werden');
      }
    } catch (error: any) {
      debug.error('Error refreshing URL:', error);
      const errorMessage = error.message || 'Unbekannter Fehler';
      setStorageError(errorMessage);
      if (errorMessage.includes('Storage') || errorMessage.includes('Berechtigungen')) {
        toast({
          title: "Storage-Berechtigungen fehlen",
          description: "Bitte konfigurieren Sie die Storage-Policies im Supabase Dashboard.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Fehler beim Aktualisieren",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoadingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentDoc.id);
        return newSet;
      });
    }
  };
  const handleRetry = async () => {
    setRetrying(true);
    setStorageError(null);
    try {
      await documentService.clearCache();
      await documentService.fetchDocuments(true, currentDoc.metadata?.taxYear || new Date().getFullYear().toString());
      toast({
        title: "Dokumente aktualisiert",
        description: "Die Dokumentenliste wurde erfolgreich aktualisiert."
      });
    } catch (error: any) {
      debug.error('Error during retry:', error);
      setStorageError(error.message);
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message || "Die Dokumente konnten nicht aktualisiert werden.",
        variant: "destructive"
      });
    } finally {
      setRetrying(false);
    }
  };
  const isDocumentLoading = loadingUrls.has(currentDoc.id);
  debug.log('DocumentViewer rendering:', {
    currentDoc: currentDoc?.fileName,
    effectiveUrl,
    isEncrypted,
    hasDecryptedContent,
    effectiveFileType,
    isDecryptingCurrent
  });
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="flex flex-col p-4 sm:p-6" 
        style={{ backgroundColor: 'rgb(244 244 244 / var(--tw-bg-opacity, 1))' }}
        data-document-viewer="true"
      >
        <DialogHeader className="flex-shrink-0 space-y-3 sm:space-y-1.5">
          <DialogTitle className="text-left pr-12">
            {/* Mobile Layout - Stacked */}
            <div className="flex flex-col space-y-3 sm:hidden">
              {/* Title and Counter */}
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-base font-semibold truncate pr-2" style={{ color: 'rgb(26, 32, 44)' }}>{effectiveFileName}</span>
                  {isEncrypted && <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                </div>
                {documents.length > 1 && <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} von {documents.length}
                  </span>}
              </div>
              
              {/* Mobile Button Row with consistent bottom margin */}
              <div className="flex items-center justify-between gap-2 mb-6">
                {/* Navigation Buttons */}
                {documents.length > 1 && <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={handlePrevious} className="h-8 px-2 text-gray-950">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNext} className="h-8 px-2 text-gray-950">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>}
                
                {/* Download Button (hidden on mobile, shown in preview overlay) */}
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={!effectiveUrl && !isDocumentLoading} className="hidden h-8 px-3 text-gray-950">
                  <Download className="h-4 w-4 mr-1" />
                  <span className="hidden xs:inline">Download</span>
                </Button>
              </div>
            </div>

            {/* Desktop Layout - Horizontal */}
            <div className="hidden sm:block mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-lg font-semibold truncate" style={{ color: 'rgb(26, 32, 44)' }}>{effectiveFileName}</span>
                    {isEncrypted && <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                  </div>
                  {documents.length > 1 && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={handlePrevious} className="text-gray-950">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {currentIndex + 1} von {documents.length}
                      </span>
                      <Button variant="outline" size="sm" onClick={handleNext} className="text-gray-950">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 mt-4">
          {/* Auto-decryption info */}
          {isEncrypted && isDecryptingCurrent && <Alert className="mb-4 flex-shrink-0 border-blue-200 bg-blue-50">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="font-medium text-blue-900">Dokument wird entschlüsselt...</div>
                <div className="text-sm mt-1 text-blue-700">
                  Bitte warten Sie, während das verschlüsselte Dokument für die Vorschau vorbereitet wird.
                </div>
              </AlertDescription>
            </Alert>}
          
          {storageError}
          
          <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900 relative">
            {/* Download Button - positioned absolutely in top right of preview */}
            <div className="absolute top-3 right-3 z-10 block">
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!effectiveUrl && !isDocumentLoading} className="text-gray-950 bg-white shadow-md">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
            
            {(!effectiveUrl && !isDecryptingCurrent) ? <div className="text-center text-muted-foreground p-4 sm:p-8 max-w-sm">
                <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-orange-500" />
                <p className="text-base sm:text-lg font-medium mb-2">
                  Vorschau nicht verfügbar
                </p>
                <p className="text-sm mb-4">
                  {storageError || "Die Dokumentenvorschau konnte nicht geladen werden."}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={handleRefreshUrl} disabled={isDocumentLoading} variant="outline" size="sm" className="w-full sm:w-auto">
                    {isDocumentLoading ? (
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden">Laden</span>
                        <span className="hidden sm:inline">Erneut laden</span>
                      </div>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        <span className="sm:hidden">Laden</span>
                        <span className="hidden sm:inline">Erneut laden</span>
                      </>
                    )}
                  </Button>
                  <Button onClick={handleRetry} disabled={retrying} variant="outline" size="sm" className="w-full sm:w-auto">
                    {retrying ? (
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden">Liste</span>
                        <span className="hidden sm:inline">Liste aktualisieren</span>
                      </div>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        <span className="sm:hidden">Liste</span>
                        <span className="hidden sm:inline">Liste aktualisieren</span>
                      </>
                    )}
                  </Button>
                </div>
              </div> : isDecryptingCurrent ? <div className="text-center text-muted-foreground p-4 sm:p-8 max-w-sm">
                <Shield className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-blue-500 animate-pulse" />
                <p className="text-base sm:text-lg font-medium mb-2">
                  Wird entschlüsselt...
                </p>
                <p className="text-sm mb-4">
                  Das verschlüsselte Dokument wird für die Vorschau vorbereitet.
                </p>
              </div> : (isPdf && hasDecryptedContent && typeof hasDecryptedContent !== 'boolean' && hasDecryptedContent.arrayBuffer) ? (
                <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-auto">
                  {pdfRendering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 z-10">
                      <Shield className="h-12 w-12 text-blue-500 animate-pulse" />
                    </div>
                  )}
                  {pdfError && (
                    <div className="text-center text-muted-foreground p-4">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                      <p>{pdfError}</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={handleDecryptDocument}>
                        Erneut versuchen
                      </Button>
                    </div>
                  )}
                  {pdfImageUrl && !pdfRendering && !pdfError && (
                    <img 
                      src={pdfImageUrl}
                      alt="PDF Preview"
                      className="max-w-full h-auto rounded shadow-lg"
                    />
                  )}
                  {!pdfImageUrl && !pdfRendering && !pdfError && (
                    <div className="text-center text-muted-foreground p-4">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                      <p>PDF-Bild konnte nicht erstellt werden</p>
                    </div>
                  )}
                </div>
              ) : (isPdf && effectiveUrl && !hasDecryptedContent) ? (
                <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
                  <iframe
                    src={effectiveUrl}
                    className="w-full h-full min-h-[600px] border-0 rounded shadow-lg"
                    title={effectiveFileName}
                    onLoad={() => debug.log('✅ PDF loaded in iframe:', effectiveFileName)}
                    onError={(e) => {
                      debug.error('❌ PDF iframe load error:', effectiveFileName);
                      setStorageError('PDF konnte nicht geladen werden');
                    }}
                  />
                </div>
              ) : (effectiveUrl && isImage) ? (
                <div className="w-full h-full flex items-center mb-4 p-2 sm:p-4">
                  <img 
                    src={effectiveUrl} 
                    alt={effectiveFileName} 
                    className="max-w-full max-h-full object-contain rounded shadow-lg" 
                    onLoad={() => debug.log('Image loaded successfully:', effectiveFileName)} 
                    onError={e => {
                      debug.error('Image load error:', effectiveFileName);
                      setStorageError('Bild konnte nicht geladen werden');
                      toast({
                        title: "Bildfehler",
                        description: "Das Bild konnte nicht geladen werden.",
                        variant: "destructive"
                      });
                    }} 
                  />
                </div>
              ) : isPdf ? (
                <div className="text-center text-muted-foreground p-4 sm:p-8 max-w-sm">
                  <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-orange-500" />
                  <p className="text-base sm:text-lg font-medium mb-2">
                    PDF wird vorbereitet...
                  </p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-4 sm:p-8 max-w-sm">
                  <Eye className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-base sm:text-lg font-medium mb-4">Vorschau für {effectiveFileType} nicht unterstützt</p>
                  <Button onClick={handleDownload} disabled={!effectiveUrl} className="w-full sm:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Datei herunterladen
                  </Button>
                </div>
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};
export default DocumentViewer;