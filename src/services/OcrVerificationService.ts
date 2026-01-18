import { getDocumentKeywords, matchKeywords, DocumentKeywordConfig } from '@/utils/documentKeywords';
import { OCRClient } from 'tesseract-wasm';

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
  /** Debug log for troubleshooting OCR issues (especially on mobile) */
  debugLog?: string[];
  /** 
   * Confirmation mode for the dialog:
   * - 'warning': OCR detected a potential mismatch OR OCR failed - yellow warning style
   * Only shown when requiresManualConfirmation is true
   */
  confirmationMode?: 'warning';
}

/**
 * DSGVO-konformer lokaler Dokumenten-Verifizierungsservice
 * 
 * WICHTIG: Alle Verarbeitung erfolgt lokal im Browser des Benutzers.
 * Es werden KEINE Daten an externe Server übermittelt.
 * 
 * - PDFs: Text wird mit pdf.js lokal extrahiert
 * - Bilder: Text wird mit tesseract-wasm lokal im Browser erkannt (OCR)
 * 
 * tesseract-wasm Vorteile:
 * - Nur ~2.1MB Download (statt ~18MB bei tesseract.js)
 * - SIMD-Unterstützung für bessere Performance
 * - Optimiert für Browser/Mobile
 */
class OcrVerificationService {
  private static instance: OcrVerificationService;
  private ocrClient: OCRClient | null = null;
  private initPromise: Promise<void> | null = null;
  private ocrDebugLog: string[] = [];
  private isInitialized = false;

  public static getInstance(): OcrVerificationService {
    if (!OcrVerificationService.instance) {
      OcrVerificationService.instance = new OcrVerificationService();
    }
    return OcrVerificationService.instance;
  }

  /**
   * Add a debug log entry (visible in UI for troubleshooting)
   */
  private addDebugLog(message: string): void {
    const timestamp = new Date().toISOString().substring(11, 19);
    const logEntry = `${timestamp}: ${message}`;
    console.log(`[OCR] ${message}`);
    this.ocrDebugLog.push(logEntry);
  }

  /**
   * Clear debug log for new operation
   */
  private clearDebugLog(): void {
    this.ocrDebugLog = [];
  }

  /**
   * Get current debug log
   */
  private getDebugLog(): string[] {
    return [...this.ocrDebugLog];
  }

  /**
   * Check if OCR is initialized and ready
   */
  public isReady(): boolean {
    return this.isInitialized && this.ocrClient !== null;
  }

  /**
   * Initialize the OCR engine (tesseract-wasm)
   * Downloads ~2.1MB (with Brotli compression) instead of ~18MB for tesseract.js
   * 
   * Mobile: 10s internal timeout
   * Desktop: 30s internal timeout
   */
  public async initOcr(): Promise<void> {
    if (this.isInitialized && this.ocrClient) {
      console.log('[OCR] Already initialized');
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const startTime = Date.now();
    const timeout = isMobile ? 10000 : 30000; // 10s mobile, 30s desktop

    this.initPromise = (async () => {
      try {
        console.log(`[OCR] Initializing tesseract-wasm (${isMobile ? 'mobile' : 'desktop'}, timeout: ${timeout}ms)...`);
        
        // Create OCRClient instance
        this.ocrClient = new OCRClient();
        
        // Load German language model from tessdata_fast (~2MB)
        // Using CDN for reliable delivery with timeout
        console.log('[OCR] Loading German language model (tessdata_fast ~2MB)...');
        
        const loadModelPromise = this.ocrClient.loadModel(
          'https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@main/deu.traineddata'
        );
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`OCR model load timeout after ${timeout}ms`)), timeout);
        });
        
        await Promise.race([loadModelPromise, timeoutPromise]);
        
