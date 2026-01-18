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

// Dynamic import to avoid errors when not on native
let OcrModule: any = null;

class NativeOcrService {
  private static instance: NativeOcrService;
  private initialized: boolean = false;
  private available: boolean = false;

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

    // Only available on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[NativeOCR] Not available - running in browser');
      this.available = false;
      return false;
    }

    try {
      // Dynamic import to avoid bundling issues
      OcrModule = await import('@capacitor-community/image-to-text');
      this.available = true;
      console.log('[NativeOCR] Initialized successfully');
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
    if (!this.available || !OcrModule) {
      console.log('[NativeOCR] Not available for text detection');
      return [];
    }

    try {
      // Convert file to base64 data URL
      const dataUrl = await this.fileToDataUrl(file);
      
      // Use the OCR plugin
      const result = await OcrModule.Ocr.detectText({ 
        filename: dataUrl 
      });

      if (!result || !result.textDetections) {
        console.log('[NativeOCR] No text detected');
        return [];
      }

      // Extract text strings (without storing raw content)
      const texts = result.textDetections
        .map((detection: any) => detection.text)
        .filter((text: string) => text && text.trim().length > 0);

      console.log(`[NativeOCR] Detected ${texts.length} text blocks`);
      return texts;
    } catch (error) {
      console.error('[NativeOCR] Detection failed:', error);
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
