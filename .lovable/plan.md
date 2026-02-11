
# Fix: Datei wird auf Mobile doppelt gelesen und haengt

## Ursache

Das Problem liegt daran, dass die Datei **zweimal** gelesen wird:

1. **OCR-Phase**: `TesseractWasmOcrService` liest die Datei via `FileReader.readAsDataURL()` und `file.arrayBuffer()`
2. **Upload-Phase**: `EncryptedDocumentService` liest dieselbe Datei nochmal mit `file.arrayBuffer()`

Auf mobilen WebViews (Android Despia/Appelix) kann ein `File`-Objekt aus einem `<input type="file">` oft nur **einmal** gelesen werden. Der zweite Leseversuch haengt dann endlos -- genau das beobachtete Verhalten.

Auf Desktop-Browsern ist das kein Problem, weil Chrome/Firefox File-Objekte beliebig oft lesen koennen.

## Loesung

Die Datei wird **einmal** zu Beginn von `handleQuickUpload` in einen ArrayBuffer gelesen. Aus diesem Buffer wird ein neuer `Blob` erstellt, der dann als frische, unverbrauchte Datei an den Upload weitergegeben wird.

## Technische Aenderungen

### Datei: `src/components/DocumentChecklist.tsx`

**In `handleQuickUpload`:**

Vor dem OCR-Aufruf die Datei-Daten klonen:

```typescript
const handleQuickUpload = async (file: File, item: ChecklistItem) => {
  try {
    const validation = await validateFile(file);
    if (!validation.isValid) { ... }

    // *** NEU: Datei vorab in Speicher lesen und klonen ***
    // Mobile WebViews koennen File-Objekte nur einmal lesen.
    // OCR verbraucht das Original, daher klonen wir fuer den Upload.
    const fileBuffer = await file.arrayBuffer();
    const uploadFile = new File([fileBuffer], file.name, { type: file.type });

    // Store cloned file for upload
    setPendingUploadFile(uploadFile);  // <-- geklonte Datei statt Original
    setPendingUploadItem(item);
    ...

    // OCR laeuft mit dem Original-File (wird verbraucht)
    result = await Promise.race([
      validator.validate(file, item.id, ...),  // Original-File fuer OCR
      ...
    ]);

    // Upload nutzt die geklonte Datei
    if (result.best.confidence >= 50) {
      ...
      executeUpload(uploadFile, item);  // <-- geklonte Datei
    }
  }
};
```

**In `handleOcrConfirm`:**

Keine Aenderung noetig -- `pendingUploadFile` enthaelt bereits die geklonte Datei.

### Keine weiteren Dateien betroffen

`EncryptedDocumentService`, `CryptoService` und `TesseractWasmOcrService` bleiben unveraendert.

## Warum das funktioniert

```text
VORHER (kaputt auf Mobile):
  File-Input --> [file] --> OCR liest file --> Upload liest file (HAENGT!)

NACHHER (fix):
  File-Input --> [file] --> arrayBuffer() --> new File([buffer])
                    |                              |
                    v                              v
              OCR liest Original            Upload liest Klon (OK!)
```

## Erwartetes Ergebnis

- Upload funktioniert auf Mobile wieder zuverlaessig
- Kein Timeout mehr nach OCR-Abschluss
- Desktop bleibt unberuehrt (funktioniert weiterhin)
- Minimale Aenderung: nur ~4 Zeilen in einer Datei