        const duration = Date.now() - startTime;
        console.log(`[OCR] tesseract-wasm initialized in ${duration}ms`);
        this.isInitialized = true;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[OCR] Failed to initialize tesseract-wasm after ${duration}ms:`, error);
        
        // Cleanup on failure
        if (this.ocrClient) {
          try {
            this.ocrClient.destroy();
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        this.ocrClient = null;
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Terminate the OCR client (cleanup)
   */
  async terminateWorker(): Promise<void> {
    if (this.ocrClient) {
      console.log('[OCR] Terminating OCR client...');
      this.ocrClient.destroy();
      this.ocrClient = null;
      this.initPromise = null;
      this.isInitialized = false;
      console.log('[OCR] OCR client terminated');
    }
  }

  /**
   * Render first page of PDF as an image for OCR processing
   * Used for scanned PDFs that don't have a text layer
   */
  private async renderPdfPageAsImage(file: File): Promise<Blob | null> {
    if (!window.pdfjsLib) {
      console.warn('[OCR] PDF.js not loaded, cannot render PDF page');
      return null;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      // Render at 2x scale for better OCR quality
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('[OCR] Could not get canvas context');
        return null;
      }
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          console.log(`[OCR] PDF page rendered: ${canvas.width}x${canvas.height}, ${blob ? (blob.size / 1024).toFixed(1) + ' KB' : 'failed'}`);
          resolve(blob);
        }, 'image/png');
      });
    } catch (error) {
      console.error('[OCR] Failed to render PDF page:', error);
      return null;
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
   * Preprocess image using Canvas for better OCR results
   * Converts to grayscale and increases contrast (threshold)
   * This significantly improves OCR accuracy, especially on mobile devices
   */
  private async preprocessImage(file: File | Blob): Promise<ImageBitmap> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = async () => {
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
        
        // Create ImageBitmap for tesseract-wasm
        try {
          const bitmap = await createImageBitmap(canvas);
          console.log(`[OCR] Preprocessed ImageBitmap: ${bitmap.width}x${bitmap.height}`);
          resolve(bitmap);
        } catch (error) {
          reject(new Error('Failed to create ImageBitmap from canvas'));
        }
      };
      
      img.onerror = () => {
        console.error('[OCR] Failed to load image for preprocessing');
        reject(new Error('Failed to load image for preprocessing'));
      };
      
      // Load image from file/blob
      if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file for preprocessing'));
        reader.readAsDataURL(file);
      } else {
        // Blob
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          img.onload = null; // Clear handler to use the main one
          // Trigger the main handler
          const event = new Event('load');
          img.dispatchEvent(event);
        };
        img.src = url;
      }
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
   * Extract text from image using tesseract-wasm
   */
  private async extractTextFromImage(imageBitmap: ImageBitmap): Promise<string> {
    if (!this.ocrClient) {
      throw new Error('OCR client not initialized');
    }

    await this.ocrClient.loadImage(imageBitmap);
    const text = await this.ocrClient.getText();
    return text;
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
        
        // Check if this is a scanned/image PDF with no real text
        // Scanned PDFs (from phone scanners) contain images, not text layers
        const hasRealText = extractedText.trim().length > 30;
        
        if (!hasRealText) {
          console.log(`[OCR] Image-PDF detected (scanned document) - attempting OCR on rendered page`);
          
          // For scanned PDFs: Render first page as image and run tesseract-wasm OCR
          try {
            const pdfImage = await this.renderPdfPageAsImage(file);
            if (pdfImage) {
              console.log(`[OCR] PDF page rendered as image, running tesseract-wasm OCR...`);
              
              // Ensure OCR is initialized
              await this.initOcr();
              
              if (this.ocrClient) {
                const imageBitmap = await this.preprocessImage(pdfImage);
                const ocrText = await this.extractTextFromImage(imageBitmap);
                imageBitmap.close();
                
                if (ocrText.trim().length > 30) {
                  console.log(`[OCR] Scanned PDF OCR successful: ${ocrText.length} chars`);
                  
                  const normalizedText = this.normalizeText(ocrText);
                  const foundKeywords = matchKeywords(normalizedText, keywordConfig.keywords);
                  const missingKeywords = keywordConfig.keywords.filter(kw => !foundKeywords.includes(kw));
                  const confidence = this.calculateConfidence(foundKeywords, keywordConfig.keywords, keywordConfig);
                  const isMatch = foundKeywords.length >= keywordConfig.minMatchCount;
                  
                  const textPreview = ocrText.substring(0, 200).trim() + (ocrText.length > 200 ? '...' : '');
                  
                  let reason = '';
                  if (!isMatch) {
                    if (foundKeywords.length === 0) {
                      reason = `Keine der erwarteten Begriffe für "${keywordConfig.displayName}" gefunden.`;
                    } else {
                      reason = `Nur ${foundKeywords.length} von ${keywordConfig.minMatchCount} benötigten Begriffen gefunden.`;
                    }
                  }
                  
                  const requiresManualConfirmation = !isMatch || confidence < 50;
                  const confirmationMode: 'warning' | undefined = requiresManualConfirmation && !isMatch ? 'warning' : undefined;
                  
                  return {
                    isMatch,
                    confidence,
                    foundKeywords,
                    missingKeywords,
                    reason,
                    extractedTextPreview: textPreview,
                    documentType: checklistItemId,
                    displayName: keywordConfig.displayName,
                    isImageFile: false,
                    requiresManualConfirmation,
                    confirmationMode
                  };
                }
              }
            }
          } catch (pdfOcrError) {
            console.warn('[OCR] Scanned PDF OCR failed, falling back to manual confirmation:', pdfOcrError);
          }
          
          // Fallback: Warning dialog when OCR failed for scanned PDF
          return {
            isMatch: true,
            confidence: 0,
            foundKeywords: [],
            missingKeywords: [],
            reason: 'Die automatische Dokumentenprüfung konnte nicht durchgeführt werden.',
            extractedTextPreview: '',
            documentType: checklistItemId,
            displayName: keywordConfig.displayName,
            isImageFile: false,
            requiresManualConfirmation: true,
            confirmationMode: 'warning'
          };
        }
        
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
        
        // Set confirmation mode based on whether OCR found issues
        const confirmationMode: 'warning' | undefined = requiresManualConfirmation && !isMatch ? 'warning' : undefined;
        
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
          requiresManualConfirmation,
          confirmationMode
        };
        
        console.log('[OCR] PDF verification result:', {
          fileName: file.name,
          documentType: checklistItemId,
          isMatch: result.isMatch,
          requiresManualConfirmation: result.requiresManualConfirmation,
          confirmationMode: result.confirmationMode,
          confidence: result.confidence,
          foundKeywords: result.foundKeywords.length
        });
        
        return result;
      }
      
      // Handle images - use tesseract-wasm OCR (100% lokal, DSGVO-konform)
      // tesseract-wasm läuft vollständig im Browser - keine Daten verlassen das Gerät
      if (file.type.startsWith('image/')) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // Clear and start debug logging
        this.clearDebugLog();
        this.addDebugLog('=== Starting Image OCR (tesseract-wasm, lokal/DSGVO-konform) ===');
        this.addDebugLog(`File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        this.addDebugLog(`Type: ${file.type}`);
        this.addDebugLog(`Mobile: ${isMobile ? 'Yes' : 'No'}`);
        this.addDebugLog(`Document: ${keywordConfig.displayName}`);
        this.addDebugLog('Alle Daten werden lokal verarbeitet - keine externe Übertragung');
        this.addDebugLog('tesseract-wasm: ~2.1MB Download (6x kleiner als tesseract.js)');
        
