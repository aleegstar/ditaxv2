import { getDocumentKeywords, matchKeywords, DocumentKeywordConfig } from '@/utils/documentKeywords';
import { createWorker, Worker } from 'tesseract.js';

export interface OcrVerificationResult {
  isMatch: boolean;
  confidence: number;
  foundKeywords: string[];
  missingKeywords: string[];
  reason: string;
  extractedTextPreview: string;
  documentType: string;
  displayName: string;
  isImageFile?: boolean;
  /** Indicates if user should manually confirm - shown for images, low confidence, or mismatches */
  requiresManualConfirmation: boolean;
}

/**
 * DSGVO-konformer lokaler Dokumenten-Verifizierungsservice
 * 
 * WICHTIG: Alle Verarbeitung erfolgt lokal im Browser des Benutzers.
 * Es werden KEINE Daten an externe Server übermittelt.
 * 
 * - PDFs: Text wird mit pdf.js lokal extrahiert
 * - Bilder: Text wird mit Tesseract.js lokal im Browser erkannt (OCR)
 */
class OcrVerificationService {
  private static instance: OcrVerificationService;
  private tesseractWorker: Worker | null = null;
  private workerInitPromise: Promise<Worker> | null = null;

  public static getInstance(): OcrVerificationService {
    if (!OcrVerificationService.instance) {
      OcrVerificationService.instance = new OcrVerificationService();
    }
    return OcrVerificationService.instance;
  }

