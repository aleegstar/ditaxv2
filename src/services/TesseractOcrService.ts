/**
 * Tesseract OCR Service
 * 
 * Local browser-based OCR using Tesseract.js
 * PRIVACY FIRST: All processing happens locally in the browser.
 * Text is extracted, matched against keywords, then discarded.
 * No raw text or document content is ever stored or transmitted.
 * 
 * Used as fallback when:
 * - Running in browser (not native mobile)
 * - Native OCR is not available
 */

import { createWorker, Worker } from 'tesseract.js';

// OEM constants from tesseract.js - using direct values for compatibility
const OEM_LSTM_ONLY = 1;

class TesseractOcrService {
  private static instance: TesseractOcrService;
  private worker: Worker | null = null;
  private initialized: boolean = false;
  private initializing: Promise<boolean> | null = null;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly CLEANUP_DELAY_MS = 60000; // 60 seconds

  private constructor() {}

  public static getInstance(): TesseractOcrService {
    if (!TesseractOcrService.instance) {
      TesseractOcrService.instance = new TesseractOcrService();
    }
    return TesseractOcrService.instance;
  }

  /**
   * Check if Tesseract.js is available (always true in browser)
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Initialize the Tesseract worker (lazy loading)
   * Downloads German language data on first use (~2MB)
   */
  async initialize(): Promise<boolean> {
    // Already initialized
    if (this.initialized && this.worker) {
      this.scheduleCleanup();
      return true;
    }

    // Already initializing - wait for it
    if (this.initializing) {
      return this.initializing;
    }

    // Start initialization
    this.initializing = this.doInitialize();
    return this.initializing;
  }

  private async doInitialize(): Promise<boolean> {
    try {
      console.log('[TesseractOCR] Initializing worker with German language...');
      console.log('[TesseractOCR] Environment check:', {
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        userAgent: navigator?.userAgent?.substring(0, 50) || 'unknown'
      });
      
      // Create worker with German language
      // Using Tesseract.js v7 API with numeric OEM value (1 = LSTM_ONLY)
      // workerBlobURL: false fixes CSP issues in some environments
      console.log('[TesseractOCR] Creating worker with OEM:', OEM_LSTM_ONLY);
      
      this.worker = await createWorker('deu', OEM_LSTM_ONLY, {
        workerBlobURL: false, // Prevents CSP blob URL issues
        logger: (m) => {
          const progress = m.progress !== undefined ? `${Math.round(m.progress * 100)}%` : '';
          console.log(`[TesseractOCR] Status: ${m.status} ${progress}`);
        },
        errorHandler: (err) => {
          console.error('[TesseractOCR] Worker error handler:', err);
        }
      });

      this.initialized = true;
      this.initializing = null;
      this.scheduleCleanup();
      
      console.log('[TesseractOCR] Worker initialized successfully');
      return true;
    } catch (error: unknown) {
      // Detailed error logging for diagnosis
      const errorInfo = {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : []
      };
      console.error('[TesseractOCR] Failed to initialize:', errorInfo);
      
      // Try to extract more info if it's an object
      if (error && typeof error === 'object') {
        console.error('[TesseractOCR] Error object details:', JSON.stringify(error, null, 2));
      }
      
      this.initialized = false;
      this.initializing = null;
      this.worker = null;
      return false;
    }
  }

  /**
   * Detect text from an image file
   * @param file - The image file to process
   * @param onProgress - Optional progress callback (0-100)
   * @returns Array of detected text lines (not stored, only for matching)
   */
  async detectTextFromFile(
    file: File, 
    onProgress?: (percent: number) => void
  ): Promise<string[]> {
    if (!this.isAvailable()) {
      console.log('[TesseractOCR] Not available');
      return [];
    }

    try {
      // Initialize worker if needed
      onProgress?.(5);
      const ready = await this.initialize();
      if (!ready || !this.worker) {
        console.log('[TesseractOCR] Worker not ready');
        return [];
      }

      onProgress?.(20);

      // Prepare image (compress if needed)
      const imageData = await this.prepareImage(file);
      onProgress?.(30);

      console.log('[TesseractOCR] Starting text recognition...');
      
      // Perform OCR with progress tracking
      const result = await this.worker.recognize(imageData, {}, {
        text: true,
        blocks: false,
        hocr: false,
        tsv: false
      });

      onProgress?.(90);

      if (!result || !result.data || !result.data.text) {
        console.log('[TesseractOCR] No text detected');
        return [];
      }

      // Split text into lines and filter empty ones
      const lines = result.data.text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      console.log(`[TesseractOCR] Detected ${lines.length} text lines`);
      onProgress?.(100);

      // Schedule cleanup after inactivity
      this.scheduleCleanup();

      return lines;
    } catch (error) {
      console.error('[TesseractOCR] Detection failed:', error);
      return [];
    }
  }

  /**
   * Match detected text against keywords
   * PRIVACY: Only returns match counts and matched labels, never raw text
   * 
   * @param detectedTexts - Array of detected text strings (will be discarded after matching)
   * @param keywords - Keywords to match against
   * @returns Match count and matched keyword labels
   */
  matchKeywords(
    detectedTexts: string[],
    keywords: string[]
  ): { matchCount: number; matchedLabels: string[] } {
    if (!detectedTexts.length || !keywords.length) {
      return { matchCount: 0, matchedLabels: [] };
    }

    // Normalize detected text for matching
    const normalizedText = detectedTexts
      .join(' ')
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');

    const matchedLabels: string[] = [];

    for (const keyword of keywords) {
      const normalizedKeyword = keyword
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss');

      if (normalizedText.includes(normalizedKeyword)) {
        matchedLabels.push(keyword);
      }
    }

    return {
      matchCount: matchedLabels.length,
      matchedLabels
    };
  }

  /**
   * Prepare image for OCR (compress if too large)
   * Max 1920px on longest side for performance
   */
  private async prepareImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          
          // For small images, use directly
          if (file.size < 500000) { // < 500KB
            resolve(dataUrl);
            return;
          }

          // Compress large images
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              resolve(dataUrl);
              return;
            }

            // Calculate new dimensions (max 1920px)
            const maxSize = 1920;
            let { width, height } = img;
            
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG for better OCR performance
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            console.log(`[TesseractOCR] Image compressed: ${img.width}x${img.height} -> ${width}x${height}`);
            resolve(compressedDataUrl);
          };
          
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Schedule worker cleanup after inactivity
   */
  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }

    this.cleanupTimer = setTimeout(async () => {
      await this.cleanup();
    }, this.CLEANUP_DELAY_MS);
  }

  /**
   * Clean up worker to free memory
   */
  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.worker) {
      try {
        console.log('[TesseractOCR] Cleaning up worker...');
        await this.worker.terminate();
        this.worker = null;
        this.initialized = false;
        console.log('[TesseractOCR] Worker terminated');
      } catch (error) {
        console.error('[TesseractOCR] Cleanup failed:', error);
      }
    }
  }
}

export default TesseractOcrService;
