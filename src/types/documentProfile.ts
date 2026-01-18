/**
 * Document Type Profile - Checklist-driven document validation configuration
 * 
 * PRIVACY FIRST: All validation happens locally on-device.
 * No document content, OCR text, or images are sent to any server.
 */

export interface LayoutHints {
  /** Document typically contains table structures (e.g., salary statements) */
  expectsTable?: boolean;
  /** Document contains form fields with boxes/checkboxes */
  expectsFormFields?: boolean;
  /** Document has a distinct header block (logo, address, title) */
  expectsHeaderBlock?: boolean;
  /** Document uses multi-column layout */
  expectsMultiColumn?: boolean;
  /** Document has dense text regions */
  expectsDenseText?: boolean;
  /** Document is typically a single-page statement */
  expectsSinglePage?: boolean;
}

export interface UserGuidance {
  /** Example description of what the document looks like */
  examplesText: string;
  /** Common mistakes users make when selecting this document type */
  commonMistakes: string[];
  /** Checklist items for user to verify the document */
  whatToCheck: string[];
}

export interface DocumentTypeProfile {
  /** Unique identifier matching checklist item IDs */
  id: string;
  /** Human-readable label in German */
  label: string;
  /** Optional longer description */
  description?: string;
  /** Accepted MIME types */
  acceptedFormats: string[];
  /** Expected page count range (for PDFs) */
  typicalPages?: { min: number; max: number };
  /** Expected orientation */
  typicalOrientation?: 'portrait' | 'landscape' | 'any';
  /** Expected file size in MB */
  typicalFileSizeMB?: { min: number; max: number };
  /** Keywords to look for (only used if PDF has text layer) */
  keywordHints?: string[];
  /** Keywords that indicate WRONG document type */
  negativeKeywords?: string[];
  /** Layout structure hints for visual analysis */
  layoutHints?: LayoutHints;
  /** User guidance for manual verification */
  userGuidance: UserGuidance;
  /** Category for grouping (income, assets, deductions, etc.) */
  category?: 'income' | 'assets' | 'deductions' | 'debts' | 'pension' | 'property' | 'other';
}

/**
 * Validation result for a single document type candidate
 */
export interface ValidationCandidate {
  /** Document type ID */
  docTypeId: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Human-readable reasons for the score */
  reasons: string[];
}

/**
 * Metadata signals from file analysis
 */
export interface MetadataSignals {
  /** File type matches expected formats */
  fileTypeOk: boolean;
  /** Detected MIME type */
  mimeType: string;
  /** Page count (for PDFs) */
  pages?: number;
  /** File size in MB */
  sizeMB: number;
  /** Image resolution is acceptable */
  resolutionOk?: boolean;
  /** Detected orientation */
  orientation?: 'portrait' | 'landscape';
  /** Image dimensions if applicable */
  dimensions?: { width: number; height: number };
}

/**
 * Layout analysis signals (no OCR required)
 */
export interface LayoutSignals {
  /** Overall layout match score 0-100 */
  layoutScore: number;
  /** Detected layout features */
  detected: {
    /** Document appears to have table structure */
    tableLike: boolean;
    /** Document has header + body pattern */
    headerPlusBody: boolean;
    /** Document uses multiple columns */
    columns: boolean;
    /** Document has form-like structure with fields */
    formLike: boolean;
    /** Document has dense text regions */
    denseText: boolean;
    /** Image has A4/Letter-like aspect ratio (1.2-1.7) */
    documentAspectRatio?: boolean;
    /** Image appears to be a screenshot (16:9, portrait phone) */
    screenshotPattern?: boolean;
    /** Image appears to be a logo (small, squarish) */
    logoPattern?: boolean;
    /** Image resolution is sufficient for a document */
    sufficientResolution?: boolean;
  };
}

/**
 * Optional keyword detection signals (PDF text layer or Native OCR)
 * PRIVACY: Only stores match counts and matched labels, never raw text
 */
export interface KeywordSignals {
  /** Whether keyword detection was available */
  available: boolean;
  /** Match counts per document type (no raw text stored) */
  matchCountsByDocType: Record<string, number>;
  /** Labels of matched keywords (for display, not raw text) */
  matchedLabels?: string[];
  /** Source of keyword detection */
  source?: 'pdf-text' | 'native-ocr' | 'cloud-ocr' | 'none';
}

/**
 * Complete validation signals combining all analysis methods
 */
export interface ValidationSignals {
  meta: MetadataSignals;
  layout: LayoutSignals;
  keywords?: KeywordSignals;
}

/**
 * Final validation result
 */
export interface ValidationResult {
  /** Top candidates sorted by confidence */
  candidates: ValidationCandidate[];
  /** Best matching candidate */
  best: ValidationCandidate;
  /** Whether user confirmation is required */
  needsUserConfirmation: boolean;
  /** All collected signals */
  signals: ValidationSignals;
  /** Confidence bucket for storage */
  confidenceBucket: 'high' | 'medium' | 'low';
  /** Overall status message */
  statusMessage: string;
}

/**
 * Storable validation decision (privacy-first - no document content)
 */
export interface ValidationDecision {
  documentId: string;
  selectedDocType: string;
  confidenceBucket: 'high' | 'medium' | 'low';
  userConfirmed: boolean;
  uploadedAt: Date;
}

/**
 * Progress callback for validation steps
 */
export interface ValidationProgress {
  step: 'preparing' | 'metadata' | 'layout' | 'compressing' | 'ocr' | 'analyzing' | 'complete';
  percent: number;
  message: string;
}

export type ValidationProgressCallback = (progress: ValidationProgress) => void;
