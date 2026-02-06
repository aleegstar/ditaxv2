# Plan: Inline-Upload in Dokumenten-Checkliste

## Status: ✅ Implementiert

Die Inline-Upload-Funktionalität wurde erfolgreich in `DocumentChecklist.tsx` implementiert.

---

## Ergebnis

**Vorher:** Klick → Navigation → Klick → Datei → Klick → OCR → Upload (7 Schritte)  
**Nachher:** Klick → Datei → OCR → Upload (4 Schritte)

---

## Implementierte Änderungen

### 1. Neue Imports
- `useTaxFiler` für taxFilerId
- `EncryptedDocumentService` für Upload
- `DocumentValidator` für OCR-Validierung
- `AIDocumentValidation` und `DocumentCheckScreen` für Modals
- `validateFile` für Datei-Prüfung

### 2. State-Variablen
- `processingItemId` / `processingFile`
- `isValidating` / `validationProgress` / `validationResult`
- `showCheckScreen` / `isUploading`
- `fileInputRef` (hidden input)

### 3. Handler-Funktionen
- `handleInlineUploadClick()` - Triggert File-Picker
- `handleFileSelected()` - Verarbeitet Datei-Auswahl
- `performValidationAndUpload()` - OCR + Auto-Upload
- `performUpload()` - Upload mit korrekten Parametern
- `resetUploadState()` - State zurücksetzen
- `handleCheckConfirm()` / `handleCheckReupload()`

### 4. UI-Änderungen
- Upload-Button triggert jetzt `handleInlineUploadClick()`
- Button zeigt Loading-State während Verarbeitung
- Hidden File-Input am Ende der Komponente
- Validation-Modal und Check-Screen als Dialoge

---

## Parameter-Sicherheit

| Parameter | Quelle | Status |
|-----------|--------|--------|
| `file` | Datei-Auswahl | ✅ |
| `checklistItemId` | `item.id` | ✅ |
| `userId` | `supabase.auth.getSession()` | ✅ |
| `taxYear` | `useFormContext()` | ✅ |
| `checklistItemTitle` | `item.title` | ✅ |
| `taxFilerId` | `useTaxFiler()` + sessionStorage Fallback | ✅ |

---

## Unveränderte Dateien

- `EncryptedDocumentService` ✅
- `DocumentValidator` ✅
- `TesseractWasmOcrService` ✅
- `EnhancedDocumentUploader` ✅ (bleibt als Fallback)
