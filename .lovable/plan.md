

# Fix: Upload auf Mobile reparieren - zurueck zum bewaehrten Ansatz

## Ursache

Der `uploadFromBuffer()`-Ansatz, den wir eingefuehrt haben, funktioniert nicht auf Mobile. Die Annahme "Datei kann nach OCR nicht mehr gelesen werden" war falsch: Der bestehende `EnhancedDocumentUploader` beweist, dass `uploadEncryptedDocument(file)` NACH OCR problemlos auf Mobile funktioniert.

Das Problem liegt im `uploadFromBuffer`/ArrayBuffer-Ansatz selbst - moeglicherweise wird der Buffer waehrend der OCR invalidiert oder es gibt ein WebView-spezifisches Problem mit vorab gelesenen ArrayBuffers.

## Loesung

Zurueck zum bewaehrten `uploadEncryptedDocument(file)` - exakt der gleiche Ansatz, der in `EnhancedDocumentUploader` seit Monaten zuverlaessig auf Mobile funktioniert.

## Technische Aenderungen

### Datei: `src/components/DocumentChecklist.tsx`

1. **State `pendingUploadBuffer` entfernen** - wird nicht mehr benoetigt
2. **`handleQuickUpload`**: `file.arrayBuffer()` Aufruf entfernen. Datei direkt an `executeUpload` uebergeben
3. **`executeUpload`**: Signatur zurueck auf `File` aendern. `uploadEncryptedDocument(file, ...)` statt `uploadFromBuffer(buffer, ...)` aufrufen
4. **`handleOcrConfirm`**: `pendingUploadFile` direkt an `executeUpload` uebergeben

### Aenderungen im Detail

**State-Bereinigung:**
```typescript
// ENTFERNEN:
const [pendingUploadBuffer, setPendingUploadBuffer] = useState<ArrayBuffer | null>(null);
```

**`handleQuickUpload` vereinfachen:**
```typescript
const handleQuickUpload = async (file: File, item: ChecklistItem) => {
  // Validate file
  const validation = await validateFile(file);
  if (!validation.isValid) { ... }

  // KEIN file.arrayBuffer() mehr!
  setPendingUploadFile(file);
  setPendingUploadItem(item);
  // ... OCR drawer oeffnen, OCR laufen lassen ...

  if (result.best.confidence >= 50) {
    executeUpload(file, item);  // File direkt uebergeben
  }
};
```

**`executeUpload` zurueck auf File-basiert:**
```typescript
const executeUpload = async (file: File, item: ChecklistItem) => {
  // ... timeout/error handling bleibt gleich ...
  await encryptedDocService.uploadEncryptedDocument(
    file, item.id, currentUserId, taxYear, item.title, activeTaxFilerId
  );
};
```

**`handleOcrConfirm` vereinfachen:**
```typescript
const handleOcrConfirm = () => {
  if (pendingUploadFile && pendingUploadItem) {
    const file = pendingUploadFile;
    const item = pendingUploadItem;
    // Close drawer, clear state
    setOcrDrawerOpen(false);
    setPendingUploadFile(null);
    setPendingUploadItem(null);
    // Upload mit File-Objekt
    executeUpload(file, item);
  }
};
```

**`handleOcrClose` vereinfachen:**
```typescript
const handleOcrClose = () => {
  setOcrDrawerOpen(false);
  setPendingUploadFile(null);
  setPendingUploadItem(null);
  // KEIN pendingUploadBuffer mehr
};
```

### Keine weiteren Dateien betroffen

`EncryptedDocumentService.ts` bleibt unveraendert - die bestehende `uploadEncryptedDocument()` Methode wird wieder genutzt (die `uploadFromBuffer`-Methode bleibt fuer zukuenftige Verwendung bestehen).

## Warum das funktioniert

```text
AKTUELL (kaputt):
  File --> arrayBuffer() --> [buffer in State] --> OCR(file) --> uploadFromBuffer(buffer) HAENGT

NEU (bewaehrt - gleicher Ansatz wie EnhancedDocumentUploader):
  File --> [file in State] --> OCR(file) --> uploadEncryptedDocument(file) --> OK!
```

Der `EnhancedDocumentUploader` nutzt exakt diesen Ansatz und funktioniert seit Monaten zuverlaessig auf Mobile. Wir uebernehmen das gleiche Muster.

## Erwartetes Ergebnis

- Upload funktioniert auf Mobile wieder (wie im alten Flow)
- Desktop bleibt unberuehrt
- Weniger Code, weniger Komplexitaet
- Bewaehrtes Muster statt experimentellem Buffer-Ansatz
