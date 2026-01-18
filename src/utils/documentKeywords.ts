/**
 * Document keyword configuration for local OCR verification
 * 
 * DSGVO-KONFORM: Diese Keywords werden NUR lokal im Browser verwendet.
 * Es werden KEINE Daten an externe Server gesendet.
 */

export interface DocumentKeywordConfig {
  keywords: string[];
  minMatchCount: number;
  confidence: 'high' | 'medium' | 'low';
  displayName: string;
}

/**
 * Keywords for each document type
 * These are matched against text extracted locally from PDFs
 */
export const DOCUMENT_KEYWORDS: Record<string, DocumentKeywordConfig> = {
  // === STEUERERKLÄRUNG GRUNDLAGEN ===
  'tax-cover-sheet': {
    keywords: ['steuererklärung', 'steuerjahr', 'kanton', 'gemeinde', 'steuerpflichtig', 'deklaration', 'einreichung', 'deckblatt', 'steueramt'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Steuererklärungs-Deckblatt'
  },
  
  // === EINKOMMEN ===
  'employment-income': {
    keywords: [
      // Deutsche Begriffe
      'lohnausweis', 'arbeitgeber', 'bruttolohn', 'nettolohn', 'ahv', 'sozialabzüge', 
      'quellensteuer', 'lohnabrechnung', 'arbeitsvertrag', 'gehalt', 'monatslohn', 
      'jahreslohn', 'bvg', 'pensionskasse',
      // Formular 11 spezifische Begriffe
      'gehaltsnebenleistungen', 'kapitalauszahlung', 'berufliche vorsorge',
      'nettolohn/rente', 'beiträge', 'rentenbescheinigung', 'unentgeltliche beförderung',
      'spesenerstattung', 'privatanteil', 'weitere gehaltsnebenleistungen',
      'formular 11', 'form. 11', 'form 11', 'lohnbescheinigung',
      // Mehrsprachige Begriffe (CH)
      'certificat de salaire', 'salaire', 'salario', 'rente', 'rendita',
      // Weitere häufige Begriffe
      'arbeitnehmer', 'anstellung', 'lohn', 'einkommen', 'beschäftigung',
      // Generische Begriffe für Screenshot-OCR (häufig erkannt)
      'chf', 'franken', 'total', 'betrag', 'jahr', 'monat', 'name', 'adresse',
      'sozialversicherung', 'svnr', 'nr', 'datum', 'unterschrift', 'stempel',
      '2023', '2024', '2025', '2026', 'januar', 'februar', 'dezember',
      'abzug', 'abzüge', 'brutto', 'netto', 'auszahlung', 'konto'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Lohnausweis'
  },
  
  'self-employment-income': {
    keywords: ['selbständig', 'einzelfirma', 'freiberuflich', 'honorar', 'geschäftsertrag', 'betriebsgewinn', 'umsatz', 'gewinn', 'verlust', 'buchhaltung'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Einkommen aus Selbständigkeit'
  },
  
  'freelance-income': {
    keywords: ['selbständig', 'honorar', 'freiberuflich', 'rechnung', 'auftraggeber', 'gewinn', 'verlust', 'buchhaltung'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Selbständigeneinkommen'
  },
  
  'pension-income': {
    keywords: [
      // Basis-Keywords
      'rente', 'pension', 'altersrente', 'ahv-rente', 'iv-rente', 'pensionskasse', 'bvg', 'vorsorge', 'altersleistung', 'ruhegehalt',
      // Schweizer Institutionen
      'ausgleichskasse', 'sva', 'sozialversicherungsanstalt', 'compenswiss', 'publica',
      // Rentenarten
      'witwenrente', 'waisenrente', 'kinderrente', 'ergänzungsleistung', 'hilflosenentschädigung',
      // Begriffe auf Bescheinigungen
      'jahresrente', 'monatsrente', 'rentenbescheid', 'rentenausweis', 'rentner'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Rentenbescheinigung'
  },
  
  'pension-statement': {
    keywords: ['rente', 'ahv', 'iv', 'altersrente', 'sozialversicherung', 'rentenbescheinigung', 'pension'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Rentenausweis'
  },
  
  'unemployment-income': {
    keywords: ['arbeitslosenkasse', 'alv', 'arbeitslosenentschädigung', 'taggelder', 'rav', 'arbeitslos', 'erwerbsausfall'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Arbeitslosenentschädigung'
  },
  
  'rental-income': {
    keywords: ['mieteinnahmen', 'mietzins', 'vermietung', 'mieter', 'mietvertrag', 'liegenschaftsertrag', 'nettomiete', 'monatsmiete'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Mieteinnahmen-Nachweis'
  },
  
  'dividend-statement': {
    keywords: ['dividende', 'aktie', 'kapitalertrag', 'verrechnungssteuer', 'rendite', 'ausschüttung', 'wertpapier'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Dividenden-Bescheinigung'
  },
  
  'gift-inheritance': {
    keywords: ['schenkung', 'erbschaft', 'erbe', 'vermächtnis', 'nachlass', 'testament', 'erbschaftssteuer'],
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
  
  // === VORSORGE ===
  'pillar3a-certificate': {
    keywords: [
      // Basis-Keywords
      'säule 3a', '3a', 'vorsorge', 'steuerbegünstigt', 'einzahlung', 'freizügigkeit', 'vorsorgekonto', 'gebundene vorsorge', 'steuererklärung', 'steuerbescheinigung',
      // Schweizer Anbieter
      'swisscanto', 'viac', 'frankly', 'finpension', 'liberty', 'axa', 'mobiliar', 'zurich', 'swiss life', 'baloise',
      // Produktbezeichnungen
      'vorsorgesparen', 'vorsorgepolice', 'sparversicherung', 'wertschriftenlösung', 'fondslösung',
      // Steuer-Begriffe
      'steuerbescheinigung', 'steuerabzug', 'maximaleinzahlung', 'abzugsfähig'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Säule 3a Bescheinigung'
  },
  
  'pillar2-statement': {
    keywords: [
      // Basis-Keywords
      'pensionskasse', 'bvg', '2. säule', 'vorsorgeausweis', 'altersguthaben', 'freizügigkeit', 'deckungskapital', 'risikoleistung',
      // Schweizer PKs und Sammelstiftungen
      'publica', 'pkbs', 'bpk', 'asga', 'vita', 'axa', 'swiss life', 'bâloise', 'pax', 'helvetia', 'migros', 'coop',
      // Vorsorge-Begriffe
      'umwandlungssatz', 'koordinationsabzug', 'versicherter lohn', 'sparguthaben', 'invalidenrente', 'altersleistung',
      // Dokumentbegriffe
      'jahresausweis', 'versicherungsausweis', 'projektion', 'vorbezug', 'wohneigentum'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Pensionskassenausweis'
  },
  
  'pillar2-buyin': {
    keywords: ['einkauf', 'pensionskasse', 'bvg', 'nachzahlung', 'einkaufspotential', 'freiwilliger einkauf'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'PK-Einkaufsbeleg'
  },
  
  'bvg-purchase': {
    keywords: ['bvg', 'einkauf', 'pensionskasse', 'vorsorge', 'einzahlung', '2. säule'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'BVG-Einkauf'
  },
  
  // === VERMÖGEN & KAPITALERTRÄGE ===
  'bank-account-statement': {
    keywords: [
      // Basis-Keywords
      'kontoauszug', 'bank', 'saldo', 'guthaben', 'zinsen', 'konto', 'sparen', 'vermögen', 'iban', 'saldobescheinigung', 'zinsbescheinigung',
      // Zins-Varianten
      'zins', 'zinsabschluss', 'habenzins', 'bruttozins', 'nettozins', 'zinsertrag',
      // Konto-Varianten
      'kontostand', 'kontosaldo', 'privatkonto', 'sparkonto', 'girokonto',
      // Schweizer Banken
      'postfinance', 'raiffeisen', 'ubs', 'credit suisse', 'zkb', 'kantonalbank',
      // Buchungsbegriffe
      'gutschrift', 'lastschrift', 'valuta', 'buchung',
      // Jahresabschluss
      'jahresabschluss', 'stichtag', '31.12', 'per ende jahr'
    ],
    minMatchCount: 3,
    confidence: 'high',
    displayName: 'Zins- und Saldobescheinigung'
  },
  
  'bank-statements': {
    keywords: [
      // Basis-Keywords
      'kontoauszug', 'bank', 'saldo', 'guthaben', 'zinsen', 'konto', 'sparen', 'vermögen', 'depot', 'wertschriften',
      // Schweizer Banken
      'postfinance', 'raiffeisen', 'ubs', 'credit suisse', 'zkb', 'kantonalbank', 'migros bank', 'cler',
      // Konto-Begriffe
      'jahresabschluss', 'kontostand', 'bewegungen', 'transaktionen', 'umsatz'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Bankauszug'
  },
  
  'deposit-account': {
    keywords: [
      // Basis-Keywords
      'depot', 'wertschriften', 'aktie', 'obligation', 'fonds', 'portfolio', 'depotauszug', 'vermögenswerte',
      // Wertpapier-Begriffe
      'isin', 'valor', 'kurswert', 'stückzahl', 'anteile', 'nennwert', 'marchzins',
      // Fonds und ETFs
      'etf', 'anlagefonds', 'indexfonds', 'swisscanto', 'ubs fund', 'credit suisse fund',
      // Börse
      'six', 'börse', 'nasdaq', 'nyse', 'kurs', 'performance'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Depotauszug'
  },
  
  'securities-statement': {
    keywords: [
      // Basis-Keywords
      'wertschriften', 'depot', 'aktien', 'obligationen', 'fonds', 'dividende', 'kursgewinn', 'vermögensaufstellung', 'portfolio',
      // Wertpapier-Begriffe
      'isin', 'valor', 'steuerwert', 'kurswert', 'verrechnungssteuer', 'bruttodividende',
      // Schweizer Börse
      'six swiss exchange', 'smi', 'swiss market index',
      // Dokumentbegriffe
      'steuerverzeichnis', 'jahresabschluss', 'ertragsübersicht'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Wertschriftenverzeichnis'
  },
  
  'crypto-portfolio': {
    keywords: [
      // Basis-Keywords
      'bitcoin', 'ethereum', 'kryptowährung', 'crypto', 'wallet', 'blockchain', 'token',
      // Weitere Kryptos
      'btc', 'eth', 'bnb', 'xrp', 'cardano', 'solana', 'polkadot', 'avalanche', 'usdt', 'usdc',
      // Exchanges
      'binance', 'kraken', 'coinbase', 'bitpanda', 'swissborg', 'bitcoin suisse',
      // Begriffe
      'staking', 'defi', 'nft', 'ledger', 'metamask', 'kurs', 'portfolio'
    ],
    minMatchCount: 1,
    confidence: 'high',
    displayName: 'Kryptowährungsnachweis'
  },
  
  'interest-income': {
    keywords: ['zinsen', 'zinsertrag', 'sparzinsen', 'obligationenzinsen', 'kapitalertrag', 'verrechnungssteuer'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Zinsausweis'
  },
  
  'dividend-income': {
    keywords: ['dividende', 'ausschüttung', 'gewinnanteil', 'aktienertrag', 'verrechnungssteuer', 'kapitalertrag'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Dividendenausweis'
  },
  
  // === IMMOBILIEN ===
  'property-tax-value': {
    keywords: ['steuerwert', 'liegenschaft', 'immobilie', 'grundstück', 'eigenmietwert', 'kataster', 'gebäude', 'amtlicher wert'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Liegenschafts-Steuerwert'
  },
  
  'mortgage-statement': {
    keywords: [
      // Basis-Keywords
      'hypothek', 'zinssatz', 'liegenschaft', 'grundpfand', 'hypothekarzins', 'amortisation', 'schuldzins',
      // Hypothekarprodukte
      'festhypothek', 'saron', 'libor', 'variable hypothek', 'rahmenkredit',
      // Schweizer Banken
      'postfinance', 'raiffeisen', 'ubs', 'credit suisse', 'zkb', 'kantonalbank',
      // Begriffe
      'tragbarkeit', 'schuldbrief', 'grundbuch', 'restschuld', 'zinsabrechnung', 'darlehen'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Hypotheken-Dokumente'
  },
  
  'mortgage-interest': {
    keywords: [
      // Basis-Keywords
      'hypothek', 'hypothekarzinsen', 'schuldzinsen', 'darlehen', 'finanzierung', 'liegenschaft', 'zinsausweis',
      // Zins-Begriffe
      'jahreszins', 'zinsbelastung', 'zinsabrechnung', 'zinsaufwand',
      // Hypothekarprodukte
      'festhypothek', 'saron', 'variable', 'rahmenkredit',
      // Schweizer Banken
      'postfinance', 'raiffeisen', 'ubs', 'credit suisse', 'zkb', 'kantonalbank'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Hypothekarzins-Bescheinigung'
  },
  
  'property-maintenance': {
    keywords: ['unterhaltskosten', 'renovation', 'reparatur', 'instandhaltung', 'liegenschaft', 'nebenkosten', 'hauswart'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Liegenschaftsunterhalts-Belege'
  },
  
  'maintenance-receipts': {
    keywords: ['unterhalt', 'renovation', 'reparatur', 'liegenschaft', 'instandhaltung', 'handwerker'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Liegenschaftsunterhalt'
  },
  
  // === ABZÜGE ===
  'health-insurance': {
    keywords: [
      // Basis-Keywords
      'krankenkasse', 'krankenversicherung', 'prämie', 'grundversicherung', 'zusatzversicherung', 'kvg', 'franchise',
      // Schweizer Krankenkassen
      'css', 'helsana', 'swica', 'concordia', 'sanitas', 'visana', 'atupri', 'groupe mutuel', 'assura', 'kpt', 'oks', 'sympany',
      // Versicherungsbegriffe
      'jahresprämie', 'monatsprämie', 'prämienbestätigung', 'prämienbescheinigung', 'steuerbescheinigung',
      // Produkte
      'unfallversicherung', 'spitalversicherung', 'zahnversicherung', 'selbstbehalt'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Krankenkassen-Prämiennachweis'
  },
  
  'medical-expenses': {
    keywords: ['arztrechnung', 'medizinisch', 'krankheitskosten', 'selbstbehalt', 'zahnarzt', 'spital', 'therapie', 'medikamente'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Krankheitskosten-Belege'
  },
  
  'education-expenses': {
    keywords: ['weiterbildung', 'ausbildung', 'kurs', 'studium', 'schule', 'bildung', 'fortbildung', 'seminar', 'diplom', 'schulung', 'bildungskosten'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Weiterbildungskosten-Belege'
  },
  
  'commuting-expenses': {
    keywords: [
      // Basis-Keywords
      'arbeitsweg', 'pendler', 'ga', 'halbtax', 'fahrkosten', 'öv', 'abonnement', 'berufsauslagen',
      // Schweizer ÖV
      'sbb', 'zvv', 'bls', 'rhb', 'sob', 'tpf', 'tpg', 'vbl', 'bernmobil', 'basler verkehrsbetriebe', 'vbz',
      // Abos
      'streckenabo', 'verbundabo', 'monatsabo', 'jahresabo', 'mobility', 'publibike',
      // Begriffe
      'fahrausweis', 'billett', 'swisspass', 'bahncard', 'tageskarte'
    ],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Fahrkosten-Belege'
  },
  
  'childcare-expenses': {
    keywords: [
      // Basis-Keywords
      'kinderbetreuung', 'kita', 'krippe', 'hort', 'tagesmutter', 'betreuungskosten', 'drittbetreuung',
      // Betreuungsformen
      'kindertagesstätte', 'tagesschule', 'mittagstisch', 'spielgruppe', 'tagesfamilie', 'nanny',
      // Begriffe
      'betreuungsgutschein', 'subvention', 'elternbeitrag', 'betreuungstage', 'jahresabrechnung',
      // Weitere
      'vorschule', 'nachmittagsbetreuung', 'ferienbetreuung'
    ],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Kinderbetreuungskosten-Belege'
  },
  
  'donation-receipts': {
    keywords: ['spende', 'gemeinnützig', 'stiftung', 'hilfswerk', 'donation', 'zuwendung', 'steuerabzug', 'spendenquittung', 'spendenbestätigung'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Spendenbelege'
  },
  
  'charitable-donations': {
    keywords: ['spende', 'gemeinnützig', 'stiftung', 'hilfswerk', 'donation', 'zuwendung', 'steuerabzug', 'spendenquittung'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Spendenbescheinigung'
  },
  
  'supported-persons': {
    keywords: ['unterstützung', 'unterstützte person', 'bedürftig', 'beistand'],
    minMatchCount: 1,
    confidence: 'low',
    displayName: 'Unterstützte Personen'
  },
  
  // === SCHULDEN ===
  'debt-statement': {
    keywords: ['schulden', 'darlehen', 'kredit', 'verbindlichkeit', 'leasing', 'rückzahlung', 'restschuld'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Schuldenverzeichnis'
  },
  
  'debt-statements': {
    keywords: ['schuld', 'darlehen', 'kredit', 'rückzahlung', 'zins', 'gläubiger', 'schuldner'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Schuldscheine'
  },
  
  'alimony-payments': {
    keywords: ['alimente', 'unterhalt', 'scheidung', 'trennung', 'kindesunterhalt', 'ehegattenunterhalt'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Alimenten-Zahlungsnachweis'
  },
  
  'maintenance-payments': {
    keywords: ['alimenten', 'unterhaltszahlung', 'alimente', 'scheidung', 'kindesunterhalt', 'ehegattenunterhalt'],
    minMatchCount: 2,
    confidence: 'high',
    displayName: 'Unterhaltszahlungen'
  },
  
  // === SONSTIGE ===
  'foreign-income': {
    keywords: ['ausland', 'grenzgänger', 'quellensteuer', 'doppelbesteuerung', 'ausländisch', 'fremdwährung'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Ausländische Einkünfte'
  },
  
  'inheritance-gift': {
    keywords: ['erbschaft', 'schenkung', 'nachlass', 'erbe', 'vermächtnis', 'erbschaftssteuer'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Erbschafts-/Schenkungsnachweis'
  },
  
  'lottery-winnings': {
    keywords: ['lotterie', 'gewinn', 'swisslos', 'casino', 'spielgewinn', 'glücksspiel'],
    minMatchCount: 2,
    confidence: 'medium',
    displayName: 'Lotteriegewinn-Nachweis'
  },
  
  'other-assets': {
    keywords: ['vermögen', 'besitz', 'wert', 'anlage', 'investition'],
    minMatchCount: 1,
    confidence: 'low',
    displayName: 'Andere Vermögenswerte'
  },
  
  'other-deductions': {
    keywords: ['abzug', 'beleg', 'ausgabe', 'kosten'],
    minMatchCount: 1,
    confidence: 'low',
    displayName: 'Andere Abzüge'
  }
};

/**
 * Get keyword configuration for a document type
 * @param documentId - The checklist item ID
 * @returns The keyword configuration or null if not found
 */
export function getDocumentKeywords(documentId: string): DocumentKeywordConfig | null {
  return DOCUMENT_KEYWORDS[documentId] || null;
}

/**
 * Match keywords in extracted text
 * Case-insensitive matching with German umlaut normalization
 * 
 * @param text - The text extracted from the document (already normalized)
 * @param keywords - The keywords to search for
 * @returns Array of matched keywords
 */
export function matchKeywords(text: string, keywords: string[]): string[] {
  // Normalize the text for comparison
  const normalizedText = text.toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
  
  return keywords.filter(keyword => {
    // Normalize the keyword as well
    const normalizedKeyword = keyword.toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
    
    // Check if keyword exists in text
    return normalizedText.includes(normalizedKeyword);
  });
}

/**
 * Get all available document types with their display names
 * Useful for UI display
 */
export function getAllDocumentTypes(): Array<{ id: string; displayName: string }> {
  return Object.entries(DOCUMENT_KEYWORDS).map(([id, config]) => ({
    id,
    displayName: config.displayName
  }));
}
