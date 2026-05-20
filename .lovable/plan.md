# Plan

## Befund
Das Problem ist **nicht primär OCR**, sondern die aktuelle **Regex-Erkennung auf flachem Lauftext**.

Beim Aargau-PDF werden nach dem Extrahieren Zahlen aus völlig verschiedenen Spalten zusammengeworfen:
- **rote linke Ziffern** = Abschnitts-/Positionsnummern wie `1.1`, `15.0`, `30.2`
- **gelbe rechte Ziffern** = AG-Formularcodes wie `010`, `3201`, `711`
- zusätzlich tauchen **Geburtsdaten**, **Seiten-/Formular-IDs** wie `0280832501DAG` und andere Zahlen im gleichen Textstrom auf

Dadurch matcht die aktuelle Logik z. B.:
- Code `10` in `14.10.1996`
- Code `30` in `30.2`
- Code `70` in Beträgen/anderen Zahlenfolgen

Und zu deiner Frage: **Ja, die gelben Codes sind nicht einfach 1:1 „eCH-genormt“**. eCH-0119 beschreibt das Austauschformat und Musterformulare, **Kantone dürfen die Formulare und Codes anpassen**. Aargau hat hier eigene bzw. abweichende Codierungen, deshalb reicht „nur an eCH-Codes orientieren“ nicht sauber aus.

## Was ich umsetzen werde
1. **Regex-Scan auf dem Gesamttest entfernen** für AG-PDFs.
2. **Positionsbasierte PDF-Auswertung** einbauen:
   - Text-Items mit `x/y`-Koordinaten aus PDF.js lesen
   - Zeilen bilden statt alles zu einem String zu flatten
   - nur die **rechte Code-Spalte** als Codes werten
   - die **linke rote Nummernspalte** explizit ignorieren
3. **Betrag nur aus derselben visuellen Zeile** bzw. direkt rechts vom Code lesen.
   - leerer Code ohne Wert = nicht erkannt
   - Folgecodes oder Abschnittsnummern zählen nicht mehr als Betrag
4. **Seitenbezogene Erkennung** für `Einkünfte`, `Abzüge`, `Vermögen`:
   - Codes nur auf passenden Formularseiten interpretieren
   - AG-spezifische Zuordnung pro Bereich verwenden
5. **OCR-Fallback an dieselbe Struktur koppeln**:
   - OCR nur, wenn Textlayer wirklich unbrauchbar ist
   - danach dieselbe zeilen-/spaltenbasierte Heuristik anwenden statt globaler Keywords
6. **Gezielt gegen dein hochgeladenes PDF validieren**, damit nur die tatsächlich ausgefüllten Kategorien erscheinen.

## Erwartetes Resultat
Für dieses Aargau-Formular sollen danach **nur echte Treffer** übernommen werden, also keine falsch angehakten Positionen aus:
- Geburtsdaten
- roten Abschnittsnummern links
- Seiten-IDs / DAG-Codes
- benachbarten Folgecodes ohne Wert

## Technische Details
- Hauptdatei: `src/services/PriorYearLocalExtractor.ts`
- Wahrscheinlich kleinere Anpassung in `src/components/intake/PriorYearUpload.tsx`, damit der neue strukturierte Extraktionspfad sauber verwendet wird
- Vorgehen:
  - neues internes Modell `page -> rows -> code/value cells`
  - AG-spezifische Codeerkennung auf Basis von Koordinaten statt Regex
  - OCR-Qualitätscheck verschärfen, damit eingebetteter, aber schlecht geordneter Text nicht blind als „gut genug“ gilt

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>