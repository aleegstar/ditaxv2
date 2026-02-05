
# Plan: OCR-Erkennung auf Mobile aktivieren

## Problem gefunden

Die OCR-Dokumentprüfung wird auf Mobile **vollständig übersprungen**. In `EnhancedDocumentUploader.tsx` Zeile 385-388:

```typescript
// MOBILE: Skip document validation entirely (temporarily disabled)
if (isMobileAppContext()) {
  console.log('[Upload] Mobile detected - skipping document validation');
  await performUpload(filesToUpload);
  return;
}
```

Dieser Code wurde als "temporäre" Lösung eingefügt, als die tesseract-wasm Dateien noch fehlten. Jetzt sind alle WASM-Dateien vorhanden:

| Datei | Status |
|-------|--------|
| `deu.traineddata` | Vorhanden |
| `tesseract-core.wasm` | Vorhanden |
| `tesseract-core-fallback.wasm` | Vorhanden |
| `tesseract-worker.js` | Vorhanden |

## Lösung

Die Mobile-Bypass-Logik entfernen und OCR aktivieren.

### Änderung in EnhancedDocumentUploader.tsx

**Vorher (Zeile 384-389):**
```typescript
// MOBILE: Skip document validation entirely (temporarily disabled)
if (isMobileAppContext()) {
  console.log('[Upload] Mobile detected - skipping document validation');
  await performUpload(filesToUpload);
  return;
}
```

**Nachher:**
```typescript
// Document validation now works on mobile via tesseract-wasm
// All WASM files are present in /public/ocr/
```

Der gesamte if-Block wird entfernt, sodass sowohl Desktop als auch Mobile die Validierung durchlaufen.

## OCR-Ablauf nach Fix

```text
Dokument hochladen (Mobile)
         │
         ▼
┌─────────────────────────┐
│ documentValidator.      │
│ validate()              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Native OCR verfügbar?   │
│ (Despia v3.6+ OCR)      │
└───────────┬─────────────┘
            │ Nein
            ▼
┌─────────────────────────┐
│ isMobileAppContext()?   │ ── Ja ──▶ tesseract-wasm
└───────────┬─────────────┘         (lokale WASM-OCR)
            │ Nein
            ▼
┌─────────────────────────┐
│ Tesseract.js            │
│ (Desktop-Browser)       │
└─────────────────────────┘
```

## Zu ändernde Datei

- `src/components/EnhancedDocumentUploader.tsx` - Mobile-Bypass entfernen (Zeilen 384-389)

## Erwartetes Ergebnis

- Mobile-Nutzer sehen OCR-Fortschritt beim Dokument-Upload
- Keywords werden aus Bildern erkannt
- Dokumenttyp wird automatisch bestimmt
- Falls OCR scheitert: Fallback auf manuelle Bestätigung
- 100% lokale Verarbeitung (DSGVO-konform)
