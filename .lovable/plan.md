
# Fix: Upload haengt auf Mobile - ArrayBuffer direkt durchreichen

## Ursache

Das Problem ist tiefgreifender als nur "File doppelt lesen". Auf mobilen WebViews passiert Folgendes:

1. `file.slice()` erstellt keine echte Kopie der Daten - es referenziert denselben Blob
2. Nach dem OCR-Verbrauch ist der zugrunde liegende Blob auf manchen mobilen WebViews nicht mehr lesbar
3. `EncryptedDocumentService.uploadEncryptedDocument()` ruft dann `file.arrayBuffer()` auf (Zeile 78) - das haengt endlos
4. Der Drawer schliesst nicht, weil `executeUpload` sofort `setIsConfirming(true)` setzt und der Main Thread durch den haengenden `arrayBuffer()`-Aufruf blockiert wird

## Loesung

Die Datei-Bytes werden **einmal** ganz am Anfang in `handleQuickUpload` gelesen (BEVOR OCR startet). Der resultierende `ArrayBuffer` wird direkt an `executeUpload` weitergereicht. `executeUpload` uebergibt den Buffer an `EncryptedDocumentService` ueber eine neue Methode, die keinen erneuten `file.arrayBuffer()`-Aufruf benoetigt.

## Technische Aenderungen

### 1. `src/components/DocumentChecklist.tsx`

**`handleQuickUpload`**: Datei sofort in ArrayBuffer lesen, bevor OCR startet:

```typescript
const handleQuickUpload = async (file: File, item: ChecklistItem) => {
  // Validate file
  const validation = await validateFile(file);
  if (!validation.isValid) { ... }

  // Read file bytes ONCE before OCR consumes the File object.
  // Mobile WebViews cannot re-read a File after it's been consumed.
  const fileBuffer = await file.arrayBuffer();
  
  // Store buffer + metadata for upload
  setPendingUploadFile(file);       // only for display (name, type)
  setPendingUploadItem(item);
  // ... open drawer, run OCR with original file ...

  if (result.best.confidence >= 50) {
    executeUpload(fileBuffer, file.name, file.type, item);  // pass buffer directly
  }
};
```

**`executeUpload`**: Signatur aendern - nimmt jetzt `ArrayBuffer` + Metadaten statt `File`:

```typescript
const executeUpload = async (
  fileBuffer: ArrayBuffer,
  fileName: string,
  fileType: string,
  item: ChecklistItem
) => {
  // ... same timeout/error handling ...
  await encryptedDocService.uploadFromBuffer(
    fileBuffer, fileName, fileType,
    item.id, currentUserId, taxYear, item.title, activeTaxFilerId
  );
};
```

**`handleOcrConfirm`**: Ebenfalls Buffer durchreichen (aus einer neuen State-Variable `pendingUploadBuffer`).

### 2. `src/services/EncryptedDocumentService.ts`

Neue Methode `uploadFromBuffer()` hinzufuegen, die einen bereits gelesenen `ArrayBuffer` akzeptiert:

```typescript
async uploadFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  fileType: string,
  checklistItemId: string | null,
  userId: string,
  taxYear: string,
  checklistItemTitle?: string,
  taxFilerId?: string | null
): Promise<void> {
  // Get encryption key
  const encryptionKey = await this.keyService.getUserEncryptionKey(userId);
  
  // Hash + encrypt from buffer directly - NO file.arrayBuffer() call
  const integrityHash = await this.cryptoService.generateIntegrityHash(buffer);
  const { encryptedData, iv } = await this.cryptoService.encryptBuffer(buffer, encryptionKey);
  
  // ... rest of upload logic (metadata encryption, storage upload, DB insert)
}
```

### 3. Neuer State: `pendingUploadBuffer`

Ein neuer State `pendingUploadBuffer` speichert den vorab gelesenen ArrayBuffer fuer den Fall, dass der User manuell bestaetigt ("trotzdem einreichen"):

```typescript
const [pendingUploadBuffer, setPendingUploadBuffer] = useState<ArrayBuffer | null>(null);
```

## Datenfluss nach dem Fix

```text
File-Input --> [file]
                |
          arrayBuffer() (EINMAL, sofort)
                |
          [fileBuffer] wird gespeichert
                |
         +------+------+
         |             |
    OCR (file)    Upload (fileBuffer)
    verbraucht    frischer Buffer
    den File      kein File.read noetig
```

## Erwartetes Ergebnis

- Kein `file.arrayBuffer()`-Aufruf mehr in EncryptedDocumentService fuer diesen Flow
- Upload kann nicht mehr haengen wegen verbrauchtem File-Objekt
- Desktop bleibt unberuehrt
- Drawer schliesst sofort, Upload laeuft im Hintergrund
