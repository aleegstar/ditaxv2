import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import DocumentValidator from '@/services/DocumentValidator';
import { validateFile } from '@/utils/fileValidation';
import { ValidationResult, ValidationProgress } from '@/types/documentProfile';

export interface InlineUploadState {
  itemId: string;
  status: 'idle' | 'processing' | 'validating' | 'uploading' | 'success' | 'error' | 'needs_confirmation';
  progress: number;
  message: string;
  validationResult?: ValidationResult;
  fileName?: string;
  file?: File;
}

interface UseInlineUploadOptions {
  taxYear: string;
  taxFilerId?: string | null;
  onUploadComplete?: (itemId: string) => void;
  onValidationNeeded?: (state: InlineUploadState) => void;
}

export function useInlineUpload(options: UseInlineUploadOptions) {
  const { taxYear, taxFilerId, onUploadComplete, onValidationNeeded } = options;
  const { toast } = useToast();
  
  const [uploadStates, setUploadStates] = useState<Record<string, InlineUploadState>>({});
  
  const encryptedDocService = EncryptedDocumentService.getInstance();
  const documentValidator = DocumentValidator.getInstance();
  
  // Update state for a specific item
  const updateItemState = useCallback((itemId: string, updates: Partial<InlineUploadState>) => {
    setUploadStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        itemId,
        ...updates
      } as InlineUploadState
    }));
  }, []);
  
  // Clear state for an item
  const clearItemState = useCallback((itemId: string) => {
    setUploadStates(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  }, []);
  
  // Upload a single file directly
  const uploadFile = useCallback(async (
    file: File, 
    checklistItemId: string, 
    checklistItemTitle?: string
  ): Promise<boolean> => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Bitte melde dich an, um Dokumente hochzuladen.');
      }
      const userId = sessionData.session.user.id;
      
      updateItemState(checklistItemId, {
        status: 'uploading',
        progress: 50,
        message: 'Wird hochgeladen...'
      });
      
      await encryptedDocService.uploadEncryptedDocument(
        file,
        checklistItemId,
        userId,
        taxYear,
        checklistItemTitle,
        taxFilerId
      );
      
      updateItemState(checklistItemId, {
        status: 'success',
        progress: 100,
        message: 'Hochgeladen'
      });
      
      // Clear state after short delay
      setTimeout(() => {
        clearItemState(checklistItemId);
        onUploadComplete?.(checklistItemId);
      }, 1500);
      
      return true;
    } catch (err: any) {
      console.error('Upload error:', err);
      updateItemState(checklistItemId, {
        status: 'error',
        progress: 0,
        message: err.message || 'Fehler beim Hochladen'
      });
      
      toast({
        title: "Upload fehlgeschlagen",
        description: err.message || 'Fehler beim Hochladen',
        variant: "destructive"
      });
      
      return false;
    }
  }, [taxYear, taxFilerId, encryptedDocService, updateItemState, clearItemState, onUploadComplete, toast]);
  
  // Main handler: process file selection
  const handleFileSelect = useCallback(async (
    files: FileList | File[],
    checklistItemId: string,
    checklistItemTitle?: string
  ) => {
    if (!files || files.length === 0) return;
    
    const file = files[0]; // Handle first file for now
    
    // Initial state
    updateItemState(checklistItemId, {
      status: 'processing',
      progress: 10,
      message: 'Wird verarbeitet...',
      fileName: file.name,
      file
    });
    
    // Validate file
    const validationResult = await validateFile(file, 10 * 1024 * 1024);
    if (!validationResult.isValid) {
      updateItemState(checklistItemId, {
        status: 'error',
        progress: 0,
        message: validationResult.error || 'Ungültige Datei'
      });
      
      toast({
        title: "Ungültige Datei",
        description: validationResult.error,
        variant: "destructive"
      });
      return;
    }
    
    // Start document validation (OCR)
    updateItemState(checklistItemId, {
      status: 'validating',
      progress: 20,
      message: 'Wird geprüft...'
    });
    
    try {
      const result = await documentValidator.validate(
        file,
        checklistItemId,
        (progress) => {
          updateItemState(checklistItemId, {
            status: 'validating',
            progress: 20 + (progress.percent * 0.6), // Map 0-100 to 20-80
            message: progress.message || 'Wird geprüft...'
          });
        }
      );
      
      console.log('[InlineUpload] Validation result:', {
        fileName: file.name,
        bestMatch: result.best.docTypeId,
        confidence: result.best.confidence,
        needsConfirmation: result.needsUserConfirmation
      });
      
      // If needs confirmation (confidence < 70%), show modal
      if (result.needsUserConfirmation) {
        const state: InlineUploadState = {
          itemId: checklistItemId,
          status: 'needs_confirmation',
          progress: 80,
          message: 'Bestätigung erforderlich',
          validationResult: result,
          fileName: file.name,
          file
        };
        updateItemState(checklistItemId, state);
        onValidationNeeded?.(state);
        return;
      }
      
      // High confidence - proceed with upload automatically
      await uploadFile(file, checklistItemId, checklistItemTitle);
      
    } catch (err) {
      console.error('Document validation error:', err);
      
      // On validation error, still allow upload but show warning
      toast({
        title: "Hinweis",
        description: "Dokumentenprüfung übersprungen. Bitte stelle sicher, dass du das richtige Dokument hochlädst.",
        variant: "default"
      });
      
      // Proceed with upload anyway
      await uploadFile(file, checklistItemId, checklistItemTitle);
    }
  }, [documentValidator, updateItemState, uploadFile, onValidationNeeded, toast]);
  
  // Confirm upload after user approves low-confidence document
  const confirmUpload = useCallback(async (itemId: string) => {
    const state = uploadStates[itemId];
    if (!state?.file) return false;
    
    return await uploadFile(state.file, itemId);
  }, [uploadStates, uploadFile]);
  
  // Cancel pending upload
  const cancelUpload = useCallback((itemId: string) => {
    clearItemState(itemId);
  }, [clearItemState]);
  
  // Get state for a specific item
  const getItemState = useCallback((itemId: string): InlineUploadState | undefined => {
    return uploadStates[itemId];
  }, [uploadStates]);
  
  // Check if any upload is in progress
  const isAnyUploading = Object.values(uploadStates).some(
    s => s.status === 'processing' || s.status === 'validating' || s.status === 'uploading'
  );
  
  return {
    uploadStates,
    handleFileSelect,
    confirmUpload,
    cancelUpload,
    getItemState,
    clearItemState,
    isAnyUploading
  };
}
