/**
 * Cloud OCR Service
 * 
 * DSGVO-konforme Texterkennung über Lovable AI Gateway.
 * 
 * DATENSCHUTZ:
 * - Bilder werden komprimiert vor dem Upload (max 1MB)
 * - Nur Keyword-Matches werden zurückgegeben, nie Rohtext
 * - Transiente Verarbeitung - keine Speicherung
 * - Timeout nach 15 Sekunden
 */

import imageCompression from 'browser-image-compression';
import { getAllProfiles } from '@/config/documentProfiles';

interface CloudOcrResult {
  available: boolean;
  matchedKeywords: string[];
  matchCountsByDocType: Record<string, number>;
  duration?: number;
  error?: string;
}

class CloudOcrService {
  private static instance: CloudOcrService;
  private isProcessing = false;

  public static getInstance(): CloudOcrService {
    if (!CloudOcrService.instance) {
      CloudOcrService.instance = new CloudOcrService();
    }
    return CloudOcrService.instance;
  }

  /**
   * Extract keywords from an image using Cloud OCR
   * @param file - The image file to process
   * @returns OCR result with matched keywords
   */
  async extractKeywords(file: File): Promise<CloudOcrResult> {
    if (this.isProcessing) {
      console.log('[CloudOCR] Already processing, skipping...');
      return { available: false, matchedKeywords: [], matchCountsByDocType: {} };
    }

    if (!file.type.startsWith('image/')) {
      console.log('[CloudOCR] Not an image file, skipping');
      return { available: false, matchedKeywords: [], matchCountsByDocType: {} };
    }

    this.isProcessing = true;
    
    try {
      console.log('[CloudOCR] Starting extraction for:', file.name);

      // Collect all keywords from all profiles
      const allProfiles = getAllProfiles();
      const allKeywords: string[] = [];
      
      for (const profile of allProfiles) {
        if (profile.keywordHints) {
          allKeywords.push(...profile.keywordHints);
        }
      }

      // Deduplicate and limit keywords
      const uniqueKeywords = [...new Set(allKeywords)].slice(0, 50);
      
      if (uniqueKeywords.length === 0) {
        console.log('[CloudOCR] No keywords configured');
        return { available: false, matchedKeywords: [], matchCountsByDocType: {} };
      }

      // Compress image to max 1MB
      const compressedFile = await this.compressImage(file);
      const base64 = await this.fileToBase64(compressedFile);
      
      // Remove data URL prefix if present
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');

      console.log(`[CloudOCR] Sending ${(base64Data.length / 1024).toFixed(0)}KB to edge function`);

      // Call the edge function with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-extract`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              imageBase64: base64Data,
              keywords: uniqueKeywords
            }),
            signal: controller.signal
          }
        );

        clearTimeout(timeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[CloudOCR] Edge function error:', response.status, errorData);
          
          // Handle specific errors
          if (response.status === 429) {
            return { 
              available: false, 
              matchedKeywords: [], 
              matchCountsByDocType: {},
              error: 'rate_limit'
            };
          }
          if (response.status === 402) {
            return { 
              available: false, 
              matchedKeywords: [], 
              matchCountsByDocType: {},
              error: 'credits_exhausted'
            };
          }
          
          return { available: false, matchedKeywords: [], matchCountsByDocType: {} };
        }

        const result = await response.json();
        console.log('[CloudOCR] Result:', result);

        const matchedKeywords = result.matched || [];

        // Calculate match counts per document type
        const matchCountsByDocType: Record<string, number> = {};
        
        for (const profile of allProfiles) {
          if (profile.keywordHints) {
            const matches = matchedKeywords.filter((matched: string) =>
              profile.keywordHints!.some(hint =>
                matched.toLowerCase().includes(hint.toLowerCase()) ||
                hint.toLowerCase().includes(matched.toLowerCase())
              )
            );
            matchCountsByDocType[profile.id] = matches.length;
          }
        }

        return {
          available: true,
          matchedKeywords,
          matchCountsByDocType,
          duration: result.duration
        };

      } catch (fetchError: unknown) {
        clearTimeout(timeout);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn('[CloudOCR] Request timed out');
          return { 
            available: false, 
            matchedKeywords: [], 
            matchCountsByDocType: {},
            error: 'timeout'
          };
        }
        throw fetchError;
      }

    } catch (error) {
      console.error('[CloudOCR] Error:', error);
      return { available: false, matchedKeywords: [], matchCountsByDocType: {} };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Compress image to max 1MB for upload
   */
  private async compressImage(file: File): Promise<File> {
    const options = {
      maxSizeMB: 0.8, // Target 800KB to stay under 1MB after base64
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
    };

    // Only compress if file is too large
    if (file.size > 800 * 1024) {
      console.log(`[CloudOCR] Compressing from ${(file.size / 1024).toFixed(0)}KB`);
      const compressed = await imageCompression(file, options);
      console.log(`[CloudOCR] Compressed to ${(compressed.size / 1024).toFixed(0)}KB`);
      return compressed;
    }

    return file;
  }

  /**
   * Convert file to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Check if Cloud OCR is available (basic check)
   */
  isAvailable(): boolean {
    return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  }
}

export default CloudOcrService;
