

# Fix: Dokument nach Upload nicht sichtbar + "Trotzdem hochladen" scheint nicht zu funktionieren

## Das eigentliche Problem

Der Upload selbst funktioniert -- sowohl bei hoher als auch bei niedriger OCR-Konfidenz ("Trotzdem einreichen"). Das Problem ist, dass die Checkliste danach nicht aktualisiert wird, weil die `loadDocuments`-Funktion durch einen **3-Sekunden-Throttle** und einen **5-Minuten-Cache** blockiert wird.

Der letzte Fix hat zwar `skipDocSyncRef` und den direkten Aufruf von `formContextLoadDocuments()` in `DocumentChecklist.tsx` eingebaut, aber der entscheidende Teil wurde vergessen: Die `loadDocuments`-Funktion in `useFormDataOperations.tsx` akzeptiert keinen `forceRefresh`-Parameter. Deshalb wird der Aufruf nach dem Upload einfach ignoriert.

## Aenderungen

### 1. `src/contexts/form/useFormDataOperations.tsx`
- `loadDocuments` bekommt einen optionalen `forceRefresh`-Parameter
- Wenn `forceRefresh = true`: Throttle (3s) und Cache (5min) werden uebersprungen
- Keine anderen Aenderungen an der Logik

### 2. `src/contexts/form/FormContext.tsx`
- Die Wrapper-Funktion `loadDocuments` (Zeile 933) reicht den `forceRefresh`-Parameter an die darunterliegende Funktion weiter

### 3. `src/components/DocumentChecklist.tsx`
- `handleSheetUploaded` ruft `formContextLoadDocuments(true)` auf, um den Throttle/Cache zu umgehen

## Technische Details

```text
Aktueller Ablauf nach Upload:
  handleSheetUploaded()
    -> markUploaded(itemId, true)           -- optimistisch OK
    -> setTimeout 1s
      -> formContextLoadDocuments()          -- BLOCKIERT (Throttle 3s / Cache 5min)
      -> skipDocSyncRef = false              -- useEffect setzt uploaded zurueck auf false!

Neuer Ablauf:
  handleSheetUploaded()
    -> markUploaded(itemId, true)           -- optimistisch OK
    -> setTimeout 1s
      -> formContextLoadDocuments(true)      -- FORCE: Throttle/Cache ignoriert
      -> Dokument wird aus DB geladen
      -> skipDocSyncRef = false              -- useEffect bestaetigt uploaded = true
```

## Umfang
- `src/contexts/form/useFormDataOperations.tsx` -- forceRefresh-Parameter fuer loadDocuments
- `src/contexts/form/FormContext.tsx` -- Parameter weiterreichen
- `src/components/DocumentChecklist.tsx` -- forceRefresh=true beim Aufruf nach Upload
