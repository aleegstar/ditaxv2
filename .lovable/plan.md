

# Fix: Dokument wird nach Upload nicht in der Checkliste angezeigt

## Ursache des Problems

Es gibt einen **Race-Condition-Bug** in `DocumentChecklist.tsx`:

1. Nach erfolgreichem Upload ruft `handleSheetUploaded` zwei Dinge auf:
   - `markUploaded(itemId, true)` -- markiert das Item optimistisch als hochgeladen
   - `refreshDocuments()` -- laedt Dokumente neu aus der Datenbank

2. Das Problem: `refreshDocuments` ist **gedrosselt** (3-Sekunden-Throttle + 500ms Debounce). Die Dokumente werden also nicht sofort aus der Datenbank nachgeladen.

3. Ein `useEffect` auf Zeile 123-132 synchronisiert die Checklist-Items mit dem tatsaechlichen `documents`-Array:

```text
useEffect: Fuer jedes checklist-Item:
  Wenn item.uploaded !== documentStatus.has(item.id)
    -> markUploaded(item.id, hasDocuments)
```

4. Da `documents` noch NICHT das neue Dokument enthaelt (weil refreshDocuments gedrosselt wurde), **setzt dieser useEffect das Item sofort zurueck auf `uploaded: false`**.

Das erklaert auch, warum "Trotzdem hochladen" scheinbar nicht funktioniert -- der Upload gelingt tatsaechlich, aber die Checkliste zeigt es nicht an, weil der Status sofort wieder zurueckgesetzt wird.

## Loesung

### Datei: `src/components/DocumentChecklist.tsx`

**1. `refreshDocuments` durch direkten `loadDocuments`-Aufruf ersetzen** und den Throttle umgehen, indem wir den FormContext direkt nutzen:

```typescript
const handleSheetUploaded = useCallback(async (itemId: string) => {
  markUploaded(itemId, true);
  toast({ title: 'Erfolgreich hochgeladen', description: 'Dokument wurde hochgeladen.' });
  
  // Direkt Dokumente neu laden (nicht ueber refreshDocuments, das gedrosselt ist)
  // Kurze Verzoegerung, damit die DB den neuen Eintrag committed hat
  setTimeout(async () => {
    await loadDocuments();
  }, 1000);
}, [markUploaded, loadDocuments, toast]);
```

**2. useEffect-Sync schuetzen**: Den `useEffect` auf Zeile 123-132 so anpassen, dass er waehrend eines laufenden Uploads das optimistische `markUploaded` nicht zuruecksetzt. Dazu einen `skipSyncRef` verwenden:

```typescript
const skipDocSyncRef = useRef(false);

const handleSheetUploaded = useCallback(async (itemId: string) => {
  skipDocSyncRef.current = true; // Sync pausieren
  markUploaded(itemId, true);
  toast({ title: 'Erfolgreich hochgeladen', description: 'Dokument wurde hochgeladen.' });
  
  setTimeout(async () => {
    await loadDocuments();
    skipDocSyncRef.current = false; // Sync wieder aktivieren
  }, 1000);
}, [markUploaded, loadDocuments, toast]);

// useEffect anpassen:
useEffect(() => {
  if (skipDocSyncRef.current) return; // Nicht zuruecksetzen waehrend Upload
  if (checklistItems.length > 0) {
    checklistItems.forEach(item => {
      const hasDocuments = documentStatus.has(item.id);
      if (item.uploaded !== hasDocuments) {
        markUploaded(item.id, hasDocuments);
      }
    });
  }
}, [documentStatus, checklistItems, markUploaded]);
```

### Datei: `src/contexts/form/FormContext.tsx`

**3. Throttle beim Nachladen nach Upload umgehen**: Die `loadDocuments`-Funktion im FormContext hat einen 3-Sekunden-Throttle. Fuer den Fall nach einem Upload muss dieser uebersprungen werden. Alternativ: Da wir `loadDocuments` direkt aus FormContext aufrufen (nicht ueber use-documents), umgeht das bereits den Debounce in `use-documents.ts`. Aber der Throttle in `useFormDataOperations` (`lastDocumentLoadTime.current < 3000`) blockiert trotzdem.

Loesung: Einen optionalen `force`-Parameter hinzufuegen:

```typescript
// In useFormDataOperations.tsx
const loadDocuments = useCallback(async (forceRefresh = false) => {
  if (!taxYear) return;
  if (isLoadingDocumentsRef.current) return;
  
  const now = Date.now();
  if (!forceRefresh && now - lastDocumentLoadTime.current < 3000) {
    return; // Throttle nur wenn nicht erzwungen
  }
  // ... rest der Logik
}, [...]);
```

Und in FormContext.tsx die gleiche Signatur weiterreichen.

## Zusammenfassung

| Problem | Ursache | Fix |
|---------|---------|-----|
| Dokument nicht in Checkliste sichtbar | useEffect setzt optimistisches markUploaded zurueck, weil documents-Array noch alt ist | skipSyncRef waehrend Upload-Nachladen |
| refreshDocuments laedt nicht neu | 3s Throttle + 500ms Debounce blockiert | force-Parameter fuer Nachladen nach Upload |
| "Trotzdem hochladen" scheint nicht zu funktionieren | Upload gelingt, aber UI zeigt es nicht | Gleicher Fix -- das Problem war nie der Upload selbst |

## Umfang
- `src/components/DocumentChecklist.tsx` -- skipSyncRef + handleSheetUploaded anpassen
- `src/contexts/form/useFormDataOperations.tsx` -- force-Parameter fuer loadDocuments
- `src/contexts/form/FormContext.tsx` -- force-Parameter weiterreichen
