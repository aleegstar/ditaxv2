/**
 * Native OCR Service
 * 
 * Uses @capacitor-community/image-to-text for on-device OCR
 * via Google ML Kit (Android) and iOS Vision Framework.
 * 
 * PRIVACY FIRST: All processing happens locally on-device.
 * Text is extracted, matched against keywords, then discarded.
 * No raw text or document content is ever stored or transmitted.
 */

import { Capacitor } from '@capacitor/core';
import { isDespiaEnvironment } from '@/utils/platform';

// Dynamic import to avoid errors when not on native
let OcrModule: any = null;

class NativeOcrService {
  private static instance: NativeOcrService;
  private initialized: boolean = false;
  private available: boolean = false;
  private useDespia: boolean = false;

  private constructor() {}

  public static getInstance(): NativeOcrService {
    if (!NativeOcrService.instance) {
      NativeOcrService.instance = new NativeOcrService();
    }
    return NativeOcrService.instance;
  }

  /**
   * Initialize the OCR service
   * Must be called before using other methods
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return this.available;
    }

    this.initialized = true;

    // Check for Despia environment first (WebView with native bridge)
    if (isDespiaEnvironment()) {
      console.log('[NativeOCR] Despia environment detected');
      
      // Check if Despia has OCR capability
      if (typeof (window as any).despia?.ocr?.recognizeText === 'function') {
        console.log('[NativeOCR] Using Despia OCR');
        this.useDespia = true;
        this.available = true;
        return true;
      }
      
      // Despia without OCR - still mark as mobile context
      console.log('[NativeOCR] Despia without OCR capability - will skip OCR');
      this.available = false;
      return false;
    }

    // Only available on native platforms (Capacitor)
    if (!Capacitor.isNativePlatform()) {
      console.log('[NativeOCR] Not available - running in browser');
      this.available = false;
      return false;
    }

    try {
      // Dynamic import to avoid bundling issues
      OcrModule = await import('@capacitor-community/image-to-text');
      this.available = true;
      console.log('[NativeOCR] Initialized with Capacitor plugin');
      return true;
    } catch (error) {
      console.log('[NativeOCR] Plugin not available:', error);
      this.available = false;
      return false;
    }
  }

  /**
   * Check if native OCR is available
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Check if running on native platform (potential OCR support)
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Detect text from an image file
   * @param file - The image file to process
   * @returns Array of detected text strings (not stored, only for matching)
   */
  async detectTextFromFile(file: File): Promise<string[]> {
    if (!this.available) {
      console.log('[NativeOCR] Not available for text detection');
      return [];
    }

    try {
      // Use Despia OCR if available
      if (this.useDespia) {
        return await this.detectTextWithDespia(file);
      }

      // Use Capacitor OCR plugin
      if (OcrModule) {
        return await this.detectTextWithCapacitor(file);
      }

      console.log('[NativeOCR] No OCR method available');
      return [];
    } catch (error) {
      console.error('[NativeOCR] Detection failed:', error);
      return [];
    }
  }

  /**
   * Detect text using Despia native OCR
   */
  private async detectTextWithDespia(file: File): Promise<string[]> {
    try {
      const dataUrl = await this.fileToDataUrl(file);
      
      console.log('[NativeOCR] Calling Despia OCR...');
      const result = await (window as any).despia.ocr.recognizeText(dataUrl);
      
      if (!result || !result.text) {
        console.log('[NativeOCR] Despia: No text detected');
        return [];
      }
      
      // Split result into lines
      const texts = result.text
        .split('\n')
        .filter((text: string) => text && text.trim().length > 0);
      
      console.log(`[NativeOCR] Despia: Detected ${texts.length} text blocks`);
      return texts;
    } catch (error) {
      console.error('[NativeOCR] Despia OCR failed:', error);
      return [];
    }
  }

  /**
   * Detect text using Capacitor OCR plugin
   */
  private async detectTextWithCapacitor(file: File): Promise<string[]> {
    const dataUrl = await this.fileToDataUrl(file);
    
    const result = await OcrModule.Ocr.detectText({ 
      filename: dataUrl 
    });

    if (!result || !result.textDetections) {
      console.log('[NativeOCR] Capacitor: No text detected');
      return [];
    }

    const texts = result.textDetections
      .map((detection: any) => detection.text)
      .filter((text: string) => text && text.trim().length > 0);

    console.log(`[NativeOCR] Capacitor: Detected ${texts.length} text blocks`);
    return texts;
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
   * Convert File to data URL for OCR plugin
   */
  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

export default NativeOcrService;
