/**
 * OCR Preload Service
 * 
 * Lädt den OCR-Client proaktiv beim App-Start im Hintergrund,
 * damit er beim ersten Dokument-Upload bereits verfügbar ist.
 * 
 * Nutzt tesseract-wasm (~2.1MB) statt tesseract.js (~18MB) für
 * bessere Mobile-Performance.
 */

import OcrVerificationService from './OcrVerificationService';

class OcrPreloadService {
  private static preloadPromise: Promise<void> | null = null;
  private static isReady = false;
  private static preloadStartTime: number = 0;
  private static loadingProgress: string = 'idle';

  /**
   * Preload the OCR engine in the background
   * Call this on app startup (non-blocking)
   */
  static async preloadWorker(): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = (async () => {
      try {
        this.preloadStartTime = Date.now();
        this.loadingProgress = 'initializing';
        console.log('[OCR Preload] Starting OCR engine preload (tesseract-wasm ~2.1MB)...');
        
        const ocrService = OcrVerificationService.getInstance();
        
        this.loadingProgress = 'loading-wasm';
        await ocrService.initOcr();
        
        const duration = Date.now() - this.preloadStartTime;
        this.isReady = true;
        this.loadingProgress = 'ready';
        console.log(`[OCR Preload] OCR engine ready in ${duration}ms`);
        
      } catch (error) {
        console.error('[OCR Preload] Failed to preload OCR engine:', error);
        this.loadingProgress = 'error';
        // Don't throw - preload failures should not block the app
      }
    })();

    return this.preloadPromise;
  }

  /**
   * Check if OCR is ready for immediate use
   */
  static getStatus(): boolean {
    return this.isReady;
  }

  /**
   * Get current loading progress status
   */
  static getLoadingProgress(): string {
    return this.loadingProgress;
  }

  /**
   * Get time since preload started (for timeout detection)
   */
  static getElapsedTime(): number {
    if (this.preloadStartTime === 0) return 0;
    return Date.now() - this.preloadStartTime;
  }

  /**
   * Wait for OCR to be ready with timeout
   * Returns true if ready, false if timeout
   */
  static async waitForReady(timeoutMs: number = 60000): Promise<boolean> {
    if (this.isReady) return true;
    
    if (!this.preloadPromise) {
      // Start preload if not already started
      this.preloadWorker();
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OCR preload timeout')), timeoutMs);
      });
      
      await Promise.race([this.preloadPromise, timeoutPromise]);
      return this.isReady;
    } catch {
      return false;
    }
  }

  /**
   * Reset the preload state (for testing/cleanup)
   */
  static reset(): void {
    this.preloadPromise = null;
    this.isReady = false;
    this.preloadStartTime = 0;
    this.loadingProgress = 'idle';
  }
}

export default OcrPreloadService;