  /**
   * Get or create the Tesseract worker (singleton pattern)
   * Worker is created once and reused for all OCR operations
   */
  private async getWorker(): Promise<Worker> {
    // Return existing worker if available
    if (this.tesseractWorker) {
      console.log('[OCR] Reusing existing Tesseract worker');
      return this.tesseractWorker;
    }

    // Return pending initialization if in progress
    if (this.workerInitPromise) {
      console.log('[OCR] Waiting for Tesseract worker initialization...');
      return this.workerInitPromise;
    }

    // Create new worker
    this.workerInitPromise = (async () => {
      console.log('[OCR] Creating new Tesseract worker...');
      const startTime = Date.now();
      
      try {
        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            console.log(`[Tesseract Worker] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`);
          },
          errorHandler: (err) => {
            console.error('[Tesseract Worker] Error:', err);
          }
        });
        
        const duration = Date.now() - startTime;
        console.log(`[OCR] Tesseract worker created successfully in ${duration}ms`);
        this.tesseractWorker = worker;
        return worker;
      } catch (error) {
        console.error('[OCR] Failed to create Tesseract worker:', error);
        this.workerInitPromise = null;
        throw error;
      }
    })();

    return this.workerInitPromise;
  }

  /**
   * Terminate the Tesseract worker (cleanup)
   */
  async terminateWorker(): Promise<void> {
    if (this.tesseractWorker) {
      console.log('[OCR] Terminating Tesseract worker...');
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
      this.workerInitPromise = null;
      console.log('[OCR] Tesseract worker terminated');
    }
  }

  /**
   * Extract text from PDF using pdf.js (fully local, no external calls)
   * This runs entirely in the browser - no data leaves the device
   */
  private async extractTextFromPdf(file: File): Promise<string> {
    // Check if PDF.js is loaded
    if (!window.pdfjsLib) {
      console.warn('[OCR] PDF.js not loaded, cannot extract text');
      throw new Error('PDF-Bibliothek nicht geladen');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages for performance
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text items and join them
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        
        fullText += pageText + '\n';
      }
      
      console.log(`[OCR] Extracted ${fullText.length} characters from ${maxPages} pages (local processing)`);
      return fullText;
    } catch (error) {
      console.error('[OCR] PDF text extraction failed:', error);
      throw new Error('PDF-Textextraktion fehlgeschlagen');
    }
  }

  /**
   * Normalize text for better keyword matching
   * Handles German umlauts and common variations
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      // Normalize German umlauts
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Convert a File to a Data URL for more reliable Tesseract processing
   * This is especially important for mobile browsers
   */
  private fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Preprocess image using Canvas for better OCR results
   * Converts to grayscale and increases contrast (threshold)
   * This significantly improves OCR accuracy, especially on mobile devices
   */
  private async preprocessImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = () => {
        console.log(`[OCR] Preprocessing image: ${img.width}x${img.height}`);
        
        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert to grayscale and apply threshold for high contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale conversion using luminance formula
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Apply threshold (128) - creates black/white image ideal for OCR
          const threshold = gray > 128 ? 255 : 0;
          
          data[i] = threshold;     // R
          data[i + 1] = threshold; // G
          data[i + 2] = threshold; // B
          // Alpha channel unchanged (data[i + 3])
        }
        
        // Put processed data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to blob (PNG for lossless quality)
        canvas.toBlob((blob) => {
          if (blob) {
            console.log(`[OCR] Preprocessed image: ${(blob.size / 1024).toFixed(1)} KB (B/W threshold applied)`);
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        console.error('[OCR] Failed to load image for preprocessing');
        reject(new Error('Failed to load image for preprocessing'));
      };
      
      // Load image from file
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file for preprocessing'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Calculate confidence based on found keywords
   */
  private calculateConfidence(
    foundKeywords: string[],
    totalKeywords: string[],
    config: DocumentKeywordConfig
  ): number {
    if (totalKeywords.length === 0) return 100;
    
    const foundCount = foundKeywords.length;
    const minRequired = config.minMatchCount;
    
    // If we found enough keywords, high confidence
    if (foundCount >= minRequired) {
      // Scale from 70% to 100% based on how many extra keywords we found
      const extraMatches = foundCount - minRequired;
      const maxExtra = totalKeywords.length - minRequired;
      const bonusConfidence = maxExtra > 0 ? (extraMatches / maxExtra) * 30 : 30;
      return Math.round(70 + bonusConfidence);
    }
    
    // Below minimum, scale from 0% to 69%
    return Math.round((foundCount / minRequired) * 69);
  }

  /**
   * Verify a document against expected keywords
   * ALL PROCESSING IS LOCAL - NO DATA IS SENT TO EXTERNAL SERVERS
   */
  async verifyDocument(
    file: File,
    checklistItemId: string
  ): Promise<OcrVerificationResult> {
    const keywordConfig = getDocumentKeywords(checklistItemId);
    
    // No keyword config for this document type - require manual confirmation
    if (!keywordConfig) {
      console.log(`[OCR] No keyword config for ${checklistItemId}, requiring manual confirmation`);
      return {
        isMatch: true,
        confidence: 0,
        foundKeywords: [],
        missingKeywords: [],
        reason: 'Für diesen Dokumenttyp ist keine automatische Prüfung verfügbar. Bitte stelle sicher, dass es sich um das korrekte Dokument handelt.',
        extractedTextPreview: '',
        documentType: checklistItemId,
        displayName: 'Dokument',
        requiresManualConfirmation: true
      };
    }

    try {
      // Handle PDFs - extract text locally with pdf.js
      if (file.type === 'application/pdf') {
        console.log(`[OCR] Verifying PDF locally: ${file.name} for ${checklistItemId}`);
        
        const extractedText = await this.extractTextFromPdf(file);
        const normalizedText = this.normalizeText(extractedText);
        
        // Match keywords against extracted text
        const foundKeywords = matchKeywords(normalizedText, keywordConfig.keywords);
        const missingKeywords = keywordConfig.keywords.filter(
          kw => !foundKeywords.includes(kw)
        );
        
        const confidence = this.calculateConfidence(
          foundKeywords,
          keywordConfig.keywords,
          keywordConfig
        );
        
        const isMatch = foundKeywords.length >= keywordConfig.minMatchCount;
        
        // Create a preview of extracted text (first 200 chars)
        const textPreview = extractedText.substring(0, 200).trim() + 
          (extractedText.length > 200 ? '...' : '');
        
        let reason = '';
        if (!isMatch) {
          if (foundKeywords.length === 0) {
            reason = `Keine der erwarteten Begriffe für "${keywordConfig.displayName}" gefunden.`;
          } else {
            reason = `Nur ${foundKeywords.length} von ${keywordConfig.minMatchCount} benötigten Begriffen gefunden.`;
          }
        }
        
        // Require confirmation if mismatch or low confidence
        const requiresManualConfirmation = !isMatch || confidence < 50;
        
        const result = {
          isMatch,
          confidence,
          foundKeywords,
          missingKeywords,
          reason,
          extractedTextPreview: textPreview,
          documentType: checklistItemId,
          displayName: keywordConfig.displayName,
          isImageFile: false,
          requiresManualConfirmation
        };
        
        console.log('[OCR] PDF verification result:', {
          fileName: file.name,
          documentType: checklistItemId,
          isMatch: result.isMatch,
          requiresManualConfirmation: result.requiresManualConfirmation,
          confidence: result.confidence,
          foundKeywords: result.foundKeywords.length
        });
        
        return result;
      }
      
      // Handle images - use Tesseract.js for local OCR (runs entirely in browser)
      if (file.type.startsWith('image/')) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        console.log('[OCR] === Starting image OCR ===');
        console.log(`[OCR] File: ${file.name}`);
        console.log(`[OCR] Type: ${file.type}`);
        console.log(`[OCR] Size: ${(file.size / 1024).toFixed(1)} KB`);
        console.log(`[OCR] Document type: ${checklistItemId}`);
        console.log(`[OCR] Is Mobile: ${isMobile}`);
        console.log(`[OCR] User Agent: ${navigator.userAgent}`);
        console.log(`[OCR] Keywords to match (first 10):`, keywordConfig.keywords.slice(0, 10));
        
        try {
          // Preprocess image using Canvas (grayscale + threshold) for better OCR
          console.log('[OCR] Preprocessing image for better OCR results...');
          let imageInput: Blob | string;
          
          try {
            imageInput = await this.preprocessImage(file);
            console.log('[OCR] Using preprocessed image (B/W threshold)');
          } catch (preprocessError) {
            console.warn('[OCR] Preprocessing failed, using original image:', preprocessError);
            // Fallback to original Data URL if preprocessing fails
            imageInput = await this.fileToDataURL(file);
            console.log(`[OCR] Fallback: Data URL created, length: ${(imageInput as string).length} chars`);
          }
          
          // Get or create the singleton worker
          console.log('[OCR] Getting Tesseract worker...');
          const worker = await this.getWorker();
          console.log('[OCR] Worker ready, starting recognition...');
          
          // Use worker.recognize() with preprocessed image (Blob) or fallback (Data URL)
          const recognizePromise = worker.recognize(imageInput);
          
          // 60 second timeout (increased for preprocessing + first-time worker init)
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('OCR-Timeout: Texterkennung dauert zu lange (>60s)')), 60000);
          });
          
          const tesseractResult = await Promise.race([recognizePromise, timeoutPromise]);
          
          const extractedText = tesseractResult.data.text || '';
          console.log('[OCR] === Tesseract Result ===');
          console.log(`[OCR] Characters extracted: ${extractedText.length}`);
          console.log(`[OCR] Confidence: ${tesseractResult.data.confidence}%`);
          
          if (extractedText.length === 0) {
            console.warn('[OCR] ⚠️ WARNING: No text extracted from image');
            console.warn('[OCR] Possible reasons: Image has no text, poor quality, or Tesseract failed silently');
          } else {
            console.log(`[OCR] Extracted text preview (first 500 chars):\n${extractedText.substring(0, 500)}`);
          }
          
          const normalizedText = this.normalizeText(extractedText);
          console.log(`[OCR] Normalized text preview (first 300 chars):`, normalizedText.substring(0, 300));
          
          // Match keywords against extracted text
          const foundKeywords = matchKeywords(normalizedText, keywordConfig.keywords);
          const missingKeywords = keywordConfig.keywords.filter(
            kw => !foundKeywords.includes(kw)
          );
          
          console.log(`[OCR] Found keywords:`, foundKeywords);
          console.log(`[OCR] Missing keywords (first 10):`, missingKeywords.slice(0, 10));
          
          const confidence = this.calculateConfidence(
            foundKeywords,
            keywordConfig.keywords,
            keywordConfig
          );
          
          // For images: Be more tolerant due to OCR inaccuracies
          // Reduce minMatchCount by 1 (minimum 1)
          const effectiveMinMatchCount = Math.max(1, keywordConfig.minMatchCount - 1);
          const isMatch = foundKeywords.length >= effectiveMinMatchCount;
          
          console.log(`[OCR] Image verification: minMatch=${effectiveMinMatchCount} (original: ${keywordConfig.minMatchCount}), found=${foundKeywords.length}, isMatch=${isMatch}`);
          
          // Create a preview of extracted text (first 200 chars)
          const textPreview = extractedText.substring(0, 200).trim() + 
            (extractedText.length > 200 ? '...' : '');
          
          let reason = '';
          if (!isMatch) {
            if (foundKeywords.length === 0) {
              reason = `Keine der erwarteten Begriffe für "${keywordConfig.displayName}" gefunden.`;
            } else {
              reason = `Nur ${foundKeywords.length} von ${keywordConfig.minMatchCount} benötigten Begriffen gefunden.`;
            }
          }
          
          const requiresManualConfirmation = !isMatch || confidence < 50;
          
          const result = {
            isMatch,
            confidence,
            foundKeywords,
            missingKeywords,
            reason,
            extractedTextPreview: textPreview,
            documentType: checklistItemId,
            displayName: keywordConfig.displayName,
            isImageFile: true,
            requiresManualConfirmation
          };
          
          console.log('[OCR] Image verification result:', {
            fileName: file.name,
            documentType: checklistItemId,
            isMatch: result.isMatch,
            requiresManualConfirmation: result.requiresManualConfirmation,
            confidence: result.confidence,
            foundKeywords: result.foundKeywords.length
          });
          
          return result;
          
        } catch (tesseractError) {
          console.error('[OCR] Tesseract OCR failed with error:', tesseractError);
          console.error('[OCR] Error message:', tesseractError instanceof Error ? tesseractError.message : String(tesseractError));
          
          // Fallback: accept file but require manual confirmation
          return {
            isMatch: true,
            confidence: 0,
            foundKeywords: [],
            missingKeywords: [],
            reason: 'Texterkennung fehlgeschlagen. Bitte stelle sicher, dass es sich um das korrekte Dokument handelt.',
            extractedTextPreview: '',
            documentType: checklistItemId,
            displayName: keywordConfig.displayName,
            isImageFile: true,
            requiresManualConfirmation: true
          };
        }
      }
      
      // Other file types - accept without verification
      console.log(`[OCR] Unsupported file type: ${file.type} - skipping verification`);
      return {
        isMatch: true,
        confidence: 100,
        foundKeywords: [],
        missingKeywords: [],
        reason: 'Dieser Dateityp kann nicht automatisch geprüft werden.',
        extractedTextPreview: '',
        documentType: checklistItemId,
        displayName: keywordConfig.displayName,
        requiresManualConfirmation: false
      };
      
    } catch (error) {
      console.error('[OCR] Local verification error:', error);
      
      // On error, allow the document through but require confirmation
      return {
        isMatch: true,
        confidence: 0,
        foundKeywords: [],
        missingKeywords: keywordConfig.keywords,
        reason: error instanceof Error ? error.message : 'Automatische Prüfung fehlgeschlagen',
        extractedTextPreview: '',
        documentType: checklistItemId,
        displayName: keywordConfig.displayName,
        requiresManualConfirmation: true // Require confirmation on error
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
