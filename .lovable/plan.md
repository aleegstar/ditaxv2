# Fix: Falsch-positive Kategorien bei Vorjahres-PDF-Upload

## Problem

Nach Upload des Aargauer eTax-2025-PDF werden in Einkommen und Abzüge alle Kategorien als „erkannt" gelistet — auch Lohnausweis, Selbständigkeit, Rente, Familienzulagen, Schuldzinsen, Unterhalt, PK-Einkauf, obwohl im PDF nur ausgefüllt sind: Lohn (010/020), Wertschriftenertrag (241), Berufskosten (3201/3401), Säule 3a (381/382), Versicherungsprämien (383), Kinderbetreuung (390).

## Root Cause

In `src/services/PriorYearLocalExtractor.ts` prüft `codeIsFilled` per Regex `code…[1-9]` innerhalb 80 Zeichen. Beim PDF-Text-Layer werden alle Felder mit Leertaste verbunden, sodass leere Felder so aussehen:

```
010 111'606 020 22'919 030 040 050 060 671 672 1701 1901 241 68
```

Für leeren Code `030` matcht die Regex die führende `4` des nächsten Codes `040` als „Wert" → False Positive. Das wiederholt sich für alle leeren Hauptbogen-Codes.

## Fix in `src/services/PriorYearLocalExtractor.ts`

1. **Komplette Code-Inventarliste** aufbauen (Set `ALL_KNOWN_CODES`): Union aller Codes aus `INCOME_CODES`/`ASSET_CODES`/`DEDUCTION_CODES` plus Hilfs-Codes, die das AG-Formular zwischen Feldern druckt (001, 295, 300, 401, 411, 501, 600, 601, 602, 690, 710, 711, 712, 713, 2701, 2811, 2821 — soweit nicht schon Doc-Codes).

2. **Neue Logik in `codeIsFilled(text, code)`**:
   - Regex erfasst den ersten Token nach dem Code: `(?:^|[^0-9])CODE(?:[^0-9])\s*([\d'\.\s]{0,20})`
   - Extrahiere die erste reine Ziffernfolge aus der Capture-Group (entferne `'`, `.`, Whitespace).
   - Wenn `parseInt(value)` in `ALL_KNOWN_CODES` enthalten ist → Feld ist leer (nächstes Token ist ein anderer Code) → return `false`.
   - Wenn die Ziffernfolge mit `0` beginnt (z.B. „040") → leerer Code-Marker → return `false`.
   - Sonst echter Geldbetrag → return `true`.

3. **AG-Suchfenster verkleinern** von 80 auf 30 Zeichen, weil im AG-Hauptbogen Code und Wert immer dicht beieinander stehen (verhindert Bleed-Over zur nächsten Zeile).

## Erwartetes Ergebnis für das hochgeladene Graber-PDF

Einkommen: Lohnausweis, Wertschriften-/Depotverzeichnis (2 statt 8)
Abzüge: Berufsauslagen-Belege, Säule 3a, Krankenkassen-Prämienrechnung, Kinderbetreuung (4 statt 12)
Vermögen: Depotauszug, Bankkontoauszug per 31.12.

## Out of Scope

- AI-Edge-Function bleibt unverändert (Gemini sieht das PDF visuell und unterliegt diesem Token-Bleed-Bug nicht).
- Kein UI-Change in `PriorYearChecklist.tsx`.
