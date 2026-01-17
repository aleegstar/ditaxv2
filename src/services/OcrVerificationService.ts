import { supabase } from '@/integrations/supabase/client';
import { getDocumentKeywords, DocumentKeywordConfig } from '@/utils/documentKeywords';

export interface OcrVerificationResult {
  isMatch: boolean;
  confidence: number;
  foundKeywords: string[];
  missingKeywords: string[];
  reason: string;
  extractedTextPreview: string;
  documentType: string;
  displayName: string;
}

class OcrVerificationService {
  private static instance: OcrVerificationService;

  public static getInstance(): OcrVerificationService {
    if (!OcrVerificationService.instance) {
      OcrVerificationService.instance = new OcrVerificationService();
    }
    return OcrVerificationService.instance;
  }

  /**
   * Convert a file to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert PDF first page to image using canvas
   */
  private async pdfToImage(file: File): Promise<string> {
    // Check if PDF.js is loaded
    if (!window.pdfjsLib) {
      console.warn('[OCR] PDF.js not loaded, skipping PDF OCR');
      throw new Error('PDF library not loaded');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    // Use a higher scale for better OCR accuracy
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    return canvas.toDataURL('image/png');
  }

  /**
   * Verify a document against expected keywords using OCR
   */
  async verifyDocument(
    file: File,
    checklistItemId: string
  ): Promise<OcrVerificationResult> {
    const keywordConfig = getDocumentKeywords(checklistItemId);
    
    if (!keywordConfig) {
      console.log(`[OCR] No keyword config for ${checklistItemId}, skipping verification`);
      return {
        isMatch: true,
        confidence: 100,
        foundKeywords: [],
        missingKeywords: [],
        reason: 'Keine automatische Prüfung für diesen Dokumenttyp verfügbar',
        extractedTextPreview: '',
        documentType: checklistItemId,
        displayName: 'Unbekannter Dokumenttyp'
      };
    }

    try {
      let imageBase64: string;

      // Convert file to image base64
      if (file.type === 'application/pdf') {
        imageBase64 = await this.pdfToImage(file);
      } else if (file.type.startsWith('image/')) {
        imageBase64 = await this.fileToBase64(file);
      } else {
        console.log(`[OCR] Unsupported file type: ${file.type}`);
        return {
          isMatch: true,
          confidence: 100,
          foundKeywords: [],
          missingKeywords: [],
          reason: 'Dateityp wird nicht unterstützt',
          extractedTextPreview: '',
          documentType: checklistItemId,
          displayName: keywordConfig.displayName
        };
      }

      console.log(`[OCR] Verifying document: ${file.name} for ${checklistItemId}`);

      // Call the OCR edge function
      const { data, error } = await supabase.functions.invoke('ocr-verify', {
        body: {
          imageBase64,
          documentType: checklistItemId,
          expectedKeywords: keywordConfig.keywords,
          displayName: keywordConfig.displayName
        }
      });

      if (error) {
        console.error('[OCR] Edge function error:', error);
        // On error, allow the document through
        return {
          isMatch: true,
          confidence: 0,
          foundKeywords: [],
          missingKeywords: keywordConfig.keywords,
          reason: 'Automatische Prüfung fehlgeschlagen',
          extractedTextPreview: '',
          documentType: checklistItemId,
          displayName: keywordConfig.displayName
        };
      }

      // Determine if this should trigger a warning
      const shouldWarn = !data.isMatch || data.confidence < 50;
      
      return {
        isMatch: !shouldWarn,
        confidence: data.confidence,
        foundKeywords: data.foundKeywords || [],
        missingKeywords: data.missingKeywords || [],
        reason: data.reason || '',
        extractedTextPreview: data.extractedTextPreview || '',
        documentType: checklistItemId,
        displayName: keywordConfig.displayName
      };

    } catch (error) {
      console.error('[OCR] Verification error:', error);
      return {
        isMatch: true,
        confidence: 0,
        foundKeywords: [],
        missingKeywords: keywordConfig.keywords,
        reason: error instanceof Error ? error.message : 'Prüfung fehlgeschlagen',
        extractedTextPreview: '',
        documentType: checklistItemId,
        displayName: keywordConfig.displayName
      };
    }
  }

  /**
   * Verify multiple files
   */
  async verifyDocuments(
    files: File[],
    checklistItemId: string
  ): Promise<Map<File, OcrVerificationResult>> {
    const results = new Map<File, OcrVerificationResult>();
    
    for (const file of files) {
      const result = await this.verifyDocument(file, checklistItemId);
      results.set(file, result);
    }
    
    return results;
  }
}

// Declare global type for PDF.js
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default OcrVerificationService;
