
# Plan: OCR-Check auf Mobile reparieren

## Problemanalyse

Der OCR-Check für Dokumente auf Mobile funktioniert nicht, weil:

### Hauptursache: Fehlende WASM-Dateien

Die `tesseract-wasm` Bibliothek benötigt folgende Dateien in `/public/ocr/`:

| Datei | Status | Beschreibung |
|-------|--------|--------------|
| `deu.traineddata` | Vorhanden | Deutsches Sprachmodell |
| `tesseract-core.wasm` | **FEHLT** | Haupt-WASM-Binary |
| `tesseract-core-fallback.wasm` | **FEHLT** | Fallback für ältere Geräte ohne SIMD |
| `tesseract-worker.js` | **FEHLT** | Web Worker für Hintergrundverarbeitung |

### Warum fehlen die Dateien?

Die `vite.config.ts` konfiguriert `viteStaticCopy`, um diese Dateien während des Builds zu kopieren:

```typescript
viteStaticCopy({
  targets: [
    { src: 'node_modules/tesseract-wasm/dist/tesseract-core.wasm', dest: 'ocr' },
    { src: 'node_modules/tesseract-wasm/dist/tesseract-core-fallback.wasm', dest: 'ocr' },
    { src: 'node_modules/tesseract-wasm/dist/tesseract-worker.js', dest: 'ocr' }
  ]
})
```

Dieses Plugin kopiert nur beim **lokalen Build** (`npm run build`), nicht automatisch im Lovable-Deployment.

---

## Lösung

Die fehlenden WASM-Dateien müssen manuell in das `public/ocr/` Verzeichnis kopiert werden.

### Schritt 1: WASM-Dateien hinzufügen

Die Dateien werden aus dem `tesseract-wasm` npm-Paket extrahiert und in `public/ocr/` platziert:

1. **`public/ocr/tesseract-worker.js`** - Web Worker Script
2. **`public/ocr/tesseract-core.wasm`** - Haupt-WASM (mit SIMD-Unterstützung)
3. **`public/ocr/tesseract-core-fallback.wasm`** - Fallback-WASM (ohne SIMD)

### Schritt 2: Fehlerbehandlung verbessern

In `TesseractWasmOcrService.ts` bessere Fehlermeldungen hinzufügen, falls die Dateien fehlen:

```typescript
// Vor der Initialisierung prüfen, ob Worker erreichbar ist
const workerResponse = await fetch('/ocr/tesseract-worker.js', { method: 'HEAD' });
if (!workerResponse.ok) {
  console.error('[TesseractWasm] Worker file not found at /ocr/tesseract-worker.js');
  return false;
}
```

---

## Technische Details

### Dateigrössen (geschätzt)
- `tesseract-worker.js`: ~50 KB
- `tesseract-core.wasm`: ~2 MB (mit SIMD)
- `tesseract-core-fallback.wasm`: ~2 MB (ohne SIMD)
- `deu.traineddata`: ~1.6 MB (bereits vorhanden)

### OCR-Routing auf Mobile

```text
Mobile Dokument-Upload
         │
         ▼
┌─────────────────────────┐
│ Native OCR verfügbar?   │
│ (Despia v3.6+ nötig)    │
└───────────┬─────────────┘
            │ Nein (aktuell)
            ▼
┌─────────────────────────┐
│ tesseract-wasm          │ ← HIER SCHEITERT ES
│ (WebView-optimiert)     │   (WASM-Dateien fehlen)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Manuelle Bestätigung    │
│ (Fallback)              │
└─────────────────────────┘
```

---

## Umsetzung

### Zu erstellende Dateien

1. `public/ocr/tesseract-worker.js`
2. `public/ocr/tesseract-core.wasm`  
3. `public/ocr/tesseract-core-fallback.wasm`

### Zu ändernde Dateien

1. `src/services/TesseractWasmOcrService.ts` - Bessere Fehlerbehandlung

---

## Erwartetes Ergebnis

Nach der Implementierung:
- Mobile OCR funktioniert mit tesseract-wasm
- Dokumente werden lokal auf dem Gerät analysiert
- Keywords werden erkannt und der Dokumenttyp automatisch bestimmt
- 100% DSGVO-konform (keine Cloud-Übertragung)
