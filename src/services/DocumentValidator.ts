/**
 * Document Validator Service
 * 
 * Multi-signal document validation with optional Native OCR.
 * Combines:
 * - Metadata analysis (file type, size, pages)
 * - Layout heuristics (visual structure detection)
 * - PDF text layer keyword detection
 * - Native OCR for images (iOS Vision / Android ML Kit)
 * 
 * PRIVACY FIRST: All processing is LOCAL. No data leaves the device.
 * Only validation results are stored (never raw text or images).
 */

import { 
  DocumentTypeProfile, 
  ValidationSignals, 
  ValidationResult, 
  ValidationCandidate,
  MetadataSignals,
  KeywordSignals 
} from '@/types/documentProfile';
import { DOCUMENT_PROFILES, getDocumentProfile, getAllProfiles } from '@/config/documentProfiles';
import LayoutAnalyzer from './LayoutAnalyzer';
import NativeOcrService from './NativeOcrService';
import { matchKeywords } from '@/utils/documentKeywords';

// Declare pdfjsLib type
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

class DocumentValidator {
  private static instance: DocumentValidator;
  private layoutAnalyzer: LayoutAnalyzer;
  private nativeOcr: NativeOcrService;
  private nativeOcrInitialized: boolean = false;

  private constructor() {
    this.layoutAnalyzer = LayoutAnalyzer.getInstance();
    this.nativeOcr = NativeOcrService.getInstance();
  }

  public static getInstance(): DocumentValidator {
    if (!DocumentValidator.instance) {
      DocumentValidator.instance = new DocumentValidator();
    }
    return DocumentValidator.instance;
  }

  /**
   * Initialize native OCR (call once on app start for best performance)
   */
  async initializeNativeOcr(): Promise<boolean> {
    if (this.nativeOcrInitialized) {
      return this.nativeOcr.isAvailable();
    }
    this.nativeOcrInitialized = true;
    return await this.nativeOcr.initialize();
  }

  /**
   * Main validation method
   * @param file - The uploaded file
   * @param expectedDocTypeId - Optional expected document type from checklist
   * @returns Validation result with candidates and signals
   */
  async validate(file: File, expectedDocTypeId?: string): Promise<ValidationResult> {
    console.log(`[DocumentValidator] Validating: ${file.name} (${file.type}), expected: ${expectedDocTypeId || 'any'}`);

    // Ensure native OCR is initialized
    if (!this.nativeOcrInitialized) {
      await this.initializeNativeOcr();
    }

    // Collect all signals
    const metaSignals = await this.analyzeMetadata(file);
    const layoutSignals = await this.layoutAnalyzer.analyzeFile(file);
    let keywordSignals = await this.detectKeywords(file);

    // For images: Try native OCR if available
    if (!keywordSignals?.available && file.type.startsWith('image/')) {
      keywordSignals = await this.detectKeywordsWithNativeOcr(file);
    }

    const signals: ValidationSignals = {
      meta: metaSignals,
      layout: layoutSignals,
      keywords: keywordSignals
    };

    // Score all profiles
    const allProfiles = getAllProfiles();
    const candidates: ValidationCandidate[] = [];

    for (const profile of allProfiles) {
      const isExpected = expectedDocTypeId === profile.id;
      const { score, reasons } = this.calculateScore(profile, signals, isExpected);
      candidates.push({
        docTypeId: profile.id,
        confidence: score,
        reasons
      });
    }

    // Sort by confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Take top 3 candidates
    const topCandidates = candidates.slice(0, 3);

    // If expected type provided, boost it or check it
    let best = topCandidates[0];
    if (expectedDocTypeId) {
      const expectedCandidate = candidates.find(c => c.docTypeId === expectedDocTypeId);
      if (expectedCandidate) {
        // If expected type is in top 3 or has decent score, use it
        if (expectedCandidate.confidence >= 40 || topCandidates.some(c => c.docTypeId === expectedDocTypeId)) {
          best = expectedCandidate;
          // Ensure it's in top candidates
          if (!topCandidates.some(c => c.docTypeId === expectedDocTypeId)) {
            topCandidates.pop();
            topCandidates.push(expectedCandidate);
            topCandidates.sort((a, b) => b.confidence - a.confidence);
          }
        } else {
          // Expected type has very low score - add warning
          best.reasons.unshift(`Erwarteter Typ "${getDocumentProfile(expectedDocTypeId)?.label}" hat niedrige Übereinstimmung`);
        }
      }
    }

    // Determine confidence bucket and need for confirmation
    const confidenceBucket = this.getConfidenceBucket(best.confidence);
    const needsUserConfirmation = best.confidence < 80;

    // Generate status message
    const isImage = metaSignals.mimeType?.startsWith('image/') || false;
    const statusMessage = this.getStatusMessage(best.confidence, best.docTypeId, signals.keywords, isImage);

    const result: ValidationResult = {
      candidates: topCandidates,
      best,
      needsUserConfirmation,
      signals,
      confidenceBucket,
      statusMessage
    };

    console.log(`[DocumentValidator] Result: ${best.docTypeId} (${best.confidence}%), needs confirmation: ${needsUserConfirmation}, OCR: ${keywordSignals?.available ? 'yes' : 'no'}`);
    return result;
  }

