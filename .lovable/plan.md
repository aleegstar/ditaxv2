

# Fix: file.arrayBuffer() haengt auf Mobile -- uploadFromBuffer nutzen

## Das eigentliche Problem

Der Button zeigt "Hochladen..." und haengt -- das bedeutet, `uploadEncryptedDocument()` wird aufgerufen aber kommt nie zurueck. Innerhalb dieser Funktion ist der **erste await** nach dem Key-Cache: `file.arrayBuffer()` (Zeile 78 in EncryptedDocumentService.ts).

Es gibt sogar schon einen Kommentar im Code (Zeile 476):
```text
Upload from a pre-read ArrayBuffer (avoids file.arrayBuffer() which hangs on mobile WebViews)
```

Die Methode `uploadFromBuffer()` existiert bereits -- sie wurde genau fuer dieses Problem gebaut. Aber `executeUpload` nutzt stattdessen `uploadEncryptedDocument()`, das `file.arrayBuffer()` intern aufruft. Nach 15 Sekunden OCR-Verarbeitung (Speicherdruck, WebView-GC) haengt dieser Aufruf im mobilen WebView.

**Warum der Multi-Click-Flow funktionierte:** Dort wurde sofort hochgeladen, ohne OCR-Wartezeit. Die Datei war "frisch" und `file.arrayBuffer()` funktionierte noch.

## Die Loesung

1. Den File-Buffer **vor** der OCR-Validierung lesen (solange die Datei frisch ist)
2. Den Buffer zwischenspeichern
3. In `executeUpload` die vorhandene Methode `uploadFromBuffer()` statt `uploadEncryptedDocument()` nutzen

## Technische Aenderungen

### Datei: `src/components/DocumentChecklist.tsx`

**1. Neuen State fuer den vorgelesenen Buffer (bei den anderen useState-Deklarationen):**

```typescript
const [pendingUploadBuffer, setPendingUploadBuffer] = useState<ArrayBuffer | null>(null);
```

**2. In `handleQuickUpload` -- Buffer VOR OCR lesen (nach Datei-Validierung, vor OCR-Start):**

```typescript
// Read file buffer NOW while file reference is fresh
// (file.arrayBuffer() hangs in mobile WebViews after OCR processing)
const fileBuffer = await file.arrayBuffer();

// ... dann OCR starten ...
```

**3. In `executeUpload` -- `uploadFromBuffer` statt `uploadEncryptedDocument` nutzen:**

```typescript
const executeUpload = async (
  file: File,
  item: ChecklistItem,
  capturedUserId: string,
  preReadBuffer: ArrayBuffer  // NEU
) => {
  // ...
  // VORHER:
  // await encryptedDocService.uploadEncryptedDocument(file, ...);

  // NACHHER:
  await encryptedDocService.uploadFromBuffer(
    preReadBuffer,        // Schon vor OCR gelesen
    file.name,
    file.type,
    item.id,
    currentUserId,
    taxYear,
    item.title,
    activeTaxFilerId
  );
};
```

**4. Alle Aufrufe von `executeUpload` aktualisieren:**

- In `handleQuickUpload` (confidence >= 50): `executeUpload(file, item, capturedUserId, fileBuffer)`
- In `handleOcrConfirm`: Buffer aus State lesen und uebergeben

**5. `handleOcrConfirm` -- pendingUploadBuffer nutzen:**

```typescript
const handleOcrConfirm = () => {
  if (pendingUploadFile && pendingUploadItem && pendingUploadBuffer) {
    // ...
    executeUpload(file, item, capturedUserId, pendingUploadBuffer);
  }
};
```

**6. Cleanup -- pendingUploadBuffer bei Reset zuruecksetzen:**

An allen Stellen, wo `setPendingUploadFile(null)` steht, auch `setPendingUploadBuffer(null)` aufrufen.

## Warum das funktioniert

- `file.arrayBuffer()` wird aufgerufen, solange die Datei-Referenz frisch ist (vor OCR)
- Nach der OCR wird nur noch der bereits gelesene Buffer verwendet
- `uploadFromBuffer` existiert genau fuer diesen Zweck und ist bewaehrt
- Kein `file.arrayBuffer()` mehr nach der OCR-Phase
- Keine Session-Manipulation noetig -- der Supabase-Client behaelt seinen Token

## Betroffene Dateien

- `src/components/DocumentChecklist.tsx` (einzige Datei)