        try {
          // Initialize OCR if not already done
          this.addDebugLog('Initializing tesseract-wasm...');
          await this.initOcr();
          
          if (!this.ocrClient) {
            this.addDebugLog('OCR client not available - zeige Warning-Dialog');
            
            return {
              isMatch: true,
              confidence: 0,
              foundKeywords: [],
              missingKeywords: [],
              reason: 'Die automatische Dokumentenprüfung konnte nicht durchgeführt werden. Bitte bestätige, dass es sich um das richtige Dokument handelt.',
              extractedTextPreview: '',
              documentType: checklistItemId,
              displayName: keywordConfig.displayName,
              isImageFile: true,
              requiresManualConfirmation: true,
              confirmationMode: 'warning',
              debugLog: this.getDebugLog()
            };
          }
          
          this.addDebugLog('tesseract-wasm ready ✓');
          
          let extractedText = '';
          
          // Preprocess image for better OCR results
          this.addDebugLog('Preprocessing image (grayscale, threshold)...');
          try {
            const imageBitmap = await this.preprocessImage(file);
            this.addDebugLog(`ImageBitmap: ${imageBitmap.width}x${imageBitmap.height}`);
            
            // Run OCR
            this.addDebugLog('Running OCR...');
            const startTime = Date.now();
            extractedText = await this.extractTextFromImage(imageBitmap);
            const duration = Date.now() - startTime;
            
            imageBitmap.close();
            
            this.addDebugLog(`OCR completed in ${duration}ms: ${extractedText.length} chars`);
            
          } catch (ocrError) {
            this.addDebugLog(`OCR failed: ${ocrError instanceof Error ? ocrError.message : String(ocrError)}`);
          }
          
          // Log final result
          this.addDebugLog(`=== Final: ${extractedText.length} chars ===`);
          
          if (extractedText.length === 0) {
            this.addDebugLog('⚠️ No text extracted from image');
            if (isMobile) {
              this.addDebugLog('Mobile device detected - OCR may be limited');
            }
          } else {
            this.addDebugLog(`Preview: ${extractedText.substring(0, 100).replace(/\n/g, ' ')}...`);
          }
          
          const normalizedText = this.normalizeText(extractedText);
          
          // Match keywords against extracted text
          const foundKeywords = matchKeywords(normalizedText, keywordConfig.keywords);
          const missingKeywords = keywordConfig.keywords.filter(
            kw => !foundKeywords.includes(kw)
          );
          
          this.addDebugLog(`Keywords: ${foundKeywords.length} found, ${missingKeywords.length} missing`);
          
          const confidence = this.calculateConfidence(
            foundKeywords,
            keywordConfig.keywords,
            keywordConfig
          );
          
          // For images: Be more tolerant due to OCR inaccuracies
          const effectiveMinMatchCount = Math.max(1, keywordConfig.minMatchCount - 1);
          const isMatch = foundKeywords.length >= effectiveMinMatchCount;
          
          // Create a preview of extracted text
          const textPreview = extractedText.substring(0, 200).trim() + 
            (extractedText.length > 200 ? '...' : '');
          
          // Build reason with mobile-specific guidance
          let reason = '';
          if (!isMatch) {
            if (extractedText.length === 0) {
              if (isMobile) {
                reason = `Die Texterkennung auf mobilen Geräten ist eingeschränkt. Für bessere Ergebnisse verwenden Sie bitte ein PDF-Dokument oder laden Sie das Bild vom Desktop hoch.`;
              } else {
                reason = `Keine Textinhalte im Bild erkannt. Das Bild enthält möglicherweise keinen lesbaren Text.`;
              }
            } else if (foundKeywords.length === 0) {
              reason = `Keine der erwarteten Begriffe für "${keywordConfig.displayName}" gefunden.`;
            } else {
              reason = `Nur ${foundKeywords.length} von ${keywordConfig.minMatchCount} benötigten Begriffen gefunden.`;
            }
          }
          
          const requiresManualConfirmation = !isMatch || confidence < 50;
          
          const result: OcrVerificationResult = {
            isMatch,
            confidence,
            foundKeywords,
            missingKeywords,
            reason,
            extractedTextPreview: textPreview,
            documentType: checklistItemId,
            displayName: keywordConfig.displayName,
            isImageFile: true,
            requiresManualConfirmation,
            debugLog: this.getDebugLog()
          };
          
          console.log('[OCR] Image verification result:', {
            fileName: file.name,
            isMatch: result.isMatch,
            confidence: result.confidence,
            foundKeywords: result.foundKeywords.length,
            debugLogLines: result.debugLog?.length
          });
          
          return result;
          
        } catch (tesseractError) {
          this.addDebugLog(`FATAL: ${tesseractError instanceof Error ? tesseractError.message : String(tesseractError)}`);
          console.error('[OCR] tesseract-wasm OCR failed:', tesseractError);
          
          // Fallback: Warning dialog when OCR fails
          return {
            isMatch: true,
            confidence: 0,
            foundKeywords: [],
            missingKeywords: [],
            reason: 'Die automatische Dokumentenprüfung konnte nicht durchgeführt werden. Bitte bestätige, dass es sich um das richtige Dokument handelt.',
            extractedTextPreview: '',
            documentType: checklistItemId,
            displayName: keywordConfig.displayName,
            isImageFile: true,
            requiresManualConfirmation: true,
            confirmationMode: 'warning',
            debugLog: this.getDebugLog()
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