  /**
   * Detect keywords using Native OCR (for images)
   * PRIVACY: Text is extracted, matched, then discarded
   */
  private async detectKeywordsWithNativeOcr(file: File): Promise<KeywordSignals | undefined> {
    if (!this.nativeOcr.isAvailable()) {
      console.log('[DocumentValidator] Native OCR not available');
      return { available: false, matchCountsByDocType: {}, source: 'none' };
    }

    try {
      console.log('[DocumentValidator] Attempting native OCR for image...');
      const detectedTexts = await this.nativeOcr.detectTextFromFile(file);

      if (!detectedTexts.length) {
        console.log('[DocumentValidator] Native OCR: No text detected');
        return { available: false, matchCountsByDocType: {}, source: 'native-ocr' };
      }

      // Match against all profiles
      const matchCountsByDocType: Record<string, number> = {};
      const allMatchedLabels: string[] = [];

      for (const profile of getAllProfiles()) {
        if (profile.keywordHints && profile.keywordHints.length > 0) {
          const result = this.nativeOcr.matchKeywords(detectedTexts, profile.keywordHints);
          matchCountsByDocType[profile.id] = result.matchCount;

          if (result.matchedLabels.length > 0) {
            allMatchedLabels.push(...result.matchedLabels.slice(0, 3));
          }
        }
      }

      console.log('[DocumentValidator] Native OCR: Keywords matched', matchCountsByDocType);

      return {
        available: true,
        matchCountsByDocType,
        matchedLabels: [...new Set(allMatchedLabels)].slice(0, 10),
        source: 'native-ocr'
      };
    } catch (error) {
      console.error('[DocumentValidator] Native OCR failed:', error);
      return { available: false, matchCountsByDocType: {}, source: 'native-ocr' };
    }
  }

