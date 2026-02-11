

# Fix: Upload auf Mobile direkt ausfuehren -- OCR ueberspringen

## Das Problem

Wir drehen uns im Kreis, weil jeder Versuch, OCR VOR dem Upload auszufuehren, auf Mobile scheitert. Der OCR-Prozess verursacht Speicherdruck im WebView, der nachfolgende Operationen (file.arrayBuffer, Supabase-Aufrufe, etc.) zum Haengen bringt.

**Die funktionierenden Flows** (EnhancedDocumentUploader, InlineDocumentUploader, DocumentUploader) haben ALLE eines gemeinsam: Sie rufen `uploadEncryptedDocument` sofort mit der frischen Datei auf -- ohne OCR dazwischen.

## Die Loesung

Auf Mobile: OCR komplett ueberspringen und direkt hochladen -- genau wie die funktionierenden Flows. Auf Desktop: OCR beibehalten (funktioniert dort problemlos).

## Ablauf

```text
MOBILE:                          DESKTOP:
Datei waehlen                    Datei waehlen
    |                                |
Datei validieren                 Datei validieren
    |                                |
Sofort hochladen                 OCR-Drawer oeffnen
(uploadEncryptedDocument)            |
    |                            OCR-Validierung
Toast: "Erfolgreich"                 |
                                 Ergebnis anzeigen
                                     |
                                 Upload starten
```

## Technische Aenderungen

### Datei: `src/components/DocumentChecklist.tsx`

**In `handleQuickUpload`** -- Mobile-Erkennung hinzufuegen:

```typescript
const handleQuickUpload = async (file: File, item: ChecklistItem) => {
  try {
    const capturedUserId = userId;
    if (!capturedUserId) {
      toast({ title: 'Nicht angemeldet', ... });
      return;
    }

    const validation = await validateFile(file);
    if (!validation.isValid) {
      toast({ title: 'Ungueltige Datei', ... });
      return;
    }

    // MOBILE: Skip OCR, upload directly (like multi-click flow)
    if (isMobile) {
      executeDirectUpload(file, item, capturedUserId);
      return;
    }

    // DESKTOP: OCR validation flow (unchanged)
    const fileBuffer = await file.arrayBuffer();
    setPendingUploadFile(file);
    setPendingUploadItem(item);
    setPendingUploadBuffer(fileBuffer);
    // ... rest of OCR flow unchanged ...
  }
};
```

**Neue Funktion `executeDirectUpload`** -- identisch mit den funktionierenden Flows:

```typescript
const executeDirectUpload = async (
  file: File,
  item: ChecklistItem,
  capturedUserId: string
) => {
  const timeoutMs = 90000;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    setUploadingItems(prev => [...prev, item.id]);
    setUploadStepInfo(prev => ({ ...prev, [item.id]: 'Hochladen...' }));

    const uploadPromise = (async () => {
      const activeTaxFilerId = localStorage.getItem('activeTaxFilerId')
        || sessionStorage.getItem('ditax_selected_tax_filer');
      const encryptedDocService = EncryptedDocumentService.getInstance();

      // Direct upload with fresh file -- proven to work
      await encryptedDocService.uploadEncryptedDocument(
        file,          // Fresh file, no OCR delay
        item.id,
        capturedUserId,
        taxYear,
        item.title,
        activeTaxFilerId
      );

      setUploadStepInfo(prev => { const n = {...prev}; delete n[item.id]; return n; });
      toast({ title: 'Erfolgreich hochgeladen', description: `${item.title} wurde hochgeladen.` });
      markUploaded(item.id, true);
      refreshDocuments();
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Upload-Timeout')), timeoutMs);
    });

    await Promise.race([uploadPromise, timeoutPromise]);
  } catch (error: any) {
    console.error('[executeDirectUpload] Error:', error);
    setUploadStepInfo(prev => ({ ...prev, [item.id]: 'FEHLER!' }));
    toast({ title: 'Upload fehlgeschlagen', description: error.message || 'Bitte versuche es erneut.', variant: 'destructive' });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    setUploadingItems(prev => prev.filter(id => id !== item.id));
    setUploadStepInfo(prev => { const n = {...prev}; delete n[item.id]; return n; });
  }
};
```

**`executeUpload` (fuer Desktop-OCR-Flow)** bleibt wie bisher mit `uploadFromBuffer`.

## Warum das funktioniert

- Auf Mobile: exakt derselbe Code-Pfad wie die funktionierenden Multi-Click-Flows
- `uploadEncryptedDocument` wird sofort mit der frischen Datei aufgerufen
- Kein OCR, kein Buffer-Pre-Read, kein Session-Management
- Auf Desktop: OCR bleibt erhalten (funktioniert dort)

## Zusammenfassung

- 1 Datei geaendert: `src/components/DocumentChecklist.tsx`
- Neue Funktion `executeDirectUpload` (kopiert den bewaehrten Upload-Pfad)
- `handleQuickUpload` prueft `isMobile` und umgeht OCR komplett
- Desktop-OCR-Flow bleibt unveraendert
