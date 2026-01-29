

# Mobile OCR mit tesseract-wasm

## Ubersicht

Da Capacitor OCR nicht verfugbar ist und Despia OCR erst ab v3.6 kommt, implementieren wir `tesseract-wasm` als WebView-kompatible Alternative.

**Warum tesseract-wasm statt tesseract.js?**
- Optimiert fur Browser/WebView Umgebungen
- Kleinere Dateigrosse (~2.1MB vs ~4MB)
- Automatischer SIMD-Fallback fur altere Gerate
- Bessere Web Worker Architektur (OCRClient)
- Bereits als Dependency installiert!

---

## Technischer Plan

### Phase 1: Deutsche Trainingsdaten hinzufugen

Die `deu.traineddata` Datei (~1.6MB) muss in `public/ocr/` abgelegt werden.

**Download-Quelle:** [tessdata_fast/deu.traineddata](https://github.com/tesseract-ocr/tessdata_fast/blob/main/deu.traineddata)

**vite.config.ts anpassen:** Die Datei wird automatisch mit kopiert, da `public/` Ordner direkt ins Build geht.

### Phase 2: TesseractWasmOcrService erstellen

**Neue Datei: `src/services/TesseractWasmOcrService.ts`**

```typescript
import { OCRClient } from 'tesseract-wasm';

class TesseractWasmOcrService {
  private client: OCRClient | null = null;
  private initialized: boolean = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    this.client = new OCRClient();
    await this.client.loadModel('/ocr/deu.traineddata');
    this.initialized = true;
    return true;
  }

  async detectTextFromFile(file: File): Promise<string[]> {
    if (!this.client) return [];
    
    const imageBitmap = await createImageBitmap(file);
    await this.client.loadImage(imageBitmap);
    const text = await this.client.getText();
    
    return text.split('\n').filter(line => line.trim());
  }

  async cleanup(): void {
    this.client?.destroy();
    this.client = null;
    this.initialized = false;
  }
}
```

### Phase 3: DocumentValidator Integration

**Anderungen in `DocumentValidator.ts`:**

```text
Aktuelle Fallback-Kette:
1. Native OCR (Capacitor/Despia) → nicht verfugbar
2. Desktop Browser → Tesseract.js ✓
3. Mobile WebView → Cloud OCR (opt-in) oder keine Validierung

Neue Fallback-Kette:
1. Native OCR (Capacitor/Despia) → nicht verfugbar
2. Desktop Browser → Tesseract.js ✓
3. Mobile WebView → tesseract-wasm (NEU) ✓
4. Fallback → Manuelle Bestatigung
```

**Code-Anderung (Zeile 151-182):**

```typescript
} else if (isDesktopBrowser() || !isMobileAppContext()) {
  // Desktop: Tesseract.js (bereits funktioniert)
  console.log('[DocumentValidator] Using Tesseract.js (desktop browser)');
  keywordSignals = await this.detectKeywordsWithTesseract(file, ...);
  
} else if (isMobileAppContext()) {
  // Mobile WebView: tesseract-wasm (NEU)
  console.log('[DocumentValidator] Using tesseract-wasm (mobile WebView)');
  onProgress?.({ step: 'ocr', percent: 35, message: 'Text wird lokal erkannt...' });
  
  keywordSignals = await this.detectKeywordsWithTesseractWasm(file, (percent) => {
    const mappedPercent = 35 + Math.round(percent * 0.45);
    onProgress?.({ step: 'ocr', percent: mappedPercent, message: 'Lokale OCR...' });
  });
}
```

### Phase 4: Platform Detection anpassen

Die `isMobileAppContext()` Funktion in `platform.ts` erkennt bereits Despia WebViews. Fur tesseract-wasm brauchen wir keine Anderungen.

---

## Dateianderungen

| Datei | Anderung |
|-------|----------|
| `public/ocr/deu.traineddata` | Neu: Deutsche Trainingsdaten (~1.6MB) |
| `src/services/TesseractWasmOcrService.ts` | Neu: Service fur tesseract-wasm OCR |
| `src/services/DocumentValidator.ts` | Anpassung: tesseract-wasm als Mobile-Fallback |

---

## OCR-Fallback Diagramm

```text
Dokument hochgeladen (Bild)
           |
           v
   Native OCR verfugbar?
      /           \
    Ja             Nein
     |               |
     v               v
 Native OCR     Desktop Browser?
 (ML Kit)         /        \
               Ja           Nein (Mobile WebView)
                |               |
                v               v
          Tesseract.js    tesseract-wasm
               |               |
               +-------+-------+
                       |
                       v
               Keywords erkannt?
                  /        \
                Ja          Nein
                 |            |
                 v            v
            Automatische   Manuelle
            Zuordnung      Bestatigung
```

---

## Leistung und Speicher

| Aspekt | Wert |
|--------|------|
| WASM Core | ~700KB (Brotli) |
| Fallback WASM | ~650KB (Brotli) |
| Deutsche Trainingsdaten | ~1.6MB |
| **Gesamt (erste Nutzung)** | **~3MB Download** |
| Erkennungszeit | 2-5 Sekunden pro Bild |
| Speicherverbrauch | ~50-100MB wahrend OCR |

---

## Vorteile dieser Losung

1. **100% lokal** - Alle Daten bleiben auf dem Gerat (DSGVO-konform)
2. **Kein Cloud-Consent notig** - Funktioniert ohne Zustimmung
3. **WebView-kompatibel** - Funktioniert in Despia vor v3.6
4. **Automatischer SIMD-Fallback** - Unterstutzt altere Gerate
5. **Zukunftssicher** - Kann spater durch Despia OCR ersetzt werden

---

## Aufwand

| Phase | Aufwand | Beschreibung |
|-------|---------|--------------|
| 1 | ~0.5h | Trainingsdaten hinzufugen |
| 2 | ~2h | TesseractWasmOcrService erstellen |
| 3 | ~1.5h | DocumentValidator Integration |
| 4 | ~1h | Testing in Mobile WebView |

**Gesamt:** ~5 Stunden

---

## Hinweis fur spater

Wenn Despia v3.6 verfugbar ist, kann `NativeOcrService.ts` das native OCR nutzen. Der Code dafur ist bereits vorhanden:

```typescript
// In NativeOcrService.ts (bereits implementiert):
if (typeof (window as any).despia?.ocr?.recognizeText === 'function') {
  this.useDespia = true;
  this.available = true;
}
```

tesseract-wasm bleibt dann als Fallback fur altere Despia-Versionen.

