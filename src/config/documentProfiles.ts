/**
 * Document Type Profiles Configuration
 * 
 * Complete profile definitions for all supported document types.
 * Migrated from documentKeywords.ts with added layout hints and user guidance.
 * 
 * PRIVACY: These profiles are used for LOCAL validation only.
 * No document content is ever sent to external servers.
 */

import { DocumentTypeProfile } from '@/types/documentProfile';

export const DOCUMENT_PROFILES: Record<string, DocumentTypeProfile> = {
  // === STEUERERKLÄRUNG GRUNDLAGEN ===
  'tax-cover-sheet': {
    id: 'tax-cover-sheet',
    label: 'Steuererklärungs-Deckblatt',
    description: 'Offizielles Deckblatt der Steuererklärung',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['steuererklärung', 'steuerjahr', 'kanton', 'gemeinde', 'steuerpflichtig', 'deklaration', 'einreichung', 'deckblatt', 'steueramt'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsFormFields: true,
      expectsDenseText: false
    },
    userGuidance: {
      examplesText: 'Das offizielle Deckblatt Ihrer Steuererklärung vom kantonalen Steueramt.',
      commonMistakes: [
        'Inhaltsverzeichnis statt Deckblatt',
        'Falsches Steuerjahr'
      ],
      whatToCheck: [
        'Steuerjahr ist korrekt',
        'Ihr Name und Adresse sind sichtbar',
        'Kanton und Gemeinde stimmen'
      ]
    },
    category: 'other'
  },

  // === EINKOMMEN ===
  'employment-income': {
    id: 'employment-income',
    label: 'Lohnausweis',
    description: 'Jährlicher Lohnausweis vom Arbeitgeber (Formular 11)',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: [
      'lohnausweis', 'arbeitgeber', 'bruttolohn', 'nettolohn', 'ahv', 'sozialabzüge',
      'quellensteuer', 'gehalt', 'jahreslohn', 'bvg', 'pensionskasse',
      'formular 11', 'form. 11', 'lohnbescheinigung', 'certificat de salaire'
    ],
    negativeKeywords: ['rechnung', 'mahnung', 'kündigung', 'bewerbung'],
    layoutHints: {
      expectsTable: true,
      expectsFormFields: true,
      expectsHeaderBlock: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Ein offizieller Lohnausweis von Ihrem Arbeitgeber, typischerweise im Januar für das Vorjahr ausgestellt.',
      commonMistakes: [
        'Monatliche Lohnabrechnung statt Jahreslohnausweis',
        'Falsches Steuerjahr hochgeladen',
        'Lohnausweis ohne Stempel oder Unterschrift'
      ],
      whatToCheck: [
        'Steuerjahr stimmt überein (z.B. 2024)',
        'Arbeitgebername und -adresse sind vorhanden',
        'Brutto- und Nettolohn sind sichtbar',
        'Stempel oder Unterschrift des Arbeitgebers'
      ]
    },
    category: 'income'
  },

  'self-employment-income': {
    id: 'self-employment-income',
    label: 'Einkommen aus Selbständigkeit',
    description: 'Jahresabschluss oder Buchhaltung für Selbständige',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 20 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.1, max: 10 },
    keywordHints: ['selbständig', 'einzelfirma', 'freiberuflich', 'honorar', 'geschäftsertrag', 'betriebsgewinn', 'umsatz', 'gewinn', 'verlust', 'buchhaltung', 'bilanz'],
    layoutHints: {
      expectsTable: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Jahresabschluss, Erfolgsrechnung oder Bilanz Ihrer selbständigen Tätigkeit.',
      commonMistakes: [
        'Nur einzelne Rechnungen statt Jahresübersicht',
        'Falsche Abrechnungsperiode'
      ],
      whatToCheck: [
        'Geschäftsjahr entspricht dem Steuerjahr',
        'Umsatz und Gewinn sind ersichtlich',
        'Unterschrift oder Bestätigung vorhanden'
      ]
    },
    category: 'income'
  },

  'freelance-income': {
    id: 'freelance-income',
    label: 'Selbständigeneinkommen',
    description: 'Honorare und Einkünfte aus freiberuflicher Tätigkeit',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 10 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 8 },
    keywordHints: ['selbständig', 'honorar', 'freiberuflich', 'rechnung', 'auftraggeber', 'gewinn', 'verlust', 'buchhaltung'],
    layoutHints: {
      expectsTable: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Aufstellung Ihrer Honorareinnahmen oder Jahresübersicht freiberuflicher Tätigkeit.',
      commonMistakes: [
        'Einzelrechnung statt Jahresübersicht'
      ],
      whatToCheck: [
        'Zeitraum umfasst das ganze Steuerjahr',
        'Gesamtbetrag der Einnahmen ersichtlich'
      ]
    },
    category: 'income'
  },

  'pension-income': {
    id: 'pension-income',
    label: 'Rentenbescheinigung',
    description: 'Nachweis über Renten (AHV, IV, Pensionskasse)',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: [
      'rente', 'pension', 'altersrente', 'ahv-rente', 'iv-rente', 'pensionskasse', 'bvg', 'vorsorge', 'altersleistung', 'ruhegehalt',
      'ausgleichskasse', 'sva', 'sozialversicherungsanstalt', 'compenswiss', 'publica',
      'witwenrente', 'waisenrente', 'kinderrente', 'ergänzungsleistung', 'hilflosenentschädigung',
      'jahresrente', 'monatsrente', 'rentenbescheid', 'rentenausweis', 'rentner'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Jährliche Rentenbescheinigung von AHV, IV oder Ihrer Pensionskasse.',
      commonMistakes: [
        'Monatliche Auszahlung statt Jahresbescheinigung',
        'Dokument einer anderen Person'
      ],
      whatToCheck: [
        'Jahresbetrag der Rente sichtbar',
        'Ihr Name ist korrekt',
        'Steuerjahr stimmt überein'
      ]
    },
    category: 'income'
  },

  'pension-statement': {
    id: 'pension-statement',
    label: 'Rentenausweis',
    description: 'Offizieller Rentenausweis',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['rente', 'ahv', 'iv', 'altersrente', 'sozialversicherung', 'rentenbescheinigung', 'pension'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsFormFields: true
    },
    userGuidance: {
      examplesText: 'Rentenausweis der Sozialversicherungsanstalt.',
      commonMistakes: [
        'Kontoauszug statt offizieller Ausweis'
      ],
      whatToCheck: [
        'Offizielles Dokument mit Stempel',
        'Rentenbetrag ist ersichtlich'
      ]
    },
    category: 'income'
  },

  'unemployment-income': {
    id: 'unemployment-income',
    label: 'Arbeitslosenentschädigung',
    description: 'Bescheinigung über Arbeitslosenentschädigung',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 3 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['arbeitslosenkasse', 'alv', 'arbeitslosenentschädigung', 'taggelder', 'rav', 'arbeitslos', 'erwerbsausfall'],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Jahresbescheinigung Ihrer Arbeitslosenkasse über bezogene Taggelder.',
      commonMistakes: [
        'Einzelne Abrechnungen statt Jahresübersicht'
      ],
      whatToCheck: [
        'Jahresgesamtbetrag der Taggelder',
        'Steuerjahr ist korrekt',
        'Ihr Name stimmt überein'
      ]
    },
    category: 'income'
  },

  'rental-income': {
    id: 'rental-income',
    label: 'Mieteinnahmen-Nachweis',
    description: 'Nachweis über Mieteinnahmen aus Vermietung',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['mieteinnahmen', 'mietzins', 'vermietung', 'mieter', 'mietvertrag', 'liegenschaftsertrag', 'nettomiete', 'monatsmiete'],
    layoutHints: {
      expectsTable: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Aufstellung der Mieteinnahmen oder Mietverträge mit Zahlungsnachweisen.',
      commonMistakes: [
        'Nur Mietvertrag ohne Zahlungsnachweis',
        'Ausgaben statt Einnahmen'
      ],
      whatToCheck: [
        'Jahresgesamtbetrag der Mieteinnahmen',
        'Liegenschaftsadresse ist ersichtlich'
      ]
    },
    category: 'income'
  },

  'dividend-statement': {
    id: 'dividend-statement',
    label: 'Dividenden-Bescheinigung',
    description: 'Bescheinigung über erhaltene Dividenden',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 3 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['dividende', 'aktie', 'kapitalertrag', 'verrechnungssteuer', 'rendite', 'ausschüttung', 'wertpapier'],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Dividendenbescheinigung Ihrer Bank oder des Unternehmens.',
      commonMistakes: [
        'Depotauszug statt Dividendenbescheinigung'
      ],
      whatToCheck: [
        'Dividendenbetrag und Verrechnungssteuer sichtbar',
        'Steuerjahr stimmt'
      ]
    },
    category: 'assets'
  },

  'gift-inheritance': {
    id: 'gift-inheritance',
    label: 'Schenkungen/Erbschaften-Belege',
    description: 'Belege über erhaltene Schenkungen oder Erbschaften',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 10 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.1, max: 10 },
    keywordHints: ['schenkung', 'erbschaft', 'erbe', 'vermächtnis', 'nachlass', 'testament', 'erbschaftssteuer'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Schenkungsvertrag, Erbteilungsvertrag oder Nachlassdokumente.',
      commonMistakes: [
        'Testamententwurf statt offizielles Dokument'
      ],
      whatToCheck: [
        'Betrag oder Vermögenswert ersichtlich',
        'Datum der Schenkung/Erbschaft',
        'Unterschriften vorhanden'
      ]
    },
    category: 'income'
  },

  'pension-payout': {
    id: 'pension-payout',
    label: 'Pensionskassenauszahlung',
    description: 'Bescheinigung über Kapitalauszahlung aus Pensionskasse',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 3 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['pensionskasse', 'kapitalauszahlung', 'freizügigkeit', 'vorsorge', 'bvg', 'austritt', 'auszahlung'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Bescheinigung Ihrer Pensionskasse über eine Kapitalauszahlung.',
      commonMistakes: [
        'Vorsorgeausweis statt Auszahlungsbescheinigung'
      ],
      whatToCheck: [
        'Auszahlungsbetrag ersichtlich',
        'Auszahlungsdatum im Steuerjahr',
        'Stempel der Pensionskasse'
      ]
    },
    category: 'income'
  },

  'other-income': {
    id: 'other-income',
    label: 'Weitere Einkommen',
    description: 'Sonstige Einkommensbelege (Taggelder, Stipendien, etc.)',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['taggeld', 'stipendium', 'unterstützung', 'einkommen', 'elo', 'arbeitslosengeld'],
    layoutHints: {
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Belege über sonstige Einnahmen wie Stipendien, Taggelder oder Unterstützungsleistungen.',
      commonMistakes: [
        'Antrag statt Bewilligung/Bestätigung'
      ],
      whatToCheck: [
        'Art der Leistung erkennbar',
        'Jahresbetrag ersichtlich'
      ]
    },
    category: 'income'
  },

  // === VORSORGE ===
  'pillar3a-certificate': {
    id: 'pillar3a-certificate',
    label: 'Säule 3a Bescheinigung',
    description: 'Bescheinigung über Einzahlungen in die Säule 3a',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: [
      'säule 3a', '3a', 'vorsorge', 'steuerbegünstigt', 'einzahlung', 'freizügigkeit', 'vorsorgekonto', 'gebundene vorsorge', 'steuerbescheinigung',
      'swisscanto', 'viac', 'frankly', 'finpension', 'liberty', 'axa', 'mobiliar', 'zurich', 'swiss life', 'baloise',
      'vorsorgesparen', 'vorsorgepolice', 'sparversicherung', 'wertschriftenlösung', 'fondslösung',
      'steuerabzug', 'maximaleinzahlung', 'abzugsfähig'
    ],
    negativeKeywords: ['pensionskasse', 'bvg', '2. säule'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Jährliche Bescheinigung Ihrer Bank oder Versicherung über Säule 3a Einzahlungen.',
      commonMistakes: [
        'Kontoauszug statt offizielle Steuerbescheinigung',
        'Säule 3b statt 3a'
      ],
      whatToCheck: [
        'Einzahlungsbetrag für das Steuerjahr',
        '"Säule 3a" oder "gebundene Vorsorge" erwähnt',
        'Ihr Name und Kontonummer'
      ]
    },
    category: 'pension'
  },

  'pillar2-statement': {
    id: 'pillar2-statement',
    label: 'Pensionskassenausweis',
    description: 'Jährlicher Vorsorgeausweis der Pensionskasse',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 4 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: [
      'pensionskasse', 'bvg', '2. säule', 'vorsorgeausweis', 'altersguthaben', 'freizügigkeit', 'deckungskapital', 'risikoleistung',
      'publica', 'pkbs', 'bpk', 'asga', 'vita', 'axa', 'swiss life', 'bâloise', 'pax', 'helvetia', 'migros', 'coop',
      'umwandlungssatz', 'koordinationsabzug', 'versicherter lohn', 'sparguthaben', 'invalidenrente', 'altersleistung',
      'jahresausweis', 'versicherungsausweis', 'projektion', 'vorbezug', 'wohneigentum'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Jährlicher Vorsorgeausweis Ihrer Pensionskasse, meist im Januar verschickt.',
      commonMistakes: [
        'Versicherungspolice statt Vorsorgeausweis',
        'Ausweis vom falschen Jahr'
      ],
      whatToCheck: [
        'Stichdatum entspricht dem Steuerjahr',
        'Altersguthaben ist ersichtlich',
        'Ihr Name stimmt überein'
      ]
    },
    category: 'pension'
  },

  'pillar2-buyin': {
    id: 'pillar2-buyin',
    label: 'PK-Einkaufsbeleg',
    description: 'Beleg über freiwilligen Einkauf in die Pensionskasse',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['einkauf', 'pensionskasse', 'bvg', 'nachzahlung', 'einkaufspotential', 'freiwilliger einkauf'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Bestätigung Ihrer Pensionskasse über einen freiwilligen Einkauf.',
      commonMistakes: [
        'Einkaufsberechnung statt Zahlungsbestätigung'
      ],
      whatToCheck: [
        'Einkaufsbetrag ersichtlich',
        'Zahlungsdatum im Steuerjahr',
        'Bestätigung/Stempel der PK'
      ]
    },
    category: 'pension'
  },

  'bvg-purchase': {
    id: 'bvg-purchase',
    label: 'BVG-Einkauf',
    description: 'Nachweis über BVG-Einkauf',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['bvg', 'einkauf', 'pensionskasse', 'vorsorge', 'einzahlung', '2. säule'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Bescheinigung über einen BVG-Einkauf in die 2. Säule.',
      commonMistakes: [
        'Regulärer Vorsorgeausweis statt Einkaufsbeleg'
      ],
      whatToCheck: [
        'Einkaufsbetrag klar ersichtlich',
        'Datum der Einzahlung'
      ]
    },
    category: 'pension'
  },

  // === VERMÖGEN & KAPITALERTRÄGE ===
  'bank-account-statement': {
    id: 'bank-account-statement',
    label: 'Zins- und Saldobescheinigung',
    description: 'Jährliche Bescheinigung über Kontosaldo und Zinsen',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 3 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: [
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
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Jährliche Zins- und Saldobescheinigung Ihrer Bank zum 31.12.',
      commonMistakes: [
        'Monatlicher Kontoauszug statt Jahresbescheinigung',
        'Transaktionsauszug statt Saldobescheinigung'
      ],
      whatToCheck: [
        'Stichtag 31.12. des Steuerjahres',
        'Kontosaldo ersichtlich',
        'Jahreszins aufgeführt'
      ]
    },
    category: 'assets'
  },

  'bank-statements': {
    id: 'bank-statements',
    label: 'Bankauszug',
    description: 'Kontoauszug oder Vermögensübersicht',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 10 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 8 },
    keywordHints: [
      'kontoauszug', 'bank', 'saldo', 'guthaben', 'zinsen', 'konto', 'sparen', 'vermögen', 'depot', 'wertschriften',
      'postfinance', 'raiffeisen', 'ubs', 'credit suisse', 'zkb', 'kantonalbank', 'migros bank', 'cler',
      'jahresabschluss', 'kontostand', 'bewegungen', 'transaktionen', 'umsatz'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Bankauszug mit Kontostand und Zinsen.',
      commonMistakes: [
        'Nur Transaktionen ohne Saldo'
      ],
      whatToCheck: [
        'Jahresendstand ersichtlich',
        'Ihr Name und Kontonummer'
      ]
    },
    category: 'assets'
  },

  'deposit-account': {
    id: 'deposit-account',
    label: 'Depotauszug',
    description: 'Wertschriftendepot-Auszug',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 20 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.1, max: 10 },
    keywordHints: [
      'depot', 'wertschriften', 'aktie', 'obligation', 'fonds', 'portfolio', 'depotauszug', 'vermögenswerte',
      'isin', 'valor', 'kurswert', 'stückzahl', 'anteile', 'nennwert', 'marchzins',
      'etf', 'anlagefonds', 'indexfonds', 'swisscanto', 'ubs fund', 'credit suisse fund',
      'six', 'börse', 'nasdaq', 'nyse', 'kurs', 'performance'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Depotauszug Ihrer Bank mit allen Wertschriften zum 31.12.',
      commonMistakes: [
        'Einzelne Kaufabrechnung statt Jahresübersicht'
      ],
      whatToCheck: [
        'Stichtag 31.12. des Steuerjahres',
        'Liste aller Wertpapiere mit Kurswerten',
        'Gesamtwert des Depots'
      ]
    },
    category: 'assets'
  },

  'securities-statement': {
    id: 'securities-statement',
    label: 'Wertschriftenverzeichnis',
    description: 'Aufstellung aller Wertschriften',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 20 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.1, max: 10 },
    keywordHints: [
      'wertschriften', 'depot', 'aktien', 'obligationen', 'fonds', 'dividende', 'kursgewinn', 'vermögensaufstellung', 'portfolio',
      'isin', 'valor', 'steuerwert', 'kurswert', 'verrechnungssteuer', 'bruttodividende',
      'six swiss exchange', 'smi', 'swiss market index',
      'steuerverzeichnis', 'jahresabschluss', 'ertragsübersicht'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Vollständiges Wertschriftenverzeichnis mit Steuerwerten.',
      commonMistakes: [
        'Performance-Bericht statt Steuerbescheinigung'
      ],
      whatToCheck: [
        'Alle Wertpapiere mit ISIN/Valor',
        'Steuerwerte zum Jahresende',
        'Erträge (Dividenden, Zinsen) aufgeführt'
      ]
    },
    category: 'assets'
  },

  'crypto-portfolio': {
    id: 'crypto-portfolio',
    label: 'Kryptowährungsnachweis',
    description: 'Nachweis über Kryptowährungsbestände',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'any',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: [
      'bitcoin', 'ethereum', 'kryptowährung', 'crypto', 'wallet', 'blockchain', 'token',
      'btc', 'eth', 'bnb', 'xrp', 'cardano', 'solana', 'polkadot', 'avalanche', 'usdt', 'usdc',
      'binance', 'kraken', 'coinbase', 'bitpanda', 'swissborg', 'bitcoin suisse',
      'staking', 'defi', 'nft', 'ledger', 'metamask', 'kurs', 'portfolio'
    ],
    layoutHints: {
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Screenshot oder Export Ihrer Krypto-Wallet mit Beständen zum 31.12.',
      commonMistakes: [
        'Transaktionshistorie statt Bestandsnachweis',
        'Falsches Datum (nicht Jahresende)'
      ],
      whatToCheck: [
        'Datum entspricht 31.12. des Steuerjahres',
        'Alle Kryptowährungen mit Menge aufgelistet',
        'CHF-Wert zum Stichtag ersichtlich'
      ]
    },
    category: 'assets'
  },

  'interest-income': {
    id: 'interest-income',
    label: 'Zinsausweis',
    description: 'Bescheinigung über Zinserträge',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['zinsen', 'zinsertrag', 'sparzinsen', 'obligationenzinsen', 'kapitalertrag', 'verrechnungssteuer'],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Bescheinigung über erhaltene Zinsen im Steuerjahr.',
      commonMistakes: [
        'Zinseszinsrechnung statt Bescheinigung'
      ],
      whatToCheck: [
        'Jahres-Zinsbetrag ersichtlich',
        'Verrechnungssteuer aufgeführt'
      ]
    },
    category: 'assets'
  },

  'dividend-income': {
    id: 'dividend-income',
    label: 'Dividendenausweis',
    description: 'Bescheinigung über Dividendenerträge',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 3 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['dividende', 'ausschüttung', 'gewinnanteil', 'aktienertrag', 'verrechnungssteuer', 'kapitalertrag'],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Dividendenbescheinigung mit Verrechnungssteuerangabe.',
      commonMistakes: [
        'Kaufabrechnung statt Dividendenabrechnung'
      ],
      whatToCheck: [
        'Brutto-Dividende ersichtlich',
        'Verrechnungssteuer (35%) aufgeführt'
      ]
    },
    category: 'assets'
  },

  // === IMMOBILIEN ===
  'property-tax-value': {
    id: 'property-tax-value',
    label: 'Liegenschafts-Steuerwert',
    description: 'Amtlicher Steuerwert der Liegenschaft',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 3 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['steuerwert', 'liegenschaft', 'immobilie', 'grundstück', 'eigenmietwert', 'kataster', 'gebäude', 'amtlicher wert'],
    layoutHints: {
      expectsFormFields: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Amtliche Bewertung oder Steuererklärungsbeilage zum Liegenschaftswert.',
      commonMistakes: [
        'Versicherungswert statt Steuerwert',
        'Kaufpreis statt amtlicher Wert'
      ],
      whatToCheck: [
        'Amtlicher Steuerwert ersichtlich',
        'Eigenmietwert aufgeführt (bei Eigennutzung)',
        'Adresse der Liegenschaft'
      ]
    },
    category: 'property'
  },

  'mortgage-statement': {
    id: 'mortgage-statement',
    label: 'Hypotheken-Dokumente',
    description: 'Hypothekenvertrag oder Zinsausweis',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: [
      'hypothek', 'zinssatz', 'liegenschaft', 'grundpfand', 'hypothekarzins', 'amortisation', 'schuldzins',
      'festhypothek', 'saron', 'libor', 'variable hypothek', 'rahmenkredit',
      'postfinance', 'raiffeisen', 'ubs', 'credit suisse', 'zkb', 'kantonalbank',
      'tragbarkeit', 'schuldbrief', 'grundbuch', 'restschuld', 'zinsabrechnung', 'darlehen'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Hypothekenvertrag oder jährliche Zinsabrechnung Ihrer Bank.',
      commonMistakes: [
        'Angebot statt Vertrag/Abrechnung'
      ],
      whatToCheck: [
        'Hypothekenbetrag (Schuld) ersichtlich',
        'Jahres-Hypothekarzinsen aufgeführt',
        'Liegenschaftsadresse stimmt'
      ]
    },
    category: 'property'
  },

  'mortgage-interest': {
    id: 'mortgage-interest',
    label: 'Hypothekarzins-Bescheinigung',
    description: 'Jährliche Bescheinigung über Hypothekarzinsen',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: [
      'hypothek', 'hypothekarzinsen', 'schuldzinsen', 'darlehen', 'finanzierung', 'liegenschaft', 'zinsausweis',
      'jahreszins', 'zinsbelastung', 'zinsabrechnung', 'zinsaufwand',
      'festhypothek', 'saron', 'variable', 'rahmenkredit',
      'postfinance', 'raiffeisen', 'ubs', 'credit suisse', 'zkb', 'kantonalbank'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Jahresbescheinigung Ihrer Bank über bezahlte Hypothekarzinsen.',
      commonMistakes: [
        'Amortisationsnachweis statt Zinsbescheinigung'
      ],
      whatToCheck: [
        'Jahres-Zinsbetrag ersichtlich',
        'Steuerjahr stimmt',
        'Restschuld aufgeführt'
      ]
    },
    category: 'property'
  },

  'property-maintenance': {
    id: 'property-maintenance',
    label: 'Liegenschaftsunterhalts-Belege',
    description: 'Belege für Unterhalts- und Renovationskosten',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 20 },
    typicalOrientation: 'any',
    typicalFileSizeMB: { min: 0.05, max: 10 },
    keywordHints: ['unterhaltskosten', 'renovation', 'reparatur', 'instandhaltung', 'liegenschaft', 'nebenkosten', 'hauswart'],
    layoutHints: {
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Rechnungen für Reparaturen, Unterhalt oder Renovationen an Ihrer Liegenschaft.',
      commonMistakes: [
        'Wertvermehrende Investitionen statt Unterhalt',
        'Rechnungen für andere Adresse'
      ],
      whatToCheck: [
        'Rechnungsdatum im Steuerjahr',
        'Liegenschaftsadresse stimmt',
        'Art der Arbeiten ersichtlich (werterhaltend)'
      ]
    },
    category: 'property'
  },

  'maintenance-receipts': {
    id: 'maintenance-receipts',
    label: 'Liegenschaftsunterhalt',
    description: 'Unterhaltsbelege für Liegenschaften',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 20 },
    typicalOrientation: 'any',
    typicalFileSizeMB: { min: 0.05, max: 10 },
    keywordHints: ['unterhalt', 'renovation', 'reparatur', 'liegenschaft', 'instandhaltung', 'handwerker'],
    layoutHints: {
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Handwerkerrechnungen und Quittungen für Unterhaltsarbeiten.',
      commonMistakes: [
        'Offerten statt bezahlte Rechnungen'
      ],
      whatToCheck: [
        'Zahlungsbeleg vorhanden',
        'Datum im Steuerjahr'
      ]
    },
    category: 'property'
  },

  // === ABZÜGE ===
  'health-insurance': {
    id: 'health-insurance',
    label: 'Krankenkassen-Prämiennachweis',
    description: 'Bescheinigung über Krankenkassenprämien',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: [
      'krankenkasse', 'krankenversicherung', 'prämie', 'grundversicherung', 'zusatzversicherung', 'kvg', 'franchise',
      'css', 'helsana', 'swica', 'concordia', 'sanitas', 'visana', 'atupri', 'groupe mutuel', 'assura', 'kpt', 'oks', 'sympany',
      'jahresprämie', 'monatsprämie', 'prämienbestätigung', 'prämienbescheinigung', 'steuerbescheinigung',
      'unfallversicherung', 'spitalversicherung', 'zahnversicherung', 'selbstbehalt'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Jährliche Prämienbestätigung Ihrer Krankenkasse.',
      commonMistakes: [
        'Monatsrechnung statt Jahresbescheinigung',
        'Prämienrechnung statt Steuerbescheinigung'
      ],
      whatToCheck: [
        'Jahres-Prämienbetrag ersichtlich',
        'Grund- und Zusatzversicherung getrennt',
        'Alle versicherten Personen aufgeführt'
      ]
    },
    category: 'deductions'
  },

  'medical-expenses': {
    id: 'medical-expenses',
    label: 'Krankheitskosten-Belege',
    description: 'Belege für selbst bezahlte Gesundheitskosten',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 20 },
    typicalOrientation: 'any',
    typicalFileSizeMB: { min: 0.05, max: 10 },
    keywordHints: ['arztrechnung', 'medizinisch', 'krankheitskosten', 'selbstbehalt', 'zahnarzt', 'spital', 'therapie', 'medikamente'],
    layoutHints: {
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Arztrechnungen, Zahnarztbelege, Apothekenquittungen für selbst bezahlte Kosten.',
      commonMistakes: [
        'Von Krankenkasse erstattete Kosten',
        'Kosmetische Behandlungen (nicht abzugsfähig)'
      ],
      whatToCheck: [
        'Selbst bezahlter Betrag ersichtlich',
        'Medizinische Notwendigkeit erkennbar',
        'Datum im Steuerjahr'
      ]
    },
    category: 'deductions'
  },

  'education-expenses': {
    id: 'education-expenses',
    label: 'Weiterbildungskosten-Belege',
    description: 'Belege für berufliche Weiterbildung',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 10 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['weiterbildung', 'ausbildung', 'kurs', 'studium', 'schule', 'bildung', 'fortbildung', 'seminar', 'diplom', 'schulung', 'bildungskosten'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Kursgebühren, Studiengebühren oder Kosten für berufliche Weiterbildung.',
      commonMistakes: [
        'Erstausbildung (nicht abzugsfähig)',
        'Hobbykurse ohne Berufsbezug'
      ],
      whatToCheck: [
        'Beruflicher Bezug der Weiterbildung',
        'Zahlungsbeleg vorhanden',
        'Kursdatum im Steuerjahr'
      ]
    },
    category: 'deductions'
  },

  'commuting-expenses': {
    id: 'commuting-expenses',
    label: 'Fahrkosten-Belege',
    description: 'Nachweise für Arbeitsweg-Kosten',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 3 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: [
      'arbeitsweg', 'pendler', 'ga', 'halbtax', 'fahrkosten', 'öv', 'abonnement', 'berufsauslagen',
      'sbb', 'zvv', 'bls', 'rhb', 'sob', 'tpf', 'tpg', 'vbl', 'bernmobil', 'basler verkehrsbetriebe', 'vbz',
      'streckenabo', 'verbundabo', 'monatsabo', 'jahresabo', 'mobility', 'publibike',
      'fahrausweis', 'billett', 'swisspass', 'bahncard', 'tageskarte'
    ],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'GA, Halbtax-Abo, Streckenabo oder Parkplatzbescheinigung.',
      commonMistakes: [
        'Private Reisen statt Arbeitsweg',
        'Abo für andere Person'
      ],
      whatToCheck: [
        'Gültigkeitszeitraum im Steuerjahr',
        'Ihr Name auf dem Abo',
        'Jahreskosten ersichtlich'
      ]
    },
    category: 'deductions'
  },

  'childcare-expenses': {
    id: 'childcare-expenses',
    label: 'Kinderbetreuungskosten-Belege',
    description: 'Belege für Drittbetreuung von Kindern',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: [
      'kinderbetreuung', 'kita', 'krippe', 'hort', 'tagesmutter', 'betreuungskosten', 'drittbetreuung',
      'kindertagesstätte', 'tagesschule', 'mittagstisch', 'spielgruppe', 'tagesfamilie', 'nanny',
      'betreuungsgutschein', 'subvention', 'elternbeitrag', 'betreuungstage', 'jahresabrechnung',
      'vorschule', 'nachmittagsbetreuung', 'ferienbetreuung'
    ],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Jahresabrechnung der Kita, Krippe oder Bescheinigung der Tagesmutter.',
      commonMistakes: [
        'Einzelne Monatsrechnungen statt Jahresübersicht',
        'Betreuung durch Elternteil (nicht abzugsfähig)'
      ],
      whatToCheck: [
        'Jahres-Betreuungskosten ersichtlich',
        'Name des Kindes aufgeführt',
        'Betreuungseinrichtung erkennbar'
      ]
    },
    category: 'deductions'
  },

  'donation-receipts': {
    id: 'donation-receipts',
    label: 'Spendenbelege',
    description: 'Bescheinigungen über Spenden an gemeinnützige Organisationen',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['spende', 'gemeinnützig', 'stiftung', 'hilfswerk', 'donation', 'zuwendung', 'steuerabzug', 'spendenquittung', 'spendenbestätigung'],
    layoutHints: {
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Spendenquittungen von anerkannten gemeinnützigen Organisationen.',
      commonMistakes: [
        'Mitgliedsbeiträge (meist nicht abzugsfähig)',
        'Spenden an nicht-anerkannte Organisationen'
      ],
      whatToCheck: [
        'Organisation ist steuerbefreit',
        'Spendenbetrag ersichtlich',
        'Datum im Steuerjahr'
      ]
    },
    category: 'deductions'
  },

  'charitable-donations': {
    id: 'charitable-donations',
    label: 'Spendenbescheinigung',
    description: 'Offizielle Spendenbescheinigung',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['spende', 'gemeinnützig', 'stiftung', 'hilfswerk', 'donation', 'zuwendung', 'steuerabzug', 'spendenquittung'],
    layoutHints: {
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Offizielle Spendenbescheinigung mit Steuerabzugsvermerk.',
      commonMistakes: [
        'Zahlungsbeleg ohne Spendenbestätigung'
      ],
      whatToCheck: [
        'Steuerbefreiung der Organisation erwähnt',
        'Spendenbetrag klar ersichtlich'
      ]
    },
    category: 'deductions'
  },

  'supported-persons': {
    id: 'supported-persons',
    label: 'Unterstützte Personen',
    description: 'Nachweis über Unterstützung bedürftiger Personen',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['unterstützung', 'unterstützte person', 'bedürftig', 'beistand'],
    layoutHints: {
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Nachweis über finanzielle Unterstützung an bedürftige Angehörige.',
      commonMistakes: [
        'Fehlender Bedürftigkeitsnachweis'
      ],
      whatToCheck: [
        'Name der unterstützten Person',
        'Unterstützungsbetrag ersichtlich',
        'Verwandtschaftsverhältnis erkennbar'
      ]
    },
    category: 'deductions'
  },

  // === SCHULDEN ===
  'debt-statement': {
    id: 'debt-statement',
    label: 'Schuldenverzeichnis',
    description: 'Übersicht über bestehende Schulden',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['schulden', 'darlehen', 'kredit', 'verbindlichkeit', 'leasing', 'rückzahlung', 'restschuld'],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Aufstellung aller Schulden zum 31.12. des Steuerjahres.',
      commonMistakes: [
        'Kreditantrag statt Bestätigung',
        'Falsches Datum (nicht Jahresende)'
      ],
      whatToCheck: [
        'Schuldenbetrag zum 31.12.',
        'Name des Gläubigers',
        'Bezahlte Schuldzinsen aufgeführt'
      ]
    },
    category: 'debts'
  },

  'debt-statements': {
    id: 'debt-statements',
    label: 'Schuldscheine',
    description: 'Darlehensverträge und Schuldscheine',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 10 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 8 },
    keywordHints: ['schuld', 'darlehen', 'kredit', 'rückzahlung', 'zins', 'gläubiger', 'schuldner'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Darlehensverträge oder Kreditvereinbarungen.',
      commonMistakes: [
        'Veralteter Vertrag ohne aktuellen Stand'
      ],
      whatToCheck: [
        'Aktueller Schuldenstand',
        'Zinssatz ersichtlich',
        'Unterschriften vorhanden'
      ]
    },
    category: 'debts'
  },

  'alimony-payments': {
    id: 'alimony-payments',
    label: 'Alimenten-Zahlungsnachweis',
    description: 'Nachweis über geleistete Unterhaltszahlungen',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['alimente', 'unterhalt', 'scheidung', 'trennung', 'kindesunterhalt', 'ehegattenunterhalt'],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Zahlungsnachweise oder Gerichtsurteil über Unterhaltszahlungen.',
      commonMistakes: [
        'Fehlende Zahlungsnachweise zum Gerichtsurteil'
      ],
      whatToCheck: [
        'Jahres-Gesamtbetrag der Zahlungen',
        'Name des Empfängers',
        'Zahlungsnachweise (Bankauszüge) vorhanden'
      ]
    },
    category: 'deductions'
  },

  'maintenance-payments': {
    id: 'maintenance-payments',
    label: 'Unterhaltszahlungen',
    description: 'Belege über Unterhaltszahlungen',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 5 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 5 },
    keywordHints: ['alimenten', 'unterhaltszahlung', 'alimente', 'scheidung', 'kindesunterhalt', 'ehegattenunterhalt'],
    layoutHints: {
      expectsTable: true,
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Bestätigung über geleistete Unterhaltszahlungen.',
      commonMistakes: [
        'Nur Gerichtsurteil ohne Zahlungsnachweis'
      ],
      whatToCheck: [
        'Jahres-Zahlungsbetrag',
        'Empfängername',
        'Zahlungsdaten im Steuerjahr'
      ]
    },
    category: 'deductions'
  },

  // === SONSTIGE ===
  'foreign-income': {
    id: 'foreign-income',
    label: 'Ausländische Einkünfte',
    description: 'Nachweise über Einkommen aus dem Ausland',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 10 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 8 },
    keywordHints: ['ausland', 'grenzgänger', 'quellensteuer', 'doppelbesteuerung', 'ausländisch', 'fremdwährung'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsTable: true
    },
    userGuidance: {
      examplesText: 'Lohnausweis oder Steuerbescheinigung aus dem Ausland.',
      commonMistakes: [
        'Nicht in CHF umgerechnet',
        'Fehlende Quellensteuerbestätigung'
      ],
      whatToCheck: [
        'Einkommen in Originalwährung und CHF',
        'Bereits bezahlte Steuern im Ausland',
        'Arbeitgeberland ersichtlich'
      ]
    },
    category: 'income'
  },

  'inheritance-gift': {
    id: 'inheritance-gift',
    label: 'Erbschafts-/Schenkungsnachweis',
    description: 'Dokumente zu Erbschaften oder Schenkungen',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 20 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.1, max: 15 },
    keywordHints: ['erbschaft', 'schenkung', 'nachlass', 'erbe', 'vermächtnis', 'erbschaftssteuer'],
    layoutHints: {
      expectsHeaderBlock: true,
      expectsDenseText: true
    },
    userGuidance: {
      examplesText: 'Erbteilungsvertrag, Schenkungsvertrag oder notarielle Urkunde.',
      commonMistakes: [
        'Testament statt Erbteilung',
        'Nicht alle Seiten hochgeladen'
      ],
      whatToCheck: [
        'Wert des Erbes/der Schenkung',
        'Datum der Übertragung',
        'Unterschriften und ggf. Beglaubigung'
      ]
    },
    category: 'other'
  },

  'lottery-winnings': {
    id: 'lottery-winnings',
    label: 'Lotteriegewinn-Nachweis',
    description: 'Bescheinigung über Lotteriegewinne',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 2 },
    typicalOrientation: 'portrait',
    typicalFileSizeMB: { min: 0.05, max: 3 },
    keywordHints: ['lotterie', 'gewinn', 'swisslos', 'casino', 'spielgewinn', 'glücksspiel'],
    layoutHints: {
      expectsHeaderBlock: true
    },
    userGuidance: {
      examplesText: 'Gewinnbestätigung von Swisslos, Casino oder anderem Glücksspielanbieter.',
      commonMistakes: [
        'Spielquittung ohne Gewinnbestätigung'
      ],
      whatToCheck: [
        'Gewinnbetrag ersichtlich',
        'Datum des Gewinns im Steuerjahr',
        'Anbieter erkennbar'
      ]
    },
    category: 'income'
  },

  'other-assets': {
    id: 'other-assets',
    label: 'Andere Vermögenswerte',
    description: 'Nachweise über sonstige Vermögenswerte',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 10 },
    typicalOrientation: 'any',
    typicalFileSizeMB: { min: 0.05, max: 8 },
    keywordHints: ['vermögen', 'besitz', 'wert', 'anlage', 'investition'],
    layoutHints: {},
    userGuidance: {
      examplesText: 'Belege für sonstige Vermögenswerte wie Fahrzeuge, Kunstwerke, etc.',
      commonMistakes: [
        'Fehlende Wertschätzung',
        'Nicht steuerpflichtige Gegenstände'
      ],
      whatToCheck: [
        'Wert zum 31.12. ersichtlich',
        'Art des Vermögenswerts erkennbar'
      ]
    },
    category: 'assets'
  },

  'other-deductions': {
    id: 'other-deductions',
    label: 'Andere Abzüge',
    description: 'Belege für sonstige Abzüge',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    typicalPages: { min: 1, max: 10 },
    typicalOrientation: 'any',
    typicalFileSizeMB: { min: 0.05, max: 8 },
    keywordHints: ['abzug', 'beleg', 'ausgabe', 'kosten'],
    layoutHints: {},
    userGuidance: {
      examplesText: 'Belege für sonstige steuerlich abzugsfähige Ausgaben.',
      commonMistakes: [
        'Nicht abzugsfähige Privatausgaben'
      ],
      whatToCheck: [
        'Steuerliche Abzugsfähigkeit prüfen',
        'Zahlungsdatum im Steuerjahr'
      ]
    },
    category: 'deductions'
  }
};

/**
 * Get a document profile by ID
 */
export function getDocumentProfile(docTypeId: string): DocumentTypeProfile | null {
  return DOCUMENT_PROFILES[docTypeId] || null;
}

/**
 * Get all document profiles
 */
export function getAllProfiles(): DocumentTypeProfile[] {
  return Object.values(DOCUMENT_PROFILES);
}

/**
 * Get profiles by category
 */
export function getProfilesByCategory(category: DocumentTypeProfile['category']): DocumentTypeProfile[] {
  return Object.values(DOCUMENT_PROFILES).filter(p => p.category === category);
}

/**
 * Get all profile IDs
 */
export function getAllProfileIds(): string[] {
  return Object.keys(DOCUMENT_PROFILES);
}