  /**
   * Analyze file metadata
   */
  private async analyzeMetadata(file: File): Promise<MetadataSignals> {
    const sizeMB = file.size / (1024 * 1024);
    const mimeType = file.type;
    
    let pages: number | undefined;
    let dimensions: { width: number; height: number } | undefined;
    let orientation: 'portrait' | 'landscape' | undefined;
    let resolutionOk = true;

    // Extract PDF page count
    if (file.type === 'application/pdf' && window.pdfjsLib) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pages = pdf.numPages;
      } catch (e) {
        console.warn('[DocumentValidator] PDF page count failed:', e);
      }
    }

    // Get image dimensions
    if (file.type.startsWith('image/')) {
      try {
        const img = await this.loadImage(file);
        dimensions = { width: img.width, height: img.height };
        orientation = img.width > img.height ? 'landscape' : 'portrait';
        
        // Check resolution (minimum 500px on shortest side)
        const minDimension = Math.min(img.width, img.height);
        resolutionOk = minDimension >= 500;
      } catch (e) {
        console.warn('[DocumentValidator] Image dimension check failed:', e);
      }
    }

    // Check if file type is generally acceptable
    const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const fileTypeOk = acceptedTypes.includes(mimeType);

    return {
      fileTypeOk,
      mimeType,
      pages,
      sizeMB,
      resolutionOk,
      orientation,
      dimensions
    };
  }

  /**
   * Detect keywords from PDF text layer (NO OCR)
   * Only works for PDFs with embedded text, not scanned documents
   */
  private async detectKeywords(file: File): Promise<KeywordSignals | undefined> {
    // Only attempt for PDFs with text layer
    if (file.type !== 'application/pdf' || !window.pdfjsLib) {
      return undefined;
    }

    try {
      const text = await this.extractPdfText(file);
      
      // If no meaningful text, keyword detection not available
      if (!text || text.trim().length < 50) {
        return { available: false, matchCountsByDocType: {} };
      }

      // Normalize text for matching
      const normalizedText = text.toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss');

      // Match against all profiles
      const matchCountsByDocType: Record<string, number> = {};
      const allMatchedLabels: string[] = [];

      for (const profile of getAllProfiles()) {
        if (profile.keywordHints && profile.keywordHints.length > 0) {
          const matched = matchKeywords(normalizedText, profile.keywordHints);
          matchCountsByDocType[profile.id] = matched.length;
          
          // Track matched keyword labels (not raw text)
          if (matched.length > 0) {
            allMatchedLabels.push(...matched.slice(0, 3)); // Max 3 per profile
          }
        }
      }

      return {
        available: true,
        matchCountsByDocType,
        matchedLabels: [...new Set(allMatchedLabels)].slice(0, 10) // Max 10 unique labels
      };
    } catch (e) {
      console.warn('[DocumentValidator] Keyword detection failed:', e);
      return { available: false, matchCountsByDocType: {} };
    }
  }

  /**
   * Extract text from PDF using pdf.js
   */
  private async extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 5); // Only first 5 pages for performance
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return fullText;
  }

  /**
   * Calculate confidence score for a profile based on signals
   * Improved scoring with expected type bonus and image limitations
   */
  private calculateScore(
    profile: DocumentTypeProfile,
    signals: ValidationSignals,
    isExpectedType: boolean = false
  ): { score: number; reasons: string[] } {
    let score = 20; // Lower base score - must be earned
    const reasons: string[] = [];

    // === EXPECTED TYPE BONUS (+20) ===
    if (isExpectedType) {
      score += 20;
      reasons.push('Entspricht ausgewähltem Dokumenttyp');
    }

    // === METADATA SCORING (max +40 / -25 points) ===
    
    // File type match (+15 / -10)
    if (signals.meta.fileTypeOk && profile.acceptedFormats.includes(signals.meta.mimeType)) {
      score += 15;
    } else if (!signals.meta.fileTypeOk) {
      score -= 10;
      reasons.push('Dateityp nicht unterstützt');
    }

    // Page count match for PDFs (+15 / -5)
    if (signals.meta.pages !== undefined && profile.typicalPages) {
      if (signals.meta.pages >= profile.typicalPages.min && signals.meta.pages <= profile.typicalPages.max) {
        score += 15;
        reasons.push(`Seitenzahl passt (${signals.meta.pages})`);
      } else if (signals.meta.pages > profile.typicalPages.max * 2) {
        score -= 5;
        reasons.push(`Ungewöhnlich viele Seiten (${signals.meta.pages})`);
      }
    }

    // File size sanity (+10 / -5)
    if (profile.typicalFileSizeMB) {
      if (signals.meta.sizeMB >= profile.typicalFileSizeMB.min && signals.meta.sizeMB <= profile.typicalFileSizeMB.max) {
        score += 10;
      } else if (signals.meta.sizeMB > profile.typicalFileSizeMB.max * 3) {
        score -= 5;
        reasons.push('Datei ungewöhnlich gross');
      }
    }

    // Resolution check (-10)
    if (signals.meta.resolutionOk === false) {
      score -= 10;
      reasons.push('Bildauflösung zu niedrig');
    }

    // === LAYOUT SCORING (max +15 points, reduced from +35) ===
    
    if (profile.layoutHints) {
      const layout = signals.layout.detected;
      let layoutMatches = 0;
      
      // Table structure match
      if (profile.layoutHints.expectsTable && layout.tableLike) {
        layoutMatches++;
        reasons.push('Tabellenstruktur erkannt');
      }

      // Header block match
      if (profile.layoutHints.expectsHeaderBlock && layout.headerPlusBody) {
        layoutMatches++;
        reasons.push('Kopfzeile erkannt');
      }

      // Form fields match
      if (profile.layoutHints.expectsFormFields && layout.formLike) {
        layoutMatches++;
        reasons.push('Formularfelder erkannt');
      }

      // Dense text match (doesn't count toward layout matches)
      if (profile.layoutHints.expectsDenseText && layout.denseText) {
        score += 3;
      }

      // Add layout score: +5 per match, max +15
      score += Math.min(layoutMatches * 5, 15);
    }

    // === KEYWORD SCORING (max +40 points) ===
    
    if (signals.keywords?.available && profile.keywordHints) {
      const matchCount = signals.keywords.matchCountsByDocType[profile.id] || 0;
      
      if (matchCount >= 5) {
        score += 40;
        reasons.push(`Viele passende Begriffe gefunden (${matchCount})`);
      } else if (matchCount >= 3) {
        score += 25;
        reasons.push(`Passende Begriffe gefunden (${matchCount})`);
      } else if (matchCount >= 1) {
        score += 10;
        reasons.push(`Einige Begriffe gefunden (${matchCount})`);
      }

      // Negative keywords penalty
      if (profile.negativeKeywords) {
        const negativeMatches = signals.keywords.matchedLabels?.filter(
          label => profile.negativeKeywords!.includes(label.toLowerCase())
        ) || [];
        
        if (negativeMatches.length > 0) {
          score -= 20;
          reasons.push('Unpassende Begriffe gefunden');
        }
      }
    }

    // === IMAGE LIMITATION (cap at 50% if no keyword detection - honest limitation) ===
    const isImage = signals.meta.mimeType?.startsWith('image/');
    const hasKeywordDetection = signals.keywords?.available === true;
    
    if (isImage && !hasKeywordDetection) {
      // Cap at 50% - we cannot reliably validate images without OCR
      score = Math.min(score, 50);
      // Remove any reasons that suggest high confidence
      const filteredReasons = reasons.filter(r => 
        !r.includes('erkannt') && !r.includes('gefunden')
      );
      reasons.length = 0;
      reasons.push(...filteredReasons);
      
      // Add honest limitation message
      if (isExpectedType) {
        reasons.unshift('Ausgewählter Dokumenttyp');
      }
      reasons.push('Automatische Prüfung bei Bildern nicht möglich');
    }

    // Ensure score is within bounds
    score = Math.min(100, Math.max(0, score));

    // Add default reason if no specific reasons
    if (score >= 40 && reasons.length === 0) {
      reasons.push('Basierend auf Dateieigenschaften');
    }

    return { score, reasons };
  }

  /**
   * Get confidence bucket
   */
  private getConfidenceBucket(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  /**
   * Get human-readable status message
   */
  private getStatusMessage(confidence: number, docTypeId: string, keywords?: KeywordSignals, isImage?: boolean): string {
    const profile = getDocumentProfile(docTypeId);
    const label = profile?.label || 'Dokument';

    // Special message for images without OCR
    if (isImage && !keywords?.available) {
      return `Manuelle Prüfung erforderlich: ${label}`;
    }

    if (confidence >= 80) {
      if (keywords?.source === 'native-ocr') {
        return `Erkannt als: ${label} (via Texterkennung)`;
      }
      return `Erkannt als: ${label}`;
    } else if (confidence >= 50) {
      return `Möglicherweise: ${label} - bitte bestätigen`;
    } else {
      return `Unsicher - bitte Dokumenttyp prüfen`;
    }
  }

  /**
   * Load image from file
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }
}

export default DocumentValidator;
