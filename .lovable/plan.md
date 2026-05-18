# Bulk-Upload verbessern

## Ziel
Der Bulk-Upload soll PDFs zuerst automatisch per OCR den offenen Unterlagen zuordnen. Alles, was nicht sicher erkannt wurde, soll der Nutzer per Drag & Drop direkt den offenen Posten zuweisen können.

## Was ich umsetze

### 1. PDF-OCR im Bulk-Upload zuverlässig machen
- PDF.js für die Bulk-Upload-Seite explizit initialisieren, damit PDF-Textauslese und OCR-Fallback dort sicher verfügbar sind.
- Die aktuelle PDF-Erkennung härten:
  - zuerst eingebetteten PDF-Text lesen
  - wenn die Textqualität zu schwach ist, Seiten als Bilder rendern und lokal per Tesseract OCR lesen
- Die OCR-Qualität für typische Steuerunterlagen verbessern, speziell für:
  - Lohnausweis
  - Zins- und Saldobescheinigung
  - Säule 3a Bescheinigung
- Die Auswertung so anpassen, dass schwache Extraktion nicht als „erkannt“ zählt, sondern sauber in den OCR-Fallback geht.

### 2. Offene Posten als Ziel für manuelle Zuordnung zeigen
- Im Review-Schritt zusätzlich einen Bereich „Offene Unterlagen“ anzeigen.
- Nicht zugeordnete Dateien können per Drag & Drop auf einen offenen Posten gezogen werden.
- Alternativ bleibt die Dropdown-Zuordnung pro Datei bestehen als Fallback.
- Bereits zugewiesene Posten werden visuell belegt markiert, damit keine Verwirrung entsteht.

### 3. Zuordnungslogik für reale Checklisten robuster machen
- Sicherstellen, dass Bulk-Klassifikation nur auf tatsächlich vorhandene Checklist-IDs mappt.
- Bessere Behandlung von Kandidaten, wenn OCR etwas Sinnvolles erkennt, aber nicht sofort eindeutig ist.
- Unzugeordnete Dateien bleiben bewusst sichtbar und blockieren den Flow nicht.

### 4. Fehlende Unterlagen sauber nach Upload anzeigen
- Nach dem Upload die verbleibenden fehlenden Dokumente weiterhin separat zeigen.
- Der manuelle Zuordnungsbereich bezieht sich nur auf die offenen Posten vor dem Upload, damit die Logik klar bleibt.

## Erwartetes Ergebnis
- Standard-PDFs werden wieder automatisch vorgeschlagen statt komplett leer zu bleiben.
- Nicht erkannte Dokumente können direkt visuell auf offene Unterlagen gezogen werden.
- Der Nutzer bestätigt nur noch die OCR-Vorschläge und ergänzt den Rest manuell.

## Technische Details
- Betroffene Bereiche:
  - `src/pages/BulkDocumentUpload.tsx`
  - `src/services/DocumentValidator.ts`
  - ggf. `src/services/BulkClassificationService.ts`
- Wahrscheinliche Hauptursache aktuell:
  - Der Bulk-Upload verwendet `window.pdfjsLib` für PDF-Erkennung, aber die PDF.js-Initialisierung ist auf dieser Seite nicht abgesichert. Dadurch fällt PDF-Textauslese plus gescannter-PDF-OCR vermutlich komplett aus.
- Zusätzlich wird die Schwelle für „brauchbaren PDF-Text“ überarbeitet, damit schlechte Textlayer nicht die bessere OCR-Fallback-Kette verhindern.

## Validierung nach Umsetzung
- Test mit denselben PDF-Typen:
  - Lohnausweis
  - Zins- und Saldobescheinigung
  - Säule 3a
- Prüfen, dass:
  - mindestens ein OCR-Vorschlag erscheint
  - nicht erkannte Dateien per Drag & Drop offenen Posten zugewiesen werden können
  - Upload auch mit teils manuell zugewiesenen Dokumenten funktioniert