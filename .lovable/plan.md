# OCR vereinfachen: nur Kategorien → Dokumenten-Checkliste

## Problem
Der aktuelle Extractor versucht **Werte** (CHF-Beträge) zu erkennen und füllt eine "Persönliche Daten"-Sektion mit Items wie *Kinder im Haushalt → Vorjahr: 18.04.201*. Das ist ein Falschtreffer (eine Datumszahl wird als Wert interpretiert) und für den Zweck gar nicht nötig: Wir wollen aus dem Vorjahr **nur ableiten, welche Dokumente der User dieses Jahr bringen muss**.

## Ziel
Ein Vorjahr-Eintrag wie "Lohn / Lohnausweis" soll im neuen Jahr genau **eine** Dokumenten-Anforderung erzeugen: *"Lohnausweis bereithalten"*. Keine Beträge, keine persönlichen Daten, keine Adressen.

## Änderungen

### 1. `src/services/PriorYearLocalExtractor.ts`
- **Entfernen**: `CHF`-Regex, `value`-Feld, `CONTACT_RULES`, gesamte Kontakt-Auswertung.
- **Vereinfachen**: `ExtractedScan` enthält nur noch `income | assets | deductions` mit Items vom Typ `{ label: string }` (ohne `value`).
- **Regeln umbenennen** auf das *Dokument*, das gebraucht wird – das ist das, was der User sehen wird:
  - Einkommen: `Lohnausweis`, `Rentenbescheinigung (AHV/IV)`, `Pensionskassen­ausweis`, `Bescheinigung Säule 3a-Bezug`, `Wertschriften-/Depotverzeichnis`, `Liegenschafts­ertrag-Abrechnung`, `Bestätigung Alimente/Unterhalt`, `Arbeitslosen­taggeld-Abrechnung`, `Nachweis Selbständigerwerb`.
  - Vermögen: `Bankkontoauszug per 31.12.`, `Depotauszug per 31.12.`, `Säule 3a-Saldobestätigung`, `Rückkaufswert Lebensversicherung`, `Liegenschaftsbeleg`, `Fahrzeugausweis / Eurotax`, `Krypto-Saldonachweis`.
  - Abzüge: `Berufsauslagen-Belege`, `Säule 3a-Einzahlungs­bestätigung`, `PK-Einkauf-Beleg`, `Belege Krankheits-/Unfallkosten`, `Krankenkassen-Prämienrechnung`, `Spendenbescheinigung`, `Schuldzinsen-Bescheinigung`, `Kinderbetreuungs-Beleg`, `Beleg Unterhaltszahlung`, `Beleg Liegenschaftsunterhalt`, `Parteibeitrags-Beleg`.
- **Robusterer Match**: Pattern dürfen erst feuern, wenn das Keyword als **eigenständiges Wort** vorkommt (Wortgrenzen / Mindestkontext), damit OCR-Rauschen wie "18.04.201" nicht zu Kinder-Items wird.
- `isLocalResultSufficient` bleibt, prüft aber nur noch `income.length + assets.length + deductions.length >= 3` (statt der bisherigen 4 inkl. contact).
- `pseudonymize` bleibt unverändert (Edge-Function-Fallback).

### 2. `src/components/intake/PriorYearUpload.tsx`
- Beim Speichern: nur noch `income / assets / deductions` schreiben, **kein** `contact` mehr.
- `source_value` immer `null` setzen (Spalte bleibt im Schema, wird aber leer).

### 3. `supabase/functions/scan-prior-year/index.ts`
- Gemini-Prompt anpassen: liefere nur Kategorie + benötigtes Dokument (Label), keine Werte/Beträge, keine Kontaktdaten. Wenn die Function aktuell `contact` schreibt → entfernen.

### 4. `src/components/intake/PriorYearChecklist.tsx`
- `CATEGORY_LABEL`/`CATEGORY_QUESTION`-Einträge für `contact` bleiben für Altdaten erhalten, neue Scans liefern aber keine mehr.
- `ItemRow`: "Vorjahr: …" nur noch anzeigen, wenn `source_value` wirklich gesetzt ist (bleibt also nur bei alten Datensätzen).
- Optional (kleines Polish): Frage je Kategorie umformulieren auf Dokumenten-Fokus, z. B. *"Welche Belege brauchst du für deine Einkünfte?"*. **Nur** wenn Du das willst – sage Bescheid, sonst lasse ich die bisherigen Fragen.

### 5. `priorYearMapping.ts`
- Unverändert. Mapping arbeitet bereits auf `label` und ist tolerant genug für die neuen, dokumentenzentrierten Labels (z. B. matcht *"Lohnausweis"* weiterhin `hasSalary`).

## Resultat
- Keine "Persönliche Daten"-Karte mehr.
- Keine wackeligen CHF-Werte im UI.
- Jeder Treffer = ein klar benanntes Dokument, das der User dieses Jahr hochladen muss → direkter Übergang zur Dokumenten-Checkliste.
- OCR-Fehler erzeugen viel seltener Geister-Items, weil wir Wortgrenzen erzwingen und Werte ignorieren.
