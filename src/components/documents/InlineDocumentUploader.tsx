/**
 * Inline Document Uploader
 * 
 * Streamlined upload component that:
 * 1. Opens native file picker directly (no intermediate screen)
 * 2. Auto-uploads after file selection
 * 3. Shows status inline in the document item
 * 
 * Target: 2-3 step upload flow instead of 7+ steps
 */

import React, { useRef, useState } from 'react';
import { CloudUpload, Loader2, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { validateFile } from '@/utils/fileValidation';
import DocumentValidator from '@/services/DocumentValidator';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaxFiler } from '@/contexts/TaxFilerContext';

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

interface InlineDocumentUploaderProps {
  checklistItemId: string;
  checklistItemTitle: string;
  taxYear: string;
  onUploadComplete: () => void;
  className?: string;
}

const InlineDocumentUploader: React.FC<InlineDocumentUploaderProps> = ({
  checklistItemId,
  checklistItemTitle,
  taxYear,
  onUploadComplete,
  className,
}) => {
  const { toast } = useToast();
  const { activeTaxFilerId } = useTaxFiler();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Single file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentValidator = DocumentValidator.getInstance();
  const encryptedDocService = new EncryptedDocumentService();

  console.log('[InlineUploader] Initialized with:', { checklistItemId, taxYear, activeTaxFilerId });

  const handleUploadClick = () => {
    // Always open file picker directly - no intermediate popup
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    console.log('[InlineUploader] Processing file:', file.name);
    try {
      // Validate file (async)
      const validation = await validateFile(file);
      if (!validation.isValid) {
        setStatus('error');
        setStatusMessage(validation.error || 'Ungültige Datei');
        toast({
          title: "Fehler",
          description: validation.error,
          variant: "destructive"
        });
        setTimeout(() => {
          setStatus('idle');
          setStatusMessage('');
        }, 3000);
        return;
      }

      // Get user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Bitte melde dich an, um Dokumente hochzuladen.');
      }
      const userId = sessionData.session.user.id;

      // Step 1: Validate document (show "Wird geprüft...")
      setStatus('validating');
      setStatusMessage('Wird geprüft...');

      try {
        const validationResult = await documentValidator.validate(
          file,
          checklistItemId,
          (progress) => {
            // Update status message based on progress
            if (progress.step === 'ocr') {
              setStatusMessage('Dokument wird analysiert...');
            }
          }
        );

        // Show recognition result briefly
        if (validationResult.best.confidence >= 70) {
          setStatusMessage(`${checklistItemTitle} erkannt`);
        } else {
          setStatusMessage('Dokument erkannt');
        }
        
        // Brief pause to show result
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (validationError) {
        console.warn('[InlineUploader] Validation skipped:', validationError);
        // Continue with upload even if validation fails
      }

      // Step 2: Upload
      setStatus('uploading');
      setStatusMessage('Wird hochgeladen...');

      console.log('[InlineUploader] Starting encrypted upload...');
      await encryptedDocService.uploadEncryptedDocument(
        file,
        checklistItemId,
        userId,
        taxYear,
        checklistItemTitle,
        activeTaxFilerId
      );
      console.log('[InlineUploader] Upload complete!');

      // Success
      setStatus('success');
      setStatusMessage('Hochgeladen');
      
      toast({
        title: "Erfolgreich",
        description: `${file.name} wurde hochgeladen.`
      });

      // Reset after delay and refresh
      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
        onUploadComplete();
      }, 1500);

    } catch (error: any) {
      console.error('[InlineUploader] Upload error:', error);
      setStatus('error');
      setStatusMessage(error.message || 'Upload fehlgeschlagen');
      
      toast({
        title: "Fehler",
        description: error.message || 'Upload fehlgeschlagen',
        variant: "destructive"
      });

      setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 3000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[InlineUploader] File change event triggered');
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log('[InlineUploader] No files selected');
      return;
    }
    console.log('[InlineUploader] File selected:', files[0].name);

    // Process first file
    await processFile(files[0]);
    
    // Reset input to allow re-selecting same file
    e.target.value = '';
  };

  // Render upload button with inline status
  const renderButton = () => {
    switch (status) {
      case 'validating':
      case 'uploading':
        return (
          <motion.button
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            disabled
            className="flex items-center justify-center gap-2 bg-muted text-muted-foreground font-medium h-9 px-4 rounded-lg text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{statusMessage}</span>
          </motion.button>
        );
      
      case 'success':
        return (
          <motion.button
            key="success"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ opacity: 0 }}
            disabled
            className="flex items-center justify-center gap-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium h-9 px-4 rounded-lg text-sm"
          >
            <Check className="w-4 h-4" />
            <span>{statusMessage}</span>
          </motion.button>
        );
      
      case 'error':
        return (
          <motion.button
            key="error"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ opacity: 0 }}
            disabled
            className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive font-medium h-9 px-4 rounded-lg text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{statusMessage}</span>
          </motion.button>
        );
      
      default:
        return (
          <motion.button
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleUploadClick}
            className="flex items-center justify-center gap-2 bg-primary text-white font-medium h-9 px-4 rounded-lg transition-all hover:bg-primary/90 active:scale-[0.98] text-sm shadow-sm"
          >
            <CloudUpload className="w-4 h-4" strokeWidth={1.5} />
            Hochladen
          </motion.button>
        );
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Button */}
      <AnimatePresence mode="wait">
        {renderButton()}
      </AnimatePresence>
    </div>
  );
};

export default InlineDocumentUploader;
