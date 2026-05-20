/**
 * eCH-0119 v4.0.0 — Offizieller documentType-Katalog der SSK
 * (Schweizerische Steuerkonferenz / E-Government-Standards).
 *
 * Spec: https://www.ech.ch/de/ech/ech-0119/4.0.0
 * Tabelle 8: "Auflistung der Codes der vordefinierten Dokumenttypen"
 *
 * documentCanton = "CH" für alle hier aufgeführten Codes.
 * Kantonale Eigentypen würden documentCanton=<Kt.> + eigenen Code erhalten.
 */

export type Ech0119DocumentCode =
  | "000" | "001" | "002" | "003" | "004"
  | "005" | "006" | "007" | "008" | "009"
  | "010" | "011" | "012" | "013" | "014"
  | "015" | "016" | "017" | "018" | "019"
  | "020" | "021" | "022" | "023" | "024"
  | "025" | "026" | "999";

export const ECH_DOCUMENT_TYPES: Record<Ech0119DocumentCode, string> = {
  "000": "Steuererklärung (PDF)",
  "001": "Hauptformular Seite 1",
  "002": "Hauptformular Seite 2",
  "003": "Hauptformular Seite 3",
  "004": "Hauptformular Seite 4",
  "005": "Wertschriftenverzeichnis",
  "006": "Liegenschaftenverzeichnis",
  "007": "Schuldenverzeichnis",
  "008": "Qualifizierte Beteiligungen Privatvermögen",
  "009": "Qualifizierte Beteiligungen Geschäftsvermögen",
  "010": "Spartenrechnung",
  "011": "Berufsauslagen",
  "012": "Versicherungsprämien",
  "013": "Krankheits-/Unfallkosten",
  "014": "Behinderungsbedingte Kosten",
  "015": "Lohnausweis",
  "016": "PK-Beleg (Pensionskassen-Auszahlung)",
  "017": "AHV-Beleg",
  "018": "IV-Beleg",
  "019": "ALV-Beleg",
  "020": "Gebundene Vorsorge (Säule 3a)",
  "021": "Kontoauszug",
  "022": "Hypothek",
  "023": "Kleinkredit",
  "024": "Krankenversicherung",
  "025": "Aus- und Weiterbildungskosten",
  "026": "E-Steuerauszug (eCH-0196 XML)",
  "999": "Sonstiges (keine Bezeichnung)",
};

/**
 * Mapping unserer internen Beleg-Labels auf den offiziellen
 * eCH-0119 documentType-Code. Wird für späteren XML-Export
 * sowie für die Dokumenten-Typisierung verwendet.
 */
export const LABEL_TO_ECH_CODE: Record<string, Ech0119DocumentCode> = {
  // Einkommen
  "Lohnausweis": "015",
  "Nachweis Selbständigerwerb": "999",
  "Rentenbescheinigung (AHV/IV/PK)": "017", // wird je nach Inhalt 017/018/016
  "Arbeitslosentaggeld-Abrechnung": "019",
  "Bestätigung Familien-/Mutterschaftszulagen": "999",
  "Wertschriften-/Depotverzeichnis": "005",
  "Bestätigung Alimente/Unterhalt": "999",
  "Liegenschaftsertrag-Abrechnung": "006",

  // Vermögen
  "Depotauszug per 31.12.": "005",
  "Bankkontoauszug per 31.12.": "021",
  "Rückkaufswert Lebensversicherung": "012",
  "Fahrzeugausweis / Eurotax": "999",
  "Liegenschaftsbeleg": "006",
  "Krypto-Saldonachweis": "999",

  // Abzüge
  "Berufsauslagen-Belege": "011",
  "Schuldzinsen-Bescheinigung": "022",
  "Beleg Unterhaltszahlung": "999",
  "Säule 3a-Einzahlungsbestätigung": "020",
  "Krankenkassen-Prämienrechnung": "024",
  "PK-Einkauf-Beleg": "016",
  "Belege Weiterbildungskosten": "025",
  "Beleg Liegenschaftsunterhalt": "006",
  "Belege Krankheits-/Unfallkosten": "013",
  "Spendenbescheinigung": "999",
  "Kinderbetreuungs-Beleg": "999",
  "Parteibeitrags-Beleg": "999",
  "Bescheinigung Säule 3a-Bezug": "020",
};

export function ech0119CodeFor(label: string): Ech0119DocumentCode {
  return LABEL_TO_ECH_CODE[label] ?? "999";
}

/**
 * eCH-0119 §3.6 — source-Code der Datenquelle.
 */
export const ECH_SOURCE = {
  SOFTWARE: 0,
  BARCODE_2D: 1,
  OCR_SCAN: 2,
} as const;

/**
 * eCH-0196 Detektion: Bank-XML-Steuerauszüge tragen meist den Namespace
 * `http://www.ech.ch/xmlns/eCH-0196/...`. Schnelltest auf Datei-Header.
 */
export function isEch0196Statement(headerText: string): boolean {
  return /eCH-0196|ech\.ch\/xmlns\/eCH-0196/i.test(headerText);
}
