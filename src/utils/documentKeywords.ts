/**
 * Document keyword definitions for OCR verification
 * Used to validate if an uploaded document matches the expected document type
 */

export interface DocumentKeywordConfig {
  keywords: string[];
  minMatchCount: number;
  confidence: 'high' | 'medium' | 'low';
  displayName: string;
}

export const DOCUMENT_KEYWORDS: Record<string, DocumentKeywordConfig> = {
  'tax-cover-sheet': {
    keywords: ['steuererklärung', 'deckblatt', 'steueramt', 'kantonales', 'gemeinde', 'steuerpflichtige'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Deckblatt der Steuererklärung'
  },
  'employment-income': {
    keywords: ['lohnausweis', 'arbeitgeber', 'bruttolohn', 'nettolohn', 'ahv', 'sozialversicherung', 'quellensteuer', 'bvg', 'pensionskasse', 'lohn', 'gehalt', 'einkommen'],
    minMatchCount: 3,
    confidence: 'high',
    displayName: 'Lohnausweis'
  },
  'rental-income': {
    keywords: ['mieteinnahmen', 'miete', 'mietzins', 'vermieter', 'liegenschaft', 'mietertrag', 'mietvertrag', 'monatsmiete'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Mieteinnahmen-Belege'
  },
  'dividend-statement': {
    keywords: ['dividende', 'aktie', 'kapitalertrag', 'verrechnungssteuer', 'rendite', 'ausschüttung', 'wertpapier'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Dividenden-Bescheinigung'
  },
  'freelance-income': {
    keywords: ['selbständig', 'honorar', 'freiberuflich', 'rechnung', 'auftraggeber', 'gewinn', 'verlust', 'buchhaltung'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Selbständigeneinkommen'
  },
  'pension-statement': {
    keywords: ['rente', 'ahv', 'iv', 'altersrente', 'sozialversicherung', 'rentenbescheinigung', 'pension'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Rentenausweis'
  },
  'gift-inheritance': {
    keywords: ['schenkung', 'erbschaft', 'erbe', 'vermächtnis', 'nachlass', 'testament'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Schenkungen/Erbschaften-Belege'
  },
  'pension-payout': {
    keywords: ['pensionskasse', 'kapitalauszahlung', 'freizügigkeit', 'vorsorge', 'bvg', 'austritt'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Pensionskassenauszahlung'
  },
  'other-income': {
    keywords: ['taggeld', 'stipendium', 'unterstützung', 'einkommen', 'elo', 'arbeitslosengeld'],
    minMatchCount: 1,
    confidence: 'low',
    displayName: 'Weitere Einkommen'
  },
  'bank-account-statement': {
    keywords: ['saldo', 'kontostand', 'zins', 'habenzins', 'konto', 'bank', 'iban', 'sparkonto', 'privatkonto', 'saldobescheinigung', 'zinsbescheinigung'],
    minMatchCount: 3,
    confidence: 'high',
    displayName: 'Zins- und Saldobescheinigung'
  },
  'deposit-account': {
    keywords: ['depot', 'wertschriften', 'aktie', 'obligation', 'fonds', 'portfolio', 'depotauszug', 'vermögenswerte'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Depotauszug'
  },
  'crypto-portfolio': {
    keywords: ['bitcoin', 'ethereum', 'kryptowährung', 'crypto', 'wallet', 'blockchain', 'token'],
    minMatchCount: 1,
    confidence: 'high',
    displayName: 'Kryptowährungsnachweis'
  },
  'mortgage-statement': {
    keywords: ['hypothek', 'zinssatz', 'liegenschaft', 'grundpfand', 'hypothekarzins', 'amortisation', 'schuldzins'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Hypotheken-Dokumente'
  },
  'debt-statements': {
    keywords: ['schuld', 'darlehen', 'kredit', 'rückzahlung', 'zins', 'gläubiger', 'schuldner'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Schuldscheine'
  },
  'other-assets': {
    keywords: ['vermögen', 'besitz', 'wert', 'anlage', 'investition'],
    minMatchCount: 1,
    confidence: 'low',
    displayName: 'Andere Vermögenswerte'
  },
  'pillar3a-certificate': {
    keywords: ['säule 3a', '3a', 'vorsorge', 'einzahlung', 'steuerbescheinigung', 'einzahlungsbestätigung', 'gebundene vorsorge'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Säule 3a Bescheinigung'
  },
  'bvg-purchase': {
    keywords: ['bvg', 'einkauf', 'pensionskasse', 'vorsorge', 'einzahlung', '2. säule'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'BVG-Einkauf'
  },
  'education-expenses': {
    keywords: ['weiterbildung', 'ausbildung', 'kurs', 'studium', 'schulung', 'fortbildung', 'bildungskosten'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Bildungskosten'
  },
  'donation-receipts': {
    keywords: ['spende', 'gemeinnützig', 'donation', 'beitrag', 'hilfswerk', 'stiftung', 'spendenbestätigung'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Spendenbelege'
  },
  'maintenance-receipts': {
    keywords: ['unterhalt', 'renovation', 'reparatur', 'liegenschaft', 'instandhaltung', 'handwerker'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Liegenschaftsunterhalt'
  },
  'childcare-expenses': {
    keywords: ['kinderbetreuung', 'krippe', 'kita', 'hort', 'tagesmutter', 'betreuungskosten'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Kinderbetreuungskosten'
  },
  'supported-persons': {
    keywords: ['unterstützung', 'unterstützte person', 'bedürftig', 'beistand'],
    minMatchCount: 1,
    confidence: 'low',
    displayName: 'Unterstützte Personen'
  },
  'maintenance-payments': {
    keywords: ['alimenten', 'unterhaltszahlung', 'alimente', 'scheidung', 'kindesunterhalt', 'ehegattenunterhalt'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Unterhaltszahlungen'
  },
  'other-deductions': {
    keywords: ['abzug', 'beleg', 'ausgabe', 'kosten'],
    minMatchCount: 1,
    confidence: 'low',
    displayName: 'Andere Abzüge'
  }
};

/**
 * Get keywords configuration for a document type
 */
export function getDocumentKeywords(documentId: string): DocumentKeywordConfig | null {
  return DOCUMENT_KEYWORDS[documentId] || null;
}

/**
 * Check if keywords match in extracted text
 */
export function matchKeywords(text: string, keywords: string[]): string[] {
  const normalizedText = text.toLowerCase();
  return keywords.filter(keyword => normalizedText.includes(keyword.toLowerCase()));
}
