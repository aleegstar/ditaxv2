/**
 * DocumentUploadSheet - Unified bottom sheet for file selection, OCR validation & upload.
 * Uses the proven upload pattern from EnhancedDocumentUploader (supabase.auth.getSession + uploadEncryptedDocument).
 */

import React, { useState, useRef, useCallback } from 'react';
import { Image, ScanLine, FileText, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ChecklistItem } from '@/types';
import { validateFile } from '@/utils/fileValidation';
import { supabase } from '@/integrations/supabase/client';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import DocumentValidator from '@/services/DocumentValidator';
import AIDocumentValidation from '@/components/ui/ai-document-validation';
import { DocumentCheckScreen } from '@/components/documents/DocumentCheckScreen';
import { ValidationResult, ValidationProgress } from '@/types/documentProfile';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DocumentUploadSheetProps {
  open: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  taxYear: string;
  onUploaded: (itemId: string) => void;
}

type Phase = 'select' | 'validating' | 'result' | 'uploading' | 'success' | 'error';

const DocumentUploadSheet: React.FC<DocumentUploadSheetProps> = ({
  open,
  item,
  taxYear,
  onClose,
  onUploaded,
}) => {
  const [phase, setPhase] = useState<Phase>('select');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationProgress, setValidationProgress] = useState<ValidationProgress>({ step: 'preparing', percent: 0, message: '' });
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPhase('select');
    setValidationResult(null);
    setValidationProgress({ step: 'preparing', percent: 0, message: '' });
    setUploadProgress('');
    setErrorMessage('');
    setSelectedFile(null);
  }, []);

  const handleClose = useCallback(() => {
    // Don't allow close during upload
    if (phase === 'uploading') return;
    reset();
    onClose();
  }, [phase, reset, onClose]);

  /**
   * Core upload - uses the PROVEN pattern from EnhancedDocumentUploader:
   * 1. supabase.auth.getSession() for fresh session
   * 2. uploadEncryptedDocument with fresh File object
   */
  const performUpload = useCallback(async (file: File) => {
    if (!item) return;
    setPhase('uploading');
    setUploadProgress('Verschlüsselung...');

    try {
      // Get fresh session directly - proven to work on mobile
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Bitte melde dich erneut an.');
      }
      const userId = sessionData.session.user.id;

      setUploadProgress('Hochladen...');
      const activeTaxFilerId = localStorage.getItem('activeTaxFilerId')
        || sessionStorage.getItem('ditax_selected_tax_filer');
      const encryptedDocService = EncryptedDocumentService.getInstance();

      await encryptedDocService.uploadEncryptedDocument(
        file,
        item.id,
        userId,
        taxYear,
        item.title,
        activeTaxFilerId
      );

      setPhase('success');
      onUploaded(item.id);

      // Auto-close after success
      setTimeout(() => {
        reset();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('[DocumentUploadSheet] Upload error:', err);
      setErrorMessage(err.message || 'Upload fehlgeschlagen');
      setPhase('error');
    }
  }, [item, taxYear, onUploaded, onClose, reset]);

  /**
   * File selected → validate via OCR, then upload
   */
  const handleFileSelected = useCallback(async (file: File) => {
    if (!item) return;
    setSelectedFile(file);

    // Validate file
    const validation = await validateFile(file);
    if (!validation.isValid) {
      toast({ title: 'Ungültige Datei', description: validation.error, variant: 'destructive' });
      setPhase('select');
      return;
    }

    // Start OCR validation
    setPhase('validating');
    setValidationProgress({ step: 'preparing', percent: 0, message: '' });

    const OCR_TIMEOUT_MS = 15000;
    const validator = DocumentValidator.getInstance();

    let result: ValidationResult;
    try {
      result = await Promise.race([
        validator.validate(file, item.id, (progress) => {
          setValidationProgress(progress);
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OCR_TIMEOUT')), OCR_TIMEOUT_MS)
        )
      ]);
    } catch (timeoutError: any) {
      if (timeoutError.message === 'OCR_TIMEOUT') {
        result = {
          best: { docTypeId: item.id, confidence: 0, reasons: ['OCR timeout'] },
          candidates: [{ docTypeId: item.id, confidence: 0, reasons: ['OCR timeout'] }],
          signals: { meta: undefined, layout: undefined, keywords: undefined },
          needsUserConfirmation: true,
          confidenceBucket: 'low' as const,
          statusMessage: 'OCR-Erkennung hat zu lange gedauert. Bitte Dokument manuell bestätigen.'
        };
      } else {
        throw timeoutError;
      }
    }

    setValidationResult(result);

    // High confidence → auto-upload
    if (result.best.confidence >= 50) {
      performUpload(file);
    } else {
      // Low confidence → show result for user confirmation
      setPhase('result');
    }
  }, [item, performUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFileSelected]);

  const handleConfirm = useCallback(() => {
    if (selectedFile) {
      performUpload(selectedFile);
    }
  }, [selectedFile, performUpload]);

  const handleReupload = useCallback(() => {
    setSelectedFile(null);
    setValidationResult(null);
    setPhase('select');
  }, []);

  const dismissible = phase === 'select' || phase === 'error' || phase === 'success';

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); }} dismissible={dismissible}>
      <DrawerContent variant="bottom-sheet">
        <div className="px-5 pt-3 pb-5">
          <AnimatePresence mode="wait">
            {/* Phase: Select file source */}
            {phase === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-5">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {item?.title || 'Dokument hochladen'}
                  </h3>
                  {item?.description && (
                    <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                  )}
                </div>

                {/* Hidden file inputs */}
                <input ref={photoInputRef} type="file" className="hidden" accept="image/*" onChange={handleInputChange} />
                <input ref={scanInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleInputChange} />
                <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={handleInputChange} />

                <div className="space-y-2">
                  {[
                    { icon: Image, label: 'Fotos hochladen', ref: photoInputRef },
                    { icon: ScanLine, label: 'Dokument scannen', ref: scanInputRef },
                    { icon: FileText, label: 'Dateien (PDF, Docs...)', ref: fileInputRef },
                  ].map(({ icon: Icon, label, ref }) => (
                    <button
                      key={label}
                      onClick={() => ref.current?.click()}
                      className="w-full flex items-center gap-4 rounded-2xl bg-slate-50 px-5 py-4 text-left transition-all hover:bg-slate-100 active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Icon className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                      </div>
                      <span className="text-[15px] font-medium text-slate-700">{label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Phase: OCR Validating */}
            {phase === 'validating' && (
              <motion.div
                key="validating"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AIDocumentValidation
                  progress={validationProgress}
                  documentType={item?.title || 'Dokument'}
                  documentTypeId={item?.id}
                  foundKeywords={validationProgress.foundKeywords}
                />
              </motion.div>
            )}

            {/* Phase: OCR Result (low confidence) */}
            {phase === 'result' && validationResult && selectedFile && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <DocumentCheckScreen
                  result={validationResult}
                  fileName={selectedFile.name}
                  onConfirm={handleConfirm}
                  onReupload={handleReupload}
                  onClose={handleClose}
                  isConfirming={false}
                />
              </motion.div>
            )}

            {/* Phase: Uploading */}
            {phase === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center py-10"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <p className="text-lg font-semibold text-slate-800 mb-1">Wird hochgeladen</p>
                <p className="text-sm text-slate-400">{uploadProgress}</p>
              </motion.div>
            )}

            {/* Phase: Success */}
            {phase === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="flex flex-col items-center py-10"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                  <Check className="w-8 h-8 text-emerald-500" strokeWidth={2.5} />
                </div>
                <p className="text-lg font-semibold text-slate-800">Erfolgreich hochgeladen</p>
              </motion.div>
            )}

            {/* Phase: Error */}
            {phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center py-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-lg font-semibold text-slate-800 mb-1">Upload fehlgeschlagen</p>
                <p className="text-sm text-slate-400 text-center mb-6">{errorMessage}</p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={handleReupload}
                    className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                  >
                    Erneut versuchen
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 active:scale-[0.98]"
                  >
                    Schließen
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer cancel for validating phase */}
        {phase === 'validating' && (
          <div className="border-t border-border/50 p-4 flex justify-center">
            <button
              onClick={handleClose}
              className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Abbrechen
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default DocumentUploadSheet;
