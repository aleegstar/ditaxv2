import { useState, useEffect, useCallback, useRef } from 'react';
import { documentService, DocumentMetadata } from '@/services/DocumentService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useFormContext } from '@/contexts/FormContext';
import { useDebouncedCallback } from '@/hooks/use-debounce';

export function useDocuments() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{
    storage: boolean;
    database: boolean;
    auth: boolean;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const isLoadingRef = useRef(false);
  
  // Get documents from FormContext instead of managing separate state
  const { 
    uploadedDocuments: documents,
    loadDocuments: formContextLoadDocuments,
    markUploaded,
    updateDocumentProgress 
  } = useFormContext();
  
  // Debounced document loading to prevent loops
  const debouncedLoadDocuments = useDebouncedCallback(async (forceRefresh = false) => {
    if (!isMounted.current || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading documents via FormContext...', { forceRefresh });
      
      // Use FormContext loadDocuments function with forceRefresh
      await formContextLoadDocuments(forceRefresh);
      
      if (isMounted.current) {
        console.log('Documents loaded successfully via FormContext');
      }
    } catch (err: any) {
      console.error('Error loading documents:', err);
      
      if (isMounted.current) {
        const errorMessage = err.message || 'Fehler beim Laden der Dokumente';
        setError(errorMessage);
        
        // Enhanced error handling for different error types
        if (errorMessage.includes('Authentifizierung') || errorMessage.includes('authentifiziert')) {
          toast({
            title: "Anmeldung erforderlich",
            description: "Bitte melde dich an, um auf deine Dokumente zuzugreifen",
            variant: "destructive",
          });
          
          navigate('/auth', { state: { from: window.location.pathname } });
        } else if (errorMessage.includes('Storage') || errorMessage.includes('Berechtigungen')) {
          toast({
            title: "Storage-Konfiguration",
            description: "Bitte konfigurieren Sie die Storage-Policies im Supabase Dashboard",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Fehler beim Laden",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, 500, [formContextLoadDocuments, navigate, toast]);

  const loadDocuments = useCallback((forceRefresh = false) => {
    debouncedLoadDocuments(forceRefresh);
  }, [debouncedLoadDocuments]);
  
  const deleteDocument = useCallback(async (documentId: string, checklistItemId: string) => {
    try {
      console.log('Deleting document:', documentId);
      await documentService.deleteDocument(documentId);
      
      // The FormContext will be updated via loadDocuments call
      await formContextLoadDocuments();
      
      toast({
        title: "Dokument gelöscht",
        description: "Das Dokument wurde erfolgreich gelöscht"
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deleting document:', err);
      
      toast({
        title: "Fehler beim Löschen",
        description: err.message || "Das Dokument konnte nicht gelöscht werden",
        variant: "destructive"
      });
      
      return false;
    }
  }, [documentService, toast, formContextLoadDocuments]);
  
  const refreshDocuments = useCallback(async () => {
    console.log('Refreshing documents...');
    
    try {
      const health = await documentService.healthCheck();
      setHealthStatus(health);
      
      if (!health.auth) {
        throw new Error('Authentifizierung fehlgeschlagen');
      }
      
      if (!health.storage) {
        console.warn('Storage access issues detected - documents may not have preview URLs');
        toast({
          title: "Storage-Warnung",
          description: "Storage-Zugriff eingeschränkt - Vorschau möglicherweise nicht verfügbar",
          variant: "destructive"
        });
      }
      
      if (!health.database) {
        console.warn('Database access issues detected');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setError(error instanceof Error ? error.message : 'Health check failed');
    }
    
    documentService.clearCache();
    return loadDocuments(true);
  }, [documentService, loadDocuments, toast]);
  
  const getDocumentsForItem = useCallback((checklistItemId: string) => {
    return documents.filter((doc: any) => 
      doc.checklistItemId === checklistItemId && 
      doc.status === 'active'
    );
  }, [documents]);
  
  const hasDocuments = useCallback((checklistItemId: string) => {
    return documents.some((doc: any) => 
      doc.checklistItemId === checklistItemId && 
      doc.status === 'active'
    );
  }, [documents]);
  
  const refreshDocumentUrl = useCallback(async (documentId: string) => {
    try {
      const newUrl = await documentService.refreshDocumentUrl(documentId);
      
      if (newUrl) {
        // Reload documents from FormContext to get updated state
        await formContextLoadDocuments();
        
        return newUrl;
      }
      
      throw new Error('URL konnte nicht aktualisiert werden');
    } catch (error: any) {
      console.error('Error refreshing document URL:', error);
      throw error;
    }
  }, [documentService, formContextLoadDocuments]);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []); // Only run on mount/unmount
  
  return {
    documents,
    isLoading,
    error,
    healthStatus,
    loadDocuments,
    refreshDocuments,
    deleteDocument,
    getDocumentsForItem,
    hasDocuments,
    refreshDocumentUrl
  };
}