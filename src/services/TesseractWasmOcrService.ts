/**
 * Tesseract-WASM OCR Service
 * 
 * WebView-optimized OCR using tesseract-wasm library.
 * PRIVACY FIRST: All processing happens locally in the browser/WebView.
 * Text is extracted, matched against keywords, then discarded.
 * No raw text or document content is ever stored or transmitted.
 * 
 * Used for mobile WebView environments where:
 * - Native OCR (Capacitor/Despia) is not available
 * - Tesseract.js has compatibility issues with WebViews
 * 
 * Benefits over tesseract.js:
 * - Smaller footprint (~2.1MB vs ~4MB)
 * - Better Web Worker architecture (OCRClient)
 * - Automatic SIMD fallback for older devices
 * - Optimized for browser/WebView environments
 */

import { OCRClient } from 'tesseract-wasm';

class TesseractWasmOcrService {
  private static instance: TesseractWasmOcrService;
  private client: OCRClient | null = null;
  private initialized: boolean = false;
  private initializing: Promise<boolean> | null = null;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly CLEANUP_DELAY_MS = 60000; // 60 seconds

  private constructor() {}

  public static getInstance(): TesseractWasmOcrService {
    if (!TesseractWasmOcrService.instance) {
      TesseractWasmOcrService.instance = new TesseractWasmOcrService();
    }
    return TesseractWasmOcrService.instance;
  }

  /**
   * Check if tesseract-wasm is available (always true in browser/WebView)
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Initialize the OCR client (lazy loading)
   * Downloads German language data on first use (~1.6MB)
   */
  async initialize(): Promise<boolean> {
    // Already initialized
    if (this.initialized && this.client) {
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
    const INIT_TIMEOUT = 10000;
    try {
      const initResult = await Promise.race([
        this.doInitializeInternal(),
        new Promise<boolean>((resolve) =>
          setTimeout(() => {
            console.warn('[TesseractWasm] Initialization timeout (10s)');
            resolve(false);
          }, INIT_TIMEOUT)
        )
      ]);
      if (!initResult) {
        this.initialized = false;
        this.initializing = null;
        this.client = null;
      }
      return initResult;
    } catch (error: unknown) {
      const errorInfo = {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      };
      console.error('[TesseractWasm] Failed to initialize:', errorInfo);
      this.initialized = false;
      this.initializing = null;
      this.client = null;
      return false;
    }
  }

  private async doInitializeInternal(): Promise<boolean> {
    try {
      console.log('[TesseractWasm] Initializing OCR client...');
      console.log('[TesseractWasm] Environment check:', {
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        userAgent: navigator?.userAgent?.substring(0, 50) || 'unknown'
      });

      // Pre-initialization check: verify required files are accessible
      console.log('[TesseractWasm] Checking required files...');
      const requiredFiles = [
        '/ocr/tesseract-worker.js',
        '/ocr/tesseract-core.wasm',
        '/ocr/deu.traineddata'
      ];

      for (const file of requiredFiles) {
        try {
          const response = await fetch(file, { method: 'HEAD' });
          if (!response.ok) {
            console.error(`[TesseractWasm] Required file not found: ${file} (status: ${response.status})`);
            return false;
          }
          console.log(`[TesseractWasm] ✓ File accessible: ${file}`);
        } catch (fetchError) {
          console.error(`[TesseractWasm] Failed to check file: ${file}`, fetchError);
          return false;
        }
      }

      // Create OCR client with worker URL
      this.client = new OCRClient({
        workerURL: '/ocr/tesseract-worker.js'
      });

      console.log('[TesseractWasm] Loading German language model...');
      await this.client.loadModel('/ocr/deu.traineddata');

      this.initialized = true;
      this.initializing = null;
      this.scheduleCleanup();

      console.log('[TesseractWasm] OCR client initialized successfully');
      return true;
    } catch (error: unknown) {
      const errorInfo = {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      };
      console.error('[TesseractWasm] Failed to initialize:', errorInfo);
      this.initialized = false;
      this.initializing = null;
      this.client = null;
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
      console.log('[TesseractWasm] Not available');
      return [];
    }

    try {
      // Initialize client if needed
      onProgress?.(5);
      const ready = await this.initialize();
      if (!ready || !this.client) {
        console.log('[TesseractWasm] Client not ready');
        return [];
      }

      onProgress?.(20);

      // Create ImageBitmap from file
      console.log('[TesseractWasm] Creating image bitmap...');
      const imageBitmap = await this.createImageBitmap(file);
      onProgress?.(40);

      // Load image into OCR client
      console.log('[TesseractWasm] Loading image into OCR client...');
      await this.client.loadImage(imageBitmap);
      onProgress?.(60);

      // Perform OCR
      console.log('[TesseractWasm] Extracting text...');
      const text = await this.client.getText();
      onProgress?.(90);

      if (!text || text.trim().length === 0) {
        console.log('[TesseractWasm] No text detected');
        return [];
      }

      // Split text into lines and filter empty ones
      const lines = text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      console.log(`[TesseractWasm] Detected ${lines.length} text lines`);
      onProgress?.(100);

      // Schedule cleanup after inactivity
      this.scheduleCleanup();

      return lines;
    } catch (error) {
      console.error('[TesseractWasm] Detection failed:', error);
      return [];
    }
  }

  /**
   * Create ImageBitmap from file with optional compression
   */
  private async createImageBitmap(file: File): Promise<ImageBitmap> {
    // For small images, use directly
    if (file.size < 500000) { // < 500KB
      return await window.createImageBitmap(await this.fileToBlob(file));
    }

    // Compress large images using canvas
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const img = new Image();

          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              // Fallback: use original
              const bitmap = await window.createImageBitmap(await this.fileToBlob(file));
              resolve(bitmap);
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

            console.log(`[TesseractWasm] Image resized: ${img.width}x${img.height} -> ${width}x${height}`);

            // Create blob from canvas
            canvas.toBlob(
              async (blob) => {
                if (blob) {
                  const bitmap = await window.createImageBitmap(blob);
                  resolve(bitmap);
                } else {
                  reject(new Error('Failed to create blob from canvas'));
                }
              },
              'image/jpeg',
              0.9
            );
          };

          img.onerror = () => reject(new Error('Failed to load image'));
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
   * Convert File to Blob
   */
  private async fileToBlob(file: File): Promise<Blob> {
    return new Blob([await file.arrayBuffer()], { type: file.type });
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

    // Split into words for tolerant matching (OCR often splits words incorrectly)
    const words = normalizedText.split(/\s+/);

    // DEBUG: Log raw and normalized text
    console.log('[TesseractWasm] === OCR DEBUG ===');
    console.log('[TesseractWasm] Raw text lines:', detectedTexts.slice(0, 20));
    console.log('[TesseractWasm] Normalized text (first 800 chars):', normalizedText.substring(0, 800));
    console.log('[TesseractWasm] Word count:', words.length);

    const matchedLabels: string[] = [];
    const matchedBy: Record<string, string> = {}; // keyword -> match method

    for (const keyword of keywords) {
      const normalizedKeyword = keyword
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss');

      // Method 1: Direct substring match (original method)
      if (normalizedText.includes(normalizedKeyword)) {
        matchedLabels.push(keyword);
        matchedBy[keyword] = 'substring';
        continue;
      }

      // Method 2: Word-prefix matching (tolerant for OCR errors)
      // If keyword is 6+ chars, check if any word starts with the first 5-6 chars
      // This catches cases like "Lohnausw" matching when OCR cuts off the word
      if (normalizedKeyword.length >= 5) {
        const prefixLen = Math.min(5, normalizedKeyword.length);
        const keywordPrefix = normalizedKeyword.substring(0, prefixLen);
        
        // Find words that start with this prefix and are at least as long
        const prefixMatch = words.some(word => 
          word.length >= prefixLen && 
          word.startsWith(keywordPrefix)
        );
        
        if (prefixMatch) {
          matchedLabels.push(keyword);
          matchedBy[keyword] = `prefix-${prefixLen}`;
          continue;
        }
      }

      // Method 3: Check for split words (e.g., "Lohn ausweis" instead of "Lohnausweis")
      // Only for compound keywords (8+ chars)
      if (normalizedKeyword.length >= 8) {
        // Check if first half and second half are both present
        const midPoint = Math.floor(normalizedKeyword.length / 2);
        const firstHalf = normalizedKeyword.substring(0, midPoint);
        const secondHalf = normalizedKeyword.substring(midPoint);
        
        if (firstHalf.length >= 3 && secondHalf.length >= 3) {
          const hasFirstHalf = normalizedText.includes(firstHalf);
          const hasSecondHalf = normalizedText.includes(secondHalf);
          
          if (hasFirstHalf && hasSecondHalf) {
            matchedLabels.push(keyword);
            matchedBy[keyword] = 'split-word';
            continue;
          }
        }
      }
    }

    // DEBUG: Log results
    console.log('[TesseractWasm] ✅ MATCHED keywords:', matchedLabels.length, matchedLabels);
    console.log('[TesseractWasm] Match methods:', matchedBy);
    console.log('[TesseractWasm] Match rate:', `${matchedLabels.length}/${keywords.length} (${Math.round(matchedLabels.length/keywords.length*100)}%)`);
    console.log('[TesseractWasm] === END DEBUG ===');

    return {
      matchCount: matchedLabels.length,
      matchedLabels
    };
  }

  /**
   * Schedule client cleanup after inactivity
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
   * Clean up client to free memory
   */
  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.client) {
      try {
        console.log('[TesseractWasm] Cleaning up client...');
        this.client.destroy();
        this.client = null;
        this.initialized = false;
        console.log('[TesseractWasm] Client destroyed');
      } catch (error) {
        console.error('[TesseractWasm] Cleanup failed:', error);
      }
    }
  }
}

export default TesseractWasmOcrService;
