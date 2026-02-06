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
import { CloudUpload, Loader2, Check, AlertCircle, ScanLine, Image, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { validateFile } from '@/utils/fileValidation';
import DocumentValidator from '@/services/DocumentValidator';
import { isMobileAppContext } from '@/utils/platform';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type UploadStatus = 'idle' | 'selecting' | 'validating' | 'uploading' | 'success' | 'error';

interface InlineDocumentUploaderProps {
  checklistItemId: string;
  checklistItemTitle: string;
  taxYear: string;
  taxFilerId?: string | null;
  onUploadComplete: () => void;
  className?: string;
}

const InlineDocumentUploader: React.FC<InlineDocumentUploaderProps> = ({
  checklistItemId,
  checklistItemTitle,
  taxYear,
  taxFilerId,
  onUploadComplete,
  className,
}) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showActionSheet, setShowActionSheet] = useState(false);
  
  // Hidden file inputs for different capture modes
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = isMobileAppContext();
  const documentValidator = DocumentValidator.getInstance();
  const encryptedDocService = new EncryptedDocumentService();

  const handleUploadClick = () => {
    if (isMobile) {
      // On mobile, show action sheet for scan/photo/file options
      setShowActionSheet(true);
    } else {
      // On desktop, open file picker directly
      fileInputRef.current?.click();
    }
  };

  const handlePhotoSelect = () => {
    setShowActionSheet(false);
    photoInputRef.current?.click();
  };

  const handleScanSelect = () => {
    setShowActionSheet(false);
    scanInputRef.current?.click();
  };

  const handleFileSelect = () => {
    setShowActionSheet(false);
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
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

      await encryptedDocService.uploadEncryptedDocument(
        file,
        checklistItemId,
        userId,
        taxYear,
        checklistItemTitle,
        taxFilerId
      );

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
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
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
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            disabled
            className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive font-medium h-9 px-4 rounded-lg text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{statusMessage}</span>
          </motion.button>
        );
      
      default:
        return (
          <button
            onClick={handleUploadClick}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium h-9 px-4 rounded-lg transition-all hover:bg-primary/90 active:scale-[0.98] text-sm shadow-sm"
          >
            <CloudUpload className="w-4 h-4" strokeWidth={1.5} />
            Hochladen
          </button>
        );
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={scanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
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

      {/* Mobile Action Sheet */}
      <AnimatePresence>
        {showActionSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/30"
              onClick={() => setShowActionSheet(false)}
            />
            
            {/* Action Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[101] p-4 pb-8"
            >
              <div className="bg-background rounded-2xl shadow-xl overflow-hidden border border-border">
                <div className="py-2">
                  {/* Scan - prioritized for mobile */}
                  <button
                    onClick={handleScanSelect}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ScanLine className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Dokument scannen</span>
                      <p className="text-xs text-muted-foreground">Kamera öffnen</p>
                    </div>
                  </button>
                  
                  {/* Photo */}
                  <button
                    onClick={handlePhotoSelect}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Image className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Foto auswählen</span>
                      <p className="text-xs text-muted-foreground">Aus Galerie wählen</p>
                    </div>
                  </button>
                  
                  {/* Files */}
                  <button
                    onClick={handleFileSelect}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Datei hochladen</span>
                      <p className="text-xs text-muted-foreground">PDF, Bilder...</p>
                    </div>
                  </button>
                </div>
                
                {/* Cancel */}
                <div className="border-t border-border p-2">
                  <button
                    onClick={() => setShowActionSheet(false)}
                    className="w-full py-3 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InlineDocumentUploader;
