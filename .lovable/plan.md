

# Dokument-Upload auf Mobile: OCR-Timeout-Problem beheben

## Problem-Analyse

Der Upload-Flow auf Mobile funktioniert so:
1. Nutzer wahlt Datei aus
2. OCR-Drawer offnet sich, `DocumentValidator.validate()` startet
3. Auf Mobile wird **tesseract-wasm** verwendet, das folgende Schritte ausfuhrt:
   - 3 HEAD-Requests um Dateien zu prufen (`tesseract-worker.js`, `tesseract-core.wasm`, `deu.traineddata`)
   - Web Worker erstellen und WASM laden
   - Deutsches Sprachmodell laden (~1.6MB Download)
   - Bild komprimieren und OCR ausfuhren

**Das Kernproblem:** Die OCR-Validierung selbst hat **keinen Timeout**. Auf mobilen WebViews kann tesseract-wasm hangen (WASM-Kompatibilitat, langsames Netzwerk, Worker-Probleme). Erst danach wird `executeUpload` aufgerufen, das zwar einen 30s-Timeout hat -- aber zu diesem Zeitpunkt hat der Nutzer bereits lange gewartet.

Auf Desktop funktioniert es, weil Tesseract.js dort schneller und zuverlassiger lauft.

## Losung

### 1. OCR-Validation-Timeout hinzufugen (15 Sekunden)

In `handleQuickUpload` in `DocumentChecklist.tsx` wird die `validator.validate()`-Aufruf mit einem `Promise.race` gegen einen 15-Sekunden-Timeout gewrappt. Wenn der Timeout eintritt:
- OCR wird ubersprungen
- Ein Fallback-Ergebnis mit niedriger Konfidenz (0%) wird erzeugt
- Der Nutzer sieht den "result"-Screen und kann trotzdem einreichen

### 2. tesseract-wasm Initialisierung mit Timeout absichern

In `TesseractWasmOcrService.ts` wird die `doInitialize()`-Methode mit einem 10-Sekunden-Timeout versehen. Wenn die WASM-Dateien nicht rechtzeitig laden, gibt die Initialisierung `false` zuruck, anstatt ewig zu hangen.

### 3. executeUpload-Timeout auf Gesamtflow abstimmen

Der bestehende 30s-Timeout in `executeUpload` bleibt, ist aber jetzt effektiver, weil die OCR-Phase nicht mehr endlos laufen kann.

## Technische Details

### Datei 1: `src/components/DocumentChecklist.tsx`

In `handleQuickUpload`: `validator.validate()` mit Promise.race und 15s Timeout wrappen:

```typescript
const OCR_TIMEOUT_MS = 15000;

// Race OCR validation against timeout
let result: ValidationResult;
try {
  result = await Promise.race([
    validator.validate(file, item.id, (progress) => {
      setValidationProgress(progress);
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OCR_TIMEOUT')), OCR_TIMEOUT_MS)
    )
  ]);
} catch (timeoutError: any) {
  if (timeoutError.message === 'OCR_TIMEOUT') {
    console.warn('[handleQuickUpload] OCR timeout - skipping validation');
    // Create fallback result with low confidence -> shows manual confirm screen
    result = {
      best: { docTypeId: item.id, confidence: 0 },
      candidates: [{ docTypeId: item.id, confidence: 0 }],
      signals: { meta: undefined, layout: undefined, keywords: undefined },
      needsUserConfirmation: true
    };
  } else {
    throw timeoutError;
  }
}
```

### Datei 2: `src/services/TesseractWasmOcrService.ts`

In `doInitialize()`: 10-Sekunden-Timeout fur die gesamte Initialisierung:

```typescript
private async doInitialize(): Promise<boolean> {
  const INIT_TIMEOUT = 10000;
  try {
    const initResult = await Promise.race([
      this.doInitializeInternal(),
      new Promise<boolean>((resolve) =>
        setTimeout(() => {
          console.warn('[TesseractWasm] Initialization timeout (10s)');
          resolve(false);
        }, INIT_TIMEOUT)
      )
    ]);
    return initResult;
  } catch (error) {
    // ... existing error handling
    return false;
  }
}
```

## Erwartetes Ergebnis

- Auf Mobile wird der Upload nie langer als ~15s im OCR-Schritt stecken bleiben
- Bei Timeout sieht der Nutzer den manuellen Bestatigungsscreen ("Dokument trotzdem einreichen")
- Auf Desktop andert sich nichts (Tesseract.js ist schnell genug)
- Kein Datenverlust -- der Nutzer kann immer noch hochladen

