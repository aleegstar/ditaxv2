/**
 * Document Validator Service
 * 
 * Multi-signal document validation with LOCAL OCR priority.
 * Combines:
 * - Metadata analysis (file type, size, pages)
 * - Layout heuristics (visual structure detection)
 * - PDF text layer keyword detection
 * - Native OCR for mobile (iOS Vision / Android ML Kit)
 * - Tesseract.js for browser (100% local, DSGVO-konform)
 * 
 * PRIVACY: 
 * - PDFs: Local processing only
 * - Images: Local OCR (Tesseract.js or Native) - no data leaves device
 * - All results stored locally
 */

import { 
  DocumentTypeProfile, 
  ValidationSignals, 
  ValidationResult, 
  ValidationCandidate,
  MetadataSignals,
  KeywordSignals,
  ValidationProgressCallback
} from '@/types/documentProfile';
import { DOCUMENT_PROFILES, getDocumentProfile, getAllProfiles } from '@/config/documentProfiles';
import LayoutAnalyzer from './LayoutAnalyzer';
import NativeOcrService from './NativeOcrService';
import TesseractOcrService from './TesseractOcrService';
import TesseractWasmOcrService from './TesseractWasmOcrService';
import CloudOcrService from './CloudOcrService';
import { matchKeywords } from '@/utils/documentKeywords';
import { isMobileAppContext, isDesktopBrowser } from '@/utils/platform';

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
  private tesseractOcr: TesseractOcrService;
  private tesseractWasmOcr: TesseractWasmOcrService;
  private cloudOcr: CloudOcrService;
  private nativeOcrInitialized: boolean = false;
  private cloudOcrConsent: boolean = false;

  private constructor() {
    this.layoutAnalyzer = LayoutAnalyzer.getInstance();
    this.nativeOcr = NativeOcrService.getInstance();
    this.tesseractOcr = TesseractOcrService.getInstance();
    this.tesseractWasmOcr = TesseractWasmOcrService.getInstance();
    this.cloudOcr = CloudOcrService.getInstance();
  }

  /**
   * Set Cloud OCR consent (for mobile fallback)
   * User must explicitly opt-in to Cloud OCR due to DSGVO requirements
   */
  setCloudOcrConsent(consent: boolean): void {
    this.cloudOcrConsent = consent;
    console.log(`[DocumentValidator] Cloud OCR consent: ${consent}`);
  }

  /**
   * Check if Cloud OCR consent has been given
   */
  hasCloudOcrConsent(): boolean {
    return this.cloudOcrConsent;
  }

  /**
   * Check if Cloud OCR is available and has consent
   */
  isCloudOcrReady(): boolean {
    return this.cloudOcrConsent && this.cloudOcr.isAvailable();
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
   * @param onProgress - Optional callback for progress updates
   * @returns Validation result with candidates and signals
   */
  async validate(
    file: File, 
    expectedDocTypeId?: string,
    onProgress?: ValidationProgressCallback
  ): Promise<ValidationResult> {
    console.log(`[DocumentValidator] Validating: ${file.name} (${file.type}), expected: ${expectedDocTypeId || 'any'}`);

    // Step 1: Preparing
    onProgress?.({ step: 'preparing', percent: 5, message: 'Dokument wird vorbereitet...' });

    // Ensure native OCR is initialized
    if (!this.nativeOcrInitialized) {
      await this.initializeNativeOcr();
    }

    // Step 2: Metadata analysis
    onProgress?.({ step: 'metadata', percent: 15, message: 'Datei-Informationen werden analysiert...' });
    const metaSignals = await this.analyzeMetadata(file);

    // Step 3: Layout analysis
    onProgress?.({ step: 'layout', percent: 25, message: 'Dokumentstruktur wird erkannt...' });
    const layoutSignals = await this.layoutAnalyzer.analyzeFile(file);

    // Step 4: Keyword detection
    let keywordSignals = await this.detectKeywords(file);

    // For images: Use LOCAL OCR (Native on mobile, Tesseract.js in browser)
    // FALLBACK: Cloud OCR on mobile with explicit user consent
    // PRIVACY: Local processing preferred, cloud only with opt-in
    if (!keywordSignals?.available && file.type.startsWith('image/')) {
      // Debug logging for platform detection
      const platformInfo = {
        nativeOcrAvailable: this.nativeOcr.isAvailable(),
        isMobileApp: isMobileAppContext(),
        isDesktop: isDesktopBrowser(),
        userAgent: navigator.userAgent.substring(0, 100)
      };
      console.log('[DocumentValidator] Platform check:', platformInfo);
      
      // Check if Native OCR is available (= running on mobile with OCR support)
      if (this.nativeOcr.isAvailable()) {
        // Mobile: Native OCR (ML Kit / Vision / Despia) - 100% local
        console.log('[DocumentValidator] Using Native OCR');
        onProgress?.({ step: 'ocr', percent: 50, message: 'Text wird lokal erkannt...' });
        keywordSignals = await this.detectKeywordsWithNativeOcr(file);
      } else if (isDesktopBrowser() || !isMobileAppContext()) {
        // Browser (Desktop): Tesseract.js - 100% local, DSGVO-konform
        // Use explicit isDesktopBrowser() check as primary condition
        console.log('[DocumentValidator] Using Tesseract.js (desktop browser)');
        onProgress?.({ step: 'ocr', percent: 35, message: 'Text wird lokal erkannt...' });
        onProgress?.({ step: 'ocr', percent: 40, message: 'Alle Daten bleiben auf Ihrem Gerät' });
        
        keywordSignals = await this.detectKeywordsWithTesseract(file, (percent) => {
          // Map Tesseract progress (0-100) to our progress range (40-80)
          const mappedPercent = 40 + Math.round(percent * 0.4);
          onProgress?.({ step: 'ocr', percent: mappedPercent, message: 'Text wird lokal erkannt...' });
        });
        
        // If Tesseract failed to initialize, show fallback message
        if (!keywordSignals?.available) {
          console.log('[DocumentValidator] Tesseract OCR fehlgeschlagen, Fallback');
          onProgress?.({ step: 'ocr', percent: 80, message: 'Texterkennung nicht möglich - manuelle Prüfung' });
        }
      } else if (isMobileAppContext()) {
        // Mobile WebView: tesseract-wasm - optimized for WebViews, 100% local
        // This is the new fallback for mobile when native OCR is not available
        console.log('[DocumentValidator] Using tesseract-wasm (mobile WebView)');
        onProgress?.({ step: 'ocr', percent: 35, message: 'Text wird lokal erkannt...' });
        onProgress?.({ step: 'ocr', percent: 40, message: 'Alle Daten bleiben auf Ihrem Gerät' });
        
        keywordSignals = await this.detectKeywordsWithTesseractWasm(file, (percent) => {
          // Map progress (0-100) to our progress range (40-80)
          const mappedPercent = 40 + Math.round(percent * 0.4);
          onProgress?.({ step: 'ocr', percent: mappedPercent, message: 'Lokale OCR (WebView)...' });
        });
        
        // If tesseract-wasm failed, try Cloud OCR as last resort (if consented)
        if (!keywordSignals?.available && this.isCloudOcrReady()) {
          console.log('[DocumentValidator] tesseract-wasm failed, trying Cloud OCR (with consent)');
          onProgress?.({ step: 'ocr', percent: 60, message: 'Cloud-OCR wird verwendet...' });
          keywordSignals = await this.detectKeywordsWithCloudOcr(file, expectedDocTypeId);
        }
        
        // If all OCR methods failed, show fallback message
        if (!keywordSignals?.available) {
          console.log('[DocumentValidator] All OCR methods failed - manual confirmation required');
          onProgress?.({ step: 'ocr', percent: 80, message: 'Texterkennung nicht möglich - manuelle Prüfung' });
        }
      } else if (this.isCloudOcrReady()) {
        // Other context with Cloud OCR consent - use Cloud OCR
        // PRIVACY: User has explicitly consented to cloud processing
        console.log('[DocumentValidator] Using Cloud OCR (with consent)');
        onProgress?.({ step: 'ocr', percent: 35, message: 'Cloud-OCR wird verwendet...' });
        onProgress?.({ step: 'ocr', percent: 40, message: 'Bild wird verschlüsselt übertragen' });
        
        keywordSignals = await this.detectKeywordsWithCloudOcr(file, expectedDocTypeId);
      } else {
        // Unknown context without OCR - skip OCR, user must confirm manually
        console.log('[DocumentValidator] Unknown context without OCR capability - skipping OCR');
      }
      
      // Update progress after OCR
      onProgress?.({ step: 'ocr', percent: 80, message: 'OCR abgeschlossen...' });
    }

    // Step 5: Analyzing results
    onProgress?.({ step: 'analyzing', percent: 85, message: 'Dokumenttyp wird bestimmt...' });

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

    // Step 6: Complete
    onProgress?.({ step: 'complete', percent: 100, message: 'Prüfung abgeschlossen!' });

    console.log(`[DocumentValidator] Result: ${best.docTypeId} (${best.confidence}%), needs confirmation: ${needsUserConfirmation}, OCR: ${keywordSignals?.available ? 'yes' : 'no'}`);
    return result;
  }

  /**
   * Detect keywords using Tesseract.js (browser-based OCR)
   * PRIVACY: 100% local processing, no data sent to cloud
   * @param file - The image file to process
   * @param onProgress - Optional progress callback
   */
  private async detectKeywordsWithTesseract(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<KeywordSignals | undefined> {
    if (!this.tesseractOcr.isAvailable()) {
      console.log('[DocumentValidator] Tesseract OCR not available');
      return { available: false, matchCountsByDocType: {}, source: 'none' };
    }

    try {
      console.log('[DocumentValidator] Attempting Tesseract OCR for image (local)...');
      const detectedTexts = await this.tesseractOcr.detectTextFromFile(file, onProgress);

      if (!detectedTexts.length) {
        console.log('[DocumentValidator] Tesseract OCR: No text detected');
        return { available: false, matchCountsByDocType: {}, source: 'tesseract-ocr' };
      }

      // Match against all profiles
      const matchCountsByDocType: Record<string, number> = {};
      const allMatchedLabels: string[] = [];

      for (const profile of getAllProfiles()) {
        if (profile.keywordHints && profile.keywordHints.length > 0) {
          const result = this.tesseractOcr.matchKeywords(detectedTexts, profile.keywordHints);
          matchCountsByDocType[profile.id] = result.matchCount;

          if (result.matchedLabels.length > 0) {
            allMatchedLabels.push(...result.matchedLabels.slice(0, 3));
          }
        }
      }

      console.log('[DocumentValidator] Tesseract OCR: Keywords matched', matchCountsByDocType);

      return {
        available: true,
        matchCountsByDocType,
        matchedLabels: [...new Set(allMatchedLabels)].slice(0, 10),
        source: 'tesseract-ocr'
      };
    } catch (error) {
      console.error('[DocumentValidator] Tesseract OCR failed:', error);
      return { available: false, matchCountsByDocType: {}, source: 'tesseract-ocr' };
    }
  }

  /**
   * Detect keywords using tesseract-wasm (WebView-optimized OCR)
   * PRIVACY: 100% local processing, no data sent to cloud
   * @param file - The image file to process
   * @param onProgress - Optional progress callback
   */
  private async detectKeywordsWithTesseractWasm(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<KeywordSignals | undefined> {
    if (!this.tesseractWasmOcr.isAvailable()) {
      console.log('[DocumentValidator] tesseract-wasm not available');
      return { available: false, matchCountsByDocType: {}, source: 'none' };
    }

    try {
      console.log('[DocumentValidator] Attempting tesseract-wasm OCR for image (local)...');
      const detectedTexts = await this.tesseractWasmOcr.detectTextFromFile(file, onProgress);

      if (!detectedTexts.length) {
        console.log('[DocumentValidator] tesseract-wasm: No text detected');
        return { available: false, matchCountsByDocType: {}, source: 'tesseract-wasm' };
      }

      // Match against all profiles
      const matchCountsByDocType: Record<string, number> = {};
      const allMatchedLabels: string[] = [];

      for (const profile of getAllProfiles()) {
        if (profile.keywordHints && profile.keywordHints.length > 0) {
          const result = this.tesseractWasmOcr.matchKeywords(detectedTexts, profile.keywordHints);
          matchCountsByDocType[profile.id] = result.matchCount;

          if (result.matchedLabels.length > 0) {
            allMatchedLabels.push(...result.matchedLabels.slice(0, 3));
          }
        }
      }

      console.log('[DocumentValidator] tesseract-wasm: Keywords matched', matchCountsByDocType);
      console.log('[DocumentValidator] === WASM OCR DEBUG ===');
      console.log('[DocumentValidator] Matched labels:', [...new Set(allMatchedLabels)]);
      console.log('[DocumentValidator] Top profiles:', Object.entries(matchCountsByDocType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([id, count]) => `${id}: ${count}`)
        .join(', ')
      );
      console.log('[DocumentValidator] === END DEBUG ===');

      return {
        available: true,
        matchCountsByDocType,
        matchedLabels: [...new Set(allMatchedLabels)].slice(0, 10),
        source: 'tesseract-wasm'
      };
    } catch (error) {
      console.error('[DocumentValidator] tesseract-wasm failed:', error);
      return { available: false, matchCountsByDocType: {}, source: 'tesseract-wasm' };
    }
  }

  /**
   * Detect keywords using Native OCR (fallback for images)
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
   * Detect keywords using Cloud OCR (mobile fallback with user consent)
   * PRIVACY: 
   * - Images are compressed before upload (max 1MB)
   * - Only keyword matches are returned, never raw text
   * - Transient processing - no storage
   * - Requires explicit user consent (DSGVO)
   */
  private async detectKeywordsWithCloudOcr(
    file: File,
    expectedDocTypeId?: string
  ): Promise<KeywordSignals | undefined> {
    if (!this.cloudOcr.isAvailable()) {
      console.log('[DocumentValidator] Cloud OCR not available');
      return { available: false, matchCountsByDocType: {}, source: 'none' };
    }

    if (!this.cloudOcrConsent) {
      console.log('[DocumentValidator] Cloud OCR: No consent given');
      return { available: false, matchCountsByDocType: {}, source: 'cloud-ocr' };
    }

    try {
      console.log('[DocumentValidator] Attempting Cloud OCR for image (with consent)...');
      const result = await this.cloudOcr.extractKeywords(file, expectedDocTypeId);

      if (!result.available) {
        // Handle specific errors
        if (result.error === 'rate_limit') {
          console.warn('[DocumentValidator] Cloud OCR: Rate limit reached');
        } else if (result.error === 'credits_exhausted') {
          console.warn('[DocumentValidator] Cloud OCR: Credits exhausted');
        } else if (result.error === 'timeout') {
          console.warn('[DocumentValidator] Cloud OCR: Request timed out');
        }
        return { 
          available: false, 
          matchCountsByDocType: result.matchCountsByDocType || {}, 
          source: 'cloud-ocr' 
        };
      }

      console.log('[DocumentValidator] Cloud OCR: Keywords matched', result.matchCountsByDocType);

      return {
        available: true,
        matchCountsByDocType: result.matchCountsByDocType,
        matchedLabels: result.matchedKeywords.slice(0, 10),
        source: 'cloud-ocr'
      };
    } catch (error) {
      console.error('[DocumentValidator] Cloud OCR failed:', error);
      return { available: false, matchCountsByDocType: {}, source: 'cloud-ocr' };
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
   * 
   * NEW SCORING LOGIC (2025-01):
   * - For images with OCR: 80% OCR weight, 20% other signals
   * - For images without OCR: Max 40% score (requires manual confirmation)
   * - For PDFs: Traditional multi-signal scoring
   */
  private calculateScore(
    profile: DocumentTypeProfile,
    signals: ValidationSignals,
    isExpectedType: boolean = false
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const isImage = signals.meta.mimeType?.startsWith('image/');
    const hasOcrResults = signals.keywords?.available === true;
    const ocrMatchCount = signals.keywords?.matchCountsByDocType[profile.id] || 0;

    // =====================================================
    // === FÜR BILDER MIT OCR: 80% OCR + 20% andere ===
    // =====================================================
    if (isImage && hasOcrResults) {
      let ocrScore = 0;   // Max 80 Punkte
      let otherScore = 0; // Max 20 Punkte

      // === NEGATIVE KEYWORD PENALTY ===
      // Prüfe ob negative Keywords gefunden wurden (disqualifiziert den Dokumenttyp)
      let negativeMatchCount = 0;
      if (profile.negativeKeywords && profile.negativeKeywords.length > 0) {
        // Zähle wie viele negative Keywords im OCR-Text gefunden wurden
        const allProfiles = getAllProfiles();
        const allDetectedKeywords = signals.keywords.matchedLabels || [];
        
        // Prüfe jeden gefundenen Begriff gegen die negativen Keywords
        for (const detectedKeyword of allDetectedKeywords) {
          const normalizedDetected = detectedKeyword.toLowerCase();
          for (const negKeyword of profile.negativeKeywords) {
            if (normalizedDetected.includes(negKeyword.toLowerCase())) {
              negativeMatchCount++;
              break; // Zähle jeden gefundenen Begriff nur einmal
            }
          }
        }
        
        // Alternative: Prüfe auch den OCR-Text direkt
        // Sammle alle matched labels aller Profile
        for (const [docTypeId, matchCount] of Object.entries(signals.keywords.matchCountsByDocType)) {
          if (docTypeId !== profile.id && matchCount > 0) {
            // Wenn ein anderes Profil viele Matches hat, könnte es das richtige sein
            const otherProfile = allProfiles.find(p => p.id === docTypeId);
            if (otherProfile?.keywordHints) {
              // Prüfe ob dieses andere Profil Keywords hat, die für unser Profil negativ sind
              for (const otherKeyword of otherProfile.keywordHints.slice(0, 10)) { // Nur Top-Keywords prüfen
                if (profile.negativeKeywords.some(neg => 
                  otherKeyword.toLowerCase().includes(neg.toLowerCase()) ||
                  neg.toLowerCase().includes(otherKeyword.toLowerCase())
                )) {
                  negativeMatchCount++;
                }
              }
            }
          }
        }
      }

      // === OCR SCORING (80 Punkte max) ===
      // Angepasste Schwellenwerte für Mobile-OCR - tesseract-wasm erkennt oft weniger Keywords
      // als Desktop Tesseract, daher niedrigere Schwellen für hohe Scores
      const isMobileOcr = signals.keywords?.source === 'tesseract-wasm' || signals.keywords?.source === 'native-ocr';
      
      if (isMobileOcr) {
        // Ultra-mobile-optimierte Schwellenwerte
        // tesseract-wasm erkennt oft nur wenige Keywords - daher sehr niedrige Schwellen
        if (ocrMatchCount >= 3) {
          ocrScore = 80;  // 3 Keywords = Maximum (war: 4)
          reasons.push(`Passende Begriffe erkannt (${ocrMatchCount})`);
        } else if (ocrMatchCount >= 2) {
          ocrScore = 70;  // 2 Keywords = sehr gut (war: 55)
          reasons.push(`Passende Begriffe gefunden (${ocrMatchCount})`);
        } else if (ocrMatchCount >= 1) {
          ocrScore = 50;  // 1 Keyword = akzeptabel (war: 30)
          reasons.push(`Ein Begriff gefunden (${ocrMatchCount})`);
        } else {
          ocrScore = 0;
          reasons.push('Keine passenden Begriffe erkannt');
        }
      } else {
        // Desktop-Schwellenwerte (Tesseract.js erkennt mehr)
        if (ocrMatchCount >= 5) {
          ocrScore = 80;
          reasons.push(`Viele passende Begriffe gefunden (${ocrMatchCount})`);
        } else if (ocrMatchCount >= 4) {
          ocrScore = 70;
          reasons.push(`Passende Begriffe gefunden (${ocrMatchCount})`);
        } else if (ocrMatchCount >= 3) {
          ocrScore = 60;
          reasons.push(`Passende Begriffe gefunden (${ocrMatchCount})`);
        } else if (ocrMatchCount >= 2) {
          ocrScore = 40;
          reasons.push(`Einige Begriffe gefunden (${ocrMatchCount})`);
        } else if (ocrMatchCount >= 1) {
          ocrScore = 20;
          reasons.push(`Ein Begriff gefunden (${ocrMatchCount})`);
        } else {
          ocrScore = 0;
          reasons.push('Keine passenden Begriffe erkannt');
        }
      }

      // === NEGATIVE KEYWORD ABZUG ===
      // Pro negativem Keyword 15 Punkte Abzug (max 45 Punkte Abzug)
      if (negativeMatchCount > 0) {
        const penalty = Math.min(negativeMatchCount * 15, 45);
        ocrScore = Math.max(0, ocrScore - penalty);
        reasons.push(`Unpassende Begriffe gefunden (-${penalty})`);
      }

      // === OTHER SCORING (20 Punkte max) ===
      // Dateityp (max 10)
      if (signals.meta.fileTypeOk) {
        otherScore += 10;
      }

      // Layout (max 10)
      const layout = signals.layout.detected;
      if (layout.documentAspectRatio) {
        otherScore += 5;
      }
      if (layout.tableLike || layout.headerPlusBody) {
        otherScore += 5;
      }

      // === PATTERN-BASED PENALTIES ===
      if (layout.screenshotPattern) {
        otherScore -= 10;
        reasons.push('⚠️ Erscheint wie ein Screenshot');
      }
      if (layout.logoPattern) {
        otherScore -= 15;
        reasons.push('⚠️ Erscheint nicht wie ein Dokument');
      }

      // === EXPECTED TYPE INDICATOR (kein Score-Bonus, nur Info) ===
      if (isExpectedType && ocrMatchCount >= 1) {
        reasons.unshift('Entspricht ausgewähltem Dokumenttyp');
      }

      // Finaler Score
      const finalScore = Math.min(100, Math.max(0, ocrScore + otherScore));
      
      // Bei 0 OCR-Matches aber Expected Type: Warnung hinzufügen
      if (ocrMatchCount === 0 && isExpectedType) {
        reasons.push('Möglicherweise falsches Dokument');
      }

      return { score: finalScore, reasons };
    }

    // =====================================================
    // === FÜR BILDER OHNE OCR: Max 40% ===
    // =====================================================
    if (isImage && !hasOcrResults) {
      let score = 0;
      const layout = signals.layout.detected;

      // Layout-basierte Bewertung (max 30)
      if (layout.documentAspectRatio) {
        score += 15;
        reasons.push('Dokumentformat erkannt (A4-ähnlich)');
      }
      if (layout.tableLike) {
        score += 10;
        reasons.push('Tabellenstruktur erkannt');
      }
      if (layout.headerPlusBody) {
        score += 5;
      }

      // Expected type gibt kleine Bonuspunkte (max 10)
      if (isExpectedType) {
        score += 10;
        reasons.push('Ausgewählter Dokumenttyp');
      }

      // Pattern-Penalties
      if (layout.screenshotPattern) {
        score -= 20;
        reasons.push('⚠️ Erscheint wie ein Screenshot');
      }
      if (layout.logoPattern) {
        score -= 25;
        reasons.push('⚠️ Erscheint nicht wie ein Dokument');
      }

      // Cap bei 40% - immer manuelle Bestätigung erforderlich
      score = Math.min(Math.max(0, score), 40);

      // Klare Warnung hinzufügen
      reasons.push('Texterkennung nicht verfügbar');
      reasons.push('Manuelle Bestätigung erforderlich');

      return { score, reasons };
    }

    // =====================================================
    // === FÜR PDFs: Traditionelles Multi-Signal Scoring ===
    // =====================================================
    let score = 15; // Niedriger Base Score
    
    // === EXPECTED TYPE BONUS (+15) ===
    if (isExpectedType) {
      score += 15;
      reasons.push('Entspricht ausgewähltem Dokumenttyp');
    }

    // === METADATA SCORING (max +35) ===
    
    // File type match (+10)
    if (signals.meta.fileTypeOk && profile.acceptedFormats.includes(signals.meta.mimeType)) {
      score += 10;
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

    // === LAYOUT SCORING (max +15) ===
    if (profile.layoutHints) {
      const layout = signals.layout.detected;
      let layoutMatches = 0;
      
      if (profile.layoutHints.expectsTable && layout.tableLike) {
        layoutMatches++;
        reasons.push('Tabellenstruktur erkannt');
      }
      if (profile.layoutHints.expectsHeaderBlock && layout.headerPlusBody) {
        layoutMatches++;
        reasons.push('Kopfzeile erkannt');
      }
      if (profile.layoutHints.expectsFormFields && layout.formLike) {
        layoutMatches++;
        reasons.push('Formularfelder erkannt');
      }

      score += Math.min(layoutMatches * 5, 15);
    }

    // === KEYWORD SCORING für PDFs (max +45) ===
    if (signals.keywords?.available && profile.keywordHints) {
      const matchCount = signals.keywords.matchCountsByDocType[profile.id] || 0;
      
      if (matchCount >= 5) {
        score += 45;
        reasons.push(`Viele passende Begriffe gefunden (${matchCount})`);
      } else if (matchCount >= 3) {
        score += 30;
        reasons.push(`Passende Begriffe gefunden (${matchCount})`);
      } else if (matchCount >= 1) {
        score += 15;
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

    // Check for 0 OCR matches on images with OCR
    if (isImage && keywords?.available) {
      const matchCount = keywords.matchCountsByDocType[docTypeId] || 0;
      if (matchCount === 0) {
        return `Keine Übereinstimmung gefunden - falsches Dokument?`;
      }
    }

    if (confidence >= 80) {
      if (keywords?.source === 'tesseract-ocr' || keywords?.source === 'native-ocr') {
        return `Erkannt als: ${label} (via lokale Texterkennung)`;
      }
      return `Erkannt als: ${label}`;
    } else if (confidence >= 50) {
      return `Möglicherweise: ${label} - bitte bestätigen`;
    } else if (confidence >= 20) {
      return `Geringe Übereinstimmung mit: ${label}`;
    } else {
      return `Keine Übereinstimmung - bitte Dokumenttyp prüfen`;
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
