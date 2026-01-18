/**
 * OCR Preload Service
 * 
 * Lädt den OCR-Client proaktiv beim App-Start im Hintergrund,
 * damit er beim ersten Dokument-Upload bereits verfügbar ist.
 * 
 * Nutzt tesseract-wasm (~2.1MB) statt tesseract.js (~18MB) für
 * bessere Mobile-Performance.
 * 
 * Mobile-Optimierung:
 * - Kürzerer Timeout (8 Sekunden) auf Mobile-Geräten
 * - Schneller Fallback auf manuelle Bestätigung
 * - Status-Tracking für UI-Feedback
 */

import OcrVerificationService from './OcrVerificationService';

class OcrPreloadService {
  private static preloadPromise: Promise<void> | null = null;
  private static isReady = false;
  private static hasFailed = false;
  private static preloadStartTime: number = 0;
  private static loadingProgress: 'idle' | 'initializing' | 'loading-wasm' | 'ready' | 'error' | 'timeout' = 'idle';

  // Mobile detection
  private static isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  // Shorter timeout for mobile devices (8s vs 30s)
  private static getTimeout(): number {
    return this.isMobileDevice() ? 8000 : 30000;
  }

  /**
   * Preload the OCR engine in the background
   * Call this on app startup (non-blocking)
   */
  static async preloadWorker(): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = (async () => {
      const isMobile = this.isMobileDevice();
      const timeout = this.getTimeout();
      
      try {
        this.preloadStartTime = Date.now();
        this.loadingProgress = 'initializing';
        console.log(`[OCR Preload] Starting OCR engine preload (${isMobile ? 'mobile' : 'desktop'}, timeout: ${timeout}ms)...`);
        
        const ocrService = OcrVerificationService.getInstance();
        
        this.loadingProgress = 'loading-wasm';
        
        // Race between OCR init and timeout
        const initPromise = ocrService.initOcr();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`OCR preload timeout after ${timeout}ms`)), timeout);
        });
        
        await Promise.race([initPromise, timeoutPromise]);
        
        const duration = Date.now() - this.preloadStartTime;
        this.isReady = true;
        this.loadingProgress = 'ready';
        console.log(`[OCR Preload] OCR engine ready in ${duration}ms`);
        
      } catch (error) {
        const duration = Date.now() - this.preloadStartTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isTimeout = errorMessage.includes('timeout');
        
        console.warn(`[OCR Preload] OCR preload ${isTimeout ? 'timeout' : 'failed'} after ${duration}ms:`, errorMessage);
        
        this.hasFailed = true;
        this.loadingProgress = isTimeout ? 'timeout' : 'error';
        
        // Don't throw - preload failures should not block the app
        // Mobile users will get a fast fallback to manual confirmation
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
   * Check if OCR has failed (timeout or error)
   */
  static hasFailed_(): boolean {
    return this.hasFailed;
  }

  /**
   * Check if we're on a mobile device
   */
  static isMobile(): boolean {
    return this.isMobileDevice();
  }

  /**
   * Get current loading progress status
   */
  static getLoadingProgress(): 'idle' | 'initializing' | 'loading-wasm' | 'ready' | 'error' | 'timeout' {
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
   * Returns true if ready, false if timeout or failed
   */
  static async waitForReady(timeoutMs?: number): Promise<boolean> {
    if (this.isReady) return true;
    if (this.hasFailed) return false;
    
    if (!this.preloadPromise) {
      // Start preload if not already started
      this.preloadWorker();
    }

    const effectiveTimeout = timeoutMs ?? this.getTimeout();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('OCR wait timeout')), effectiveTimeout);
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
    this.hasFailed = false;
    this.preloadStartTime = 0;
    this.loadingProgress = 'idle';
  }
}

export default OcrPreloadService;
