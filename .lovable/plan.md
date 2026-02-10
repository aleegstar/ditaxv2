

# Weniger Klicks beim Dokument-Upload

## Problem
Aktuell muss der User auf "Hochladen" klicken, wird auf eine separate Upload-Seite navigiert, dort eine Datei auswaehlen und dann nochmals "Hochladen" klicken. Das sind mindestens 3-4 Klicks.

## Loesung: Direkter Upload aus der Checkliste (2 Klicks)

Der "Hochladen"-Button oeffnet direkt den nativen Datei-Picker. Nach Auswahl wird die Datei sofort im Hintergrund hochgeladen. Status-Updates kommen als Toast-Benachrichtigungen.

## Ablauf vorher vs. nachher

```text
VORHER:                          NACHHER:
1. "Hochladen" klicken           1. "Hochladen" klicken
2. Upload-Seite laedt            2. Datei auswaehlen
3. Datei auswaehlen              -> Upload startet automatisch
4. "Hochladen" klicken           -> Toast zeigt Erfolg/Fehler
5. Warten auf Upload
6. Zurueck zur Checkliste
```

## Technische Umsetzung

### Datei: `src/components/DocumentChecklist.tsx`

1. **Hidden File Inputs hinzufuegen**: Pro Checklist-Item ein verstecktes `<input type="file">` Element mit den korrekten Akzeptanz-Attributen (image/jpeg, image/png, application/pdf, etc.)

2. **`handleUploadDocument` aendern**: Statt `navigate()` aufzurufen, wird der versteckte File-Input getriggert (`fileInputRef.current?.click()`)

3. **Neue `handleQuickUpload` Funktion**: 
   - Nimmt die ausgewaehlte Datei entgegen
   - Validiert via `validateFile()` aus `@/utils/fileValidation`
   - Laedt ueber `EncryptedDocumentService.uploadEncryptedDocument()` hoch mit allen korrekten Parametern:
     - `checklistItemId` (aus dem jeweiligen Item)
     - `userId` (aus Auth Session)
     - `taxYear` (aus FormContext)
     - `checklistItemTitle` (fuer Dateinamen-Prefix)
     - `activeTaxFilerId` (aus TaxFilerContext)
   - Zeigt Erfolg/Fehler als Toast
   - Aktualisiert die Dokumentenliste via `refreshDocuments()`

4. **Upload-Status pro Item**: Ein State `uploadingItems` trackt welche Items gerade hochladen, um einen Spinner im Button anzuzeigen

5. **Wichtige Parameter-Uebergaben** (damit Upload weiterhin korrekt funktioniert):
   - `activeTaxFilerId` wird aus `useTaxFiler()` geholt
   - `taxYear` kommt aus `useFormContext()`
   - `userId` wird aus `supabase.auth.getSession()` gelesen
   - `checklistItemId` und `checklistItemTitle` kommen direkt vom jeweiligen ChecklistItem

### Imports hinzufuegen
- `EncryptedDocumentService` aus `@/services/EncryptedDocumentService`
- `validateFile` aus `@/utils/fileValidation`
- `useTaxFiler` aus `@/contexts/TaxFilerContext`
- `Loader2` Icon (bereits importiert)

### Bestehende Funktionalitaet bleibt erhalten
- Die separate Upload-Seite (`DocumentUploadPage`) bleibt bestehen fuer Faelle mit Dokumenten-Validierung/OCR
- Die `UploadActionSheet` (Foto/Scan/Datei) wird nicht beruehrt
- Alle bestehenden RLS-Policies und Verschluesselung bleiben aktiv

