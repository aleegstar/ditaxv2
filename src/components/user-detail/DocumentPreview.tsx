
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileIcon, X } from 'lucide-react';
import { UploadedDocument } from '@/types';
import { documentService } from '@/services/DocumentService';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DocumentPreviewProps {
  document: UploadedDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  isAdmin?: boolean;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  open,
  onOpenChange,
  userId,
  isAdmin = false
}) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoDecrypting, setAutoDecrypting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (document && open) {
      loadDocumentPreview();
    } else {
      setPreviewUrl(null);
      setError(null);
      setAutoDecrypting(false);
    }
  }, [document, open]);

  useEffect(() => {
    return () => {
      // Cleanup blob URLs when component unmounts
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadDocumentPreview = async () => {
    if (!document) return;

    setLoading(true);
    setError(null);
    setAutoDecrypting(false);

    try {
      console.log('📄 Loading document preview for:', document.fileName, document.fileType);
      console.log('📊 Document metadata:', document.metadata);
      console.log('👤 User ID:', userId, 'Is Admin:', isAdmin);
      
      // Check if document is encrypted using proper metadata
      const isEncrypted = document.metadata?.encrypted === true;
      console.log('🔐 Document is encrypted:', isEncrypted);
      
      if (isEncrypted) {
        console.log('🔓 Auto-decrypting encrypted document');
        setAutoDecrypting(true);
        
        // Handle encrypted documents - automatically decrypt
        const encryptedService = EncryptedDocumentService.getInstance();
        
        try {
          console.log('🔐 Attempting to decrypt document. Admin mode:', isAdmin);
          const { blob } = isAdmin 
            ? await encryptedService.adminDownloadDecryptedDocument(document.id, userId)
            : await encryptedService.downloadDecryptedDocument(document.id, userId);
          
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          console.log('✅ Encrypted document auto-decrypted successfully');
        } catch (decryptError: any) {
          console.error('❌ Failed to decrypt document:', decryptError);
          console.log('🔍 Current user ID from auth:', await supabase.auth.getUser());
          setError(`Fehler beim Entschlüsseln des Dokuments: ${decryptError.message}`);
          return;
        } finally {
          setAutoDecrypting(false);
        }
      } else {
        console.log('📁 Loading regular document, URL:', document.url);
        // For regular documents, use the existing URL if available
        if (document.url) {
          setPreviewUrl(document.url);
          console.log('✅ Regular document URL set for preview');
        } else {
          console.log('🔄 No URL found, refreshing document URL');
          // Try to refresh the document URL using the document service
          const newUrl = await documentService.refreshDocumentUrl(document.id);
          setPreviewUrl(newUrl);
          console.log('✅ Document URL refreshed');
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading document preview:', error);
      setError('Dokument konnte nicht geladen werden: ' + error.message);
    } finally {
      setLoading(false);
      setAutoDecrypting(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      console.log('⬇️ Starting download for document:', document.fileName);
      const isEncrypted = document.metadata?.encrypted === true;
      console.log('🔐 Download - Document is encrypted:', isEncrypted);
      
      if (isEncrypted) {
        const encryptedService = EncryptedDocumentService.getInstance();
        const { blob, fileName } = isAdmin
          ? await encryptedService.adminDownloadDecryptedDocument(document.id, userId)
          : await encryptedService.downloadDecryptedDocument(document.id, userId);
        
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = fileName;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('✅ Encrypted document downloaded');
      } else {
        // For regular documents, create download link
        if (document.url) {
          const a = window.document.createElement('a');
          a.href = document.url;
          a.download = document.fileName;
          a.target = '_blank';
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          console.log('✅ Regular document downloaded');
        }
      }

      toast({
        title: "Download gestartet",
        description: "Das Dokument wird heruntergeladen."
      });
    } catch (error: any) {
      console.error('❌ Download error:', error);
      toast({
        title: "Download-Fehler",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const isImage = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const isPDF = (fileType: string) => {
    return fileType === 'application/pdf';
  };

  const renderPreview = () => {
    if (loading || autoDecrypting) {
      return (
        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{autoDecrypting ? 'Dokument wird entschlüsselt...' : 'Dokument wird geladen...'}</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
          <div className="text-center max-w-md">
            <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg mb-2 text-foreground">Fehler beim Laden</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button 
              onClick={loadDocumentPreview}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Erneut versuchen
            </Button>
          </div>
        </div>
      );
    }

    if (!previewUrl || !document) {
      return (
        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
          <div className="text-center">
            <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg mb-2 text-foreground">Keine Vorschau verfügbar</p>
            <p className="text-sm text-muted-foreground">Das Dokument kann nicht angezeigt werden</p>
          </div>
        </div>
      );
    }

    if (isImage(document.fileType)) {
      return (
        <div className="flex items-center justify-center h-[500px] p-4">
          <img 
            src={previewUrl} 
            alt={document.fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            onError={() => setError('Bild konnte nicht geladen werden')}
          />
        </div>
      );
    }

    if (isPDF(document.fileType)) {
      return (
        <div className="w-full h-[500px] flex items-center justify-center p-4">
          <object
            data={previewUrl}
            type="application/pdf"
            className="w-full h-full rounded-lg shadow-lg border border-border"
            title={document.fileName}
          >
            {/* Fallback if object tag can't render the PDF */}
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-lg shadow-lg border border-border"
              title={document.fileName}
              style={{ border: 'none' }}
            />
          </object>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground">
        <div className="text-center">
          <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg mb-2 text-foreground">Vorschau nicht verfügbar</p>
          <p className="text-sm text-muted-foreground mb-4">
            Dateityp: {document.fileType}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Verwenden Sie den Download-Button, um die Datei zu öffnen
          </p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden bg-card text-card-foreground">
        <DialogHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1 pr-4">
              <DialogTitle className="text-foreground text-lg truncate">
                {document?.fileName || 'Dokument-Vorschau'}
              </DialogTitle>
              {document && (
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Hochgeladen: {document.uploadDate.toLocaleDateString('de-DE')}</span>
                  <span>Typ: {document.fileType}</span>
                  <span>Verschlüsselt: {document.metadata?.encrypted ? 'Ja' : 'Nein'}</span>
                  {autoDecrypting && <span className="text-primary">Wird entschlüsselt...</span>}
                </div>
              )}
            </div>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              disabled={loading || autoDecrypting}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;
