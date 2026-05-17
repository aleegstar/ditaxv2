# Bulk-Upload mit OCR-Auto-Zuordnung

Aktuell läuft der Upload pro Checklisten-Eintrag: Nutzer wählt erst die Kategorie, lädt dann hoch, der `DocumentValidator` prüft das Ergebnis. Inspiriert von iqtax.ch soll der Flow umgedreht werden: alles in einen Topf werfen, Ditax versucht selbst zuzuordnen, Nutzer bestätigt, Rest wird als „fehlend" angezeigt.

Die nötige Infrastruktur ist bereits vorhanden:
- `DocumentValidator.validate()` liefert Kandidaten + Confidence
- `DOCUMENT_PROFILES` decken die typischen Dokumenttypen ab
- `EncryptedDocumentService` für Upload
- `useMissingItemRequests` / Missing-Items-Tabelle für Nachfragen

## Neuer Flow auf `/documents`

```text
┌──────────────────────────────────────────────────┐
│  Unterlagen hochladen                            │
│  Zieh alle Dokumente hierher – wir ordnen zu.   │
│                                                  │
│   ┌────────────────────────────────────────┐    │
│   │   ⬆  Dateien hierher ziehen            │    │
│   │   PDF · JPG · PNG · HEIC               │    │
│   └────────────────────────────────────────┘    │
│                                                  │
│   ⏳ 7 Dateien werden analysiert (4/7)          │
└──────────────────────────────────────────────────┘
```

Nach OCR-Analyse → Review-Screen:

```text
Vorgeschlagene Zuordnung                Bestätigen alle ✓

📄 lohnausweis_2024.pdf       Lohnausweis 2024    96 %  ✏︎
📄 ubs_konto_dez.pdf          Bankauszug UBS      88 %  ✏︎
📄 krankenkasse.pdf           Krankenkasse        91 %  ✏︎
📄 IMG_2031.jpg               ❓ unklar           34 %  ✏︎  ← Dropdown manuell
📄 saeule_3a.pdf              Säule 3a            82 %  ✏︎

[ Zuordnung bestätigen & hochladen ]
```

Nach Bestätigung → Übersicht „Fehlende Unterlagen":

```text
Noch fehlend (3)
• Wertschriftenverzeichnis      [ Hochladen ]  [ Beim Steuerteam anfragen ]
• Mietvertrag                   [ Hochladen ]  [ Anfragen ]
• Versicherungsausweis BVG      [ Hochladen ]  [ Anfragen ]
```

## Umsetzung

### 1. Neue Seite `src/pages/BulkDocumentUpload.tsx`
- Route z. B. `/documents/bulk?year=YYYY`
- 3 Stages: `drop` → `analyzing` → `review` → `done`
- Großer Dropzone-Bereich (react-dnd nicht nötig, native `onDrop`)
- Mehrfach-Auswahl via `<input multiple>`

### 2. Neuer Service `src/services/BulkClassificationService.ts`
- Iteriert über Files, ruft pro File `DocumentValidator.validate()` mit allen aktiven Profilen
- Liefert `{ file, suggestedProfileId, confidence, alternatives[] }`
- Parallelisiert mit Concurrency-Limit (z. B. 2 gleichzeitig wegen Tesseract)
- Mapping Profil → ChecklistItemId via vorhandener Logik im Checklist-Generator

### 3. Review-Komponente `src/components/documents/BulkAssignmentReview.tsx`
- Liste aller Files mit Vorschlag, Confidence-Badge (grün ≥ 80, gelb 50–79, rot < 50)
- Inline-Dropdown („Andere Kategorie wählen") mit allen Checklist-Items des Jahres
- Option „Dokument verwerfen"
- Sticky Footer: Anzahl bestätigt + Primärbutton

### 4. Bulk-Upload + Assignment
- Nach Bestätigung pro File: `EncryptedDocumentService.uploadDocument()` mit zugeordneter `checklistItemId` + `tax_filer_id`
- Fortschrittsbalken pro Datei
- Bei Fehler: Eintrag bleibt in Review-Liste mit Retry

### 5. „Fehlend"-Block nach Upload
- Nutzt vorhandene Checklist + Upload-Status
- Pro fehlendem Item zwei Aktionen:
  - „Hochladen" → vorhandener Einzel-Uploader (`EnhancedDocumentUploader`)
  - „Anfragen" → nutzt vorhandenes `useMissingItemRequests` um Eintrag für das Steuerteam zu erzeugen (gleicher Mechanismus wie der bestehende Missing-Items-Flow)

### 6. Einstieg
- `/documents` Hauptbutton „Unterlagen hochladen" führt neu auf den Bulk-Flow
- Bestehender Einzel-Upload bleibt erhalten (über Checklisten-Eintrag), wird aber sekundär

## Nicht im Scope
- Keine Änderung an OCR-Engines, Profilen, Verschlüsselung, RLS
- Kein Backend-Schema-Change (Missing-Items existieren bereits)
- Branding/Design bleibt im bestehenden Ditax-Stil (warm off-white, Navy-Gradient-Buttons, rounded-2xl)
