/**
 * DocumentUploadSheet - Unified bottom sheet for file selection, OCR validation & upload.
 * 
 * NO framer-motion to avoid Android WebView touch blocking issues.
 * Uses buffer-caching for mobile file stability.
 * All uploads encrypted via EncryptedDocumentService.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Check, AlertCircle, Upload, Info } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChecklistItem } from '@/types';
import { validateFile } from '@/utils/fileValidation';
import { supabase } from '@/integrations/supabase/client';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import DocumentValidator from '@/services/DocumentValidator';
import AIDocumentValidation from '@/components/ui/ai-document-validation';
import { ValidationResult, ValidationProgress } from '@/types/documentProfile';
import { getDocumentProfile } from '@/config/documentProfiles';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DocumentUploadSheetProps {
  open: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  taxYear: string;
  taxFilerId?: string | null;
  /** Called after upload + document reload completes. Can be async — sheet waits for it. */
  onUploaded: (itemId: string) => Promise<void> | void;
}

type Phase = 'select' | 'validating' | 'result' | 'uploading' | 'success' | 'error';

const DocumentUploadSheet: React.FC<DocumentUploadSheetProps> = ({
  open,
  item,
  taxYear,
  taxFilerId,
  onClose,
  onUploaded,
}) => {
  const [phase, setPhase] = useState<Phase>('select');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationProgress, setValidationProgress] = useState<ValidationProgress>({ step: 'preparing', percent: 0, message: '' });
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const fileBufferRef = useRef<ArrayBuffer | null>(null);
  const fileInfoRef = useRef<{ name: string; type: string } | null>(null);

  const taxFilerIdRef = useRef(taxFilerId);
  useEffect(() => { taxFilerIdRef.current = taxFilerId; }, [taxFilerId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoOpenedRef = useRef(false);

  // Auto-open file picker when sheet opens
  useEffect(() => {
    if (open && phase === 'select' && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      // Small delay to ensure the hidden input is mounted
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      return () => clearTimeout(timer);
    }
    if (!open) {
      hasAutoOpenedRef.current = false;
    }
  }, [open, phase]);

  const reset = useCallback(() => {
    setPhase('select');
    setValidationResult(null);
    setValidationProgress({ step: 'preparing', percent: 0, message: '' });
    setUploadProgress('');
    setErrorMessage('');
    setSelectedFileName('');
    fileBufferRef.current = null;
    fileInfoRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    if (phase === 'uploading') return;
    reset();
    onClose();
  }, [phase, reset, onClose]);

  /**
   * Core upload — encrypted via EncryptedDocumentService.uploadFromBuffer
   */
  const performUpload = useCallback(async (buffer: ArrayBuffer, fileName: string, fileType: string) => {
    if (!item) return;
    setPhase('uploading');
    setUploadProgress('Verschlüsselung...');

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setErrorMessage('Sitzung abgelaufen. Bitte melde dich erneut an.');
        setPhase('error');
        return;
      }
      const userId = sessionData.session.user.id;

      setUploadProgress('Hochladen...');
      const activeTaxFilerId = taxFilerIdRef.current || null;
      const encryptedDocService = EncryptedDocumentService.getInstance();

      const UPLOAD_TIMEOUT_MS = 90000;
      await Promise.race([
        encryptedDocService.uploadFromBuffer(
          buffer, fileName, fileType,
          item.id, userId, taxYear, item.title,
          activeTaxFilerId
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Upload-Timeout: Bitte versuche es erneut.')), UPLOAD_TIMEOUT_MS)
        )
      ]);

      setPhase('success');

      // Wait for parent to reload documents, THEN close
      try {
        await onUploaded(item.id);
      } catch (err) {
        console.error('[DocumentUploadSheet] onUploaded callback error:', err);
      }

      setTimeout(() => {
        reset();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[DocumentUploadSheet] Upload error:', err);
      setErrorMessage(err.message || 'Upload fehlgeschlagen');
      setPhase('error');
    }
  }, [item, taxYear, onUploaded, onClose, reset]);

  /**
   * File selected → read buffer → OCR validate → upload or show result
   */
  const handleFileSelected = useCallback(async (file: File) => {
    if (!item) return;
    setSelectedFileName(file.name);

    try {
      const validation = await validateFile(file);
      if (!validation.isValid) {
        toast({ title: 'Ungültige Datei', description: validation.error, variant: 'destructive' });
        setPhase('select');
        return;
      }

      // Read file into buffer immediately (mobile-safe)
      let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
      } catch (bufferErr) {
        console.error('[DocumentUploadSheet] Failed to read file buffer:', bufferErr);
        toast({ title: 'Datei konnte nicht gelesen werden', description: 'Bitte versuche es erneut.', variant: 'destructive' });
        setPhase('select');
        return;
      }
      fileBufferRef.current = buffer;
      fileInfoRef.current = { name: file.name, type: file.type };

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
      } catch (ocrError: any) {
        const isTimeout = ocrError.message === 'OCR_TIMEOUT';
        console.error('[DocumentUploadSheet] OCR error:', ocrError);
        result = {
          best: { docTypeId: item.id, confidence: 0, reasons: [isTimeout ? 'OCR timeout' : 'OCR error'] },
          candidates: [{ docTypeId: item.id, confidence: 0, reasons: [isTimeout ? 'OCR timeout' : 'OCR error'] }],
          signals: { meta: undefined, layout: undefined, keywords: undefined },
          needsUserConfirmation: true,
          confidenceBucket: 'low' as const,
          statusMessage: isTimeout
            ? 'OCR-Erkennung hat zu lange gedauert. Bitte Dokument manuell bestätigen.'
            : 'Dokument konnte nicht automatisch erkannt werden. Bitte manuell bestätigen.'
        };
      }

      setValidationResult(result);

      // High confidence → auto-upload
      if (result.best.confidence >= 50) {
        performUpload(buffer, file.name, file.type);
      } else {
        setPhase('result');
      }
    } catch (err: any) {
      console.error('[DocumentUploadSheet] handleFileSelected error:', err);
      setErrorMessage(err.message || 'Fehler bei der Dokumentenverarbeitung');
      setPhase('error');
    }
  }, [item, performUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  }, [handleFileSelected]);

  const handleConfirm = useCallback(() => {
    if (fileBufferRef.current && fileInfoRef.current) {
      performUpload(fileBufferRef.current, fileInfoRef.current.name, fileInfoRef.current.type);
    } else {
      toast({ title: 'Fehler', description: 'Datei konnte nicht gelesen werden. Bitte erneut auswählen.', variant: 'destructive' });
      setPhase('select');
    }
  }, [performUpload]);

  const handleReupload = useCallback(() => {
    setSelectedFileName('');
    fileBufferRef.current = null;
    fileInfoRef.current = null;
    setValidationResult(null);
    setPhase('select');
  }, []);

  const dismissible = phase === 'select' || phase === 'error' || phase === 'success';

  // Result screen helpers
  const getResultNotification = () => {
    if (!validationResult) return null;
    const profile = getDocumentProfile(validationResult.best.docTypeId);
    const confidence = validationResult.best.confidence;
    const documentLabel = profile?.label || 'Dokument';

    if (confidence >= 70) {
      return {
        title: `${documentLabel} erfolgreich erkannt`,
        body: 'Das Dokument wurde erkannt und kann eingereicht werden.',
        variant: 'success' as const
      };
    }
    if (confidence >= 50) {
      return {
        title: `${documentLabel} nicht eindeutig erkannt`,
        body: 'Wir konnten das Dokument nicht sicher zuordnen. Bitte prüfe, ob es sich um das richtige Dokument handelt.',
        variant: 'warning' as const
      };
    }
    return {
      title: `${documentLabel} konnte nicht erkannt werden`,
      body: 'Wir konnten den Text in diesem Dokument nicht sicher auslesen. Bitte prüfe, ob es sich um das richtige Dokument handelt.',
      variant: 'info' as const
    };
  };

  const variantStyles = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); }} dismissible={dismissible}>
      <DrawerContent variant="bottom-sheet">
        <div className="px-5 pt-3 pb-5">

          {/* Phase: Select file source */}
          {phase === 'select' && (
            <div>
              <div className="text-center mb-5">
                <h3 className="text-lg font-semibold text-slate-800">
                  {item?.title || 'Dokument hochladen'}
                </h3>
                {item?.description && (
                  <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                )}
              </div>

              <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={handleInputChange} />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-14 rounded-2xl bg-gradient-to-b from-[hsl(217,90%,62%)] to-[hsl(217,90%,52%)] text-white font-semibold text-[15px] tracking-wide shadow-[0_4px_14px_0_rgba(29,100,255,0.39)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                style={{ touchAction: 'manipulation' }}
              >
                <Upload className="w-5 h-5" />
                Dokument auswählen
              </button>
            </div>
          )}

          {/* Phase: OCR Validating */}
          {phase === 'validating' && (
            <div>
              <AIDocumentValidation
                progress={validationProgress}
                documentType={item?.title || 'Dokument'}
                documentTypeId={item?.id}
                foundKeywords={validationProgress.foundKeywords}
              />
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleClose}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                  style={{ touchAction: 'manipulation' }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Phase: OCR Result (low confidence) — inline, no framer-motion */}
          {phase === 'result' && validationResult && (() => {
            const notification = getResultNotification();
            if (!notification) return null;
            const styles = variantStyles[notification.variant];
            const isLowConfidence = validationResult.best.confidence < 70;

            return (
              <div className="space-y-5">
                <div className="text-center">
                  <span className="text-lg font-semibold text-foreground">Dokumentenprüfung</span>
                </div>

                {/* Notification Card */}
                <div className={cn('p-4 rounded-2xl border', styles.bg, styles.border)}>
                  <div className="flex gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', styles.iconBg)}>
                      <Info className={cn('w-5 h-5', styles.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-[15px] leading-tight mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {notification.body}
                      </p>
                    </div>
                  </div>
                </div>

                {/* File name */}
                <p className="text-xs text-muted-foreground/70 truncate text-center">
                  {selectedFileName}
                </p>

                {/* Action Buttons — touch-action: manipulation for Android */}
                <div className="space-y-3 pt-1">
                  {isLowConfidence ? (
                    <>
                      <button
                        onClick={handleReupload}
                        className="w-full h-14 rounded-2xl bg-gradient-to-b from-[hsl(217,90%,62%)] to-[hsl(217,90%,52%)] !text-white font-semibold text-[15px] tracking-wide shadow-[0_4px_14px_0_rgba(29,100,255,0.39)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <Upload className="w-4 h-4" />
                        Anderes Dokument hochladen
                      </button>
                      <Button
                        variant="outline"
                        onClick={handleConfirm}
                        className="w-full rounded-xl border-border"
                        size="default"
                        style={{ touchAction: 'manipulation' }}
                      >
                        Dokument trotzdem einreichen
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleConfirm}
                        className="w-full h-14 rounded-2xl bg-gradient-to-b from-[hsl(217,90%,62%)] to-[hsl(217,90%,52%)] !text-white font-semibold text-[15px] tracking-wide shadow-[0_4px_14px_0_rgba(29,100,255,0.39)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                        style={{ touchAction: 'manipulation' }}
                      >
                        Dokument einreichen
                      </button>
                      <Button
                        variant="outline"
                        onClick={handleReupload}
                        className="w-full rounded-xl border-border"
                        size="default"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Andere Datei hochladen
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Phase: Uploading */}
          {phase === 'uploading' && (
            <div className="flex flex-col items-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <p className="text-lg font-semibold text-slate-800 mb-1">Wird hochgeladen</p>
              <p className="text-sm text-slate-400">{uploadProgress}</p>
            </div>
          )}

          {/* Phase: Success */}
          {phase === 'success' && (
            <div className="flex flex-col items-center py-10">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                <Check className="w-8 h-8 text-emerald-500" strokeWidth={2.5} />
              </div>
              <p className="text-lg font-semibold text-slate-800">Erfolgreich hochgeladen</p>
            </div>
          )}

          {/* Phase: Error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-lg font-semibold text-slate-800 mb-1">Upload fehlgeschlagen</p>
              <p className="text-sm text-slate-400 text-center mb-6">{errorMessage}</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleReupload}
                  className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                  style={{ touchAction: 'manipulation' }}
                >
                  Erneut versuchen
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 active:scale-[0.98]"
                  style={{ touchAction: 'manipulation' }}
                >
                  Schließen
                </button>
              </div>
            </div>
          )}

        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DocumentUploadSheet;
