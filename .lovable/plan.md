

# Fix: Dokument-Upload in Checkliste -- endgueltige Loesung

## Ursache

Das Problem ist eine **State-Synchronisations-Schleife** zwischen drei konkurrierenden Mechanismen:

1. **Optimistisches Update**: `markUploaded(itemId, true)` setzt den Status sofort
2. **FormContext.loadDocuments**: Holt Dokumente und ueberschreibt `checklistItems` komplett via `setChecklistItems` (Zeile 967-972)
3. **useEffect-Sync** (Zeile 143-155): Synchronisiert `checklistItems` mit `documentStatus` (basierend auf `documents` aus `useDocuments`)

Das Problem: `skipDocSyncRef.current = false` wird im `finally`-Block **synchron** gesetzt, BEVOR React die State-Updates aus `formContextLoadDocuments` verarbeitet hat. Dadurch kann der `useEffect` mit veralteten Daten laufen und den Status zuruecksetzen.

## Loesung

Die Loesung ist einfach und robust: Den `skipDocSyncRef` erst zuruecksetzen, **nachdem** React die State-Updates verarbeitet hat (naechster Render-Zyklus).

### Datei: `src/components/DocumentChecklist.tsx`

**handleSheetUploaded anpassen:**

```text
handleSheetUploaded(itemId):
  1. skipDocSyncRef = true
  2. markUploaded(itemId, true)              -- optimistisch
  3. documentService.clearCache()
  4. setTimeout 1500ms:
     - await formContextLoadDocuments(true)   -- laedt frische Daten
     - NICHT sofort skipDocSyncRef = false!
     - Stattdessen: setTimeout(0) -> skipDocSyncRef = false
       (wartet einen Mikrotask/Render-Zyklus ab)
```

Der entscheidende Unterschied: `skipDocSyncRef = false` wird in einem separaten `setTimeout(0)` gesetzt. Dadurch wird sichergestellt, dass React zuerst die State-Updates aus `loadDocuments` verarbeitet und der `useEffect` mit den AKTUELLEN Daten laeuft.

### Datei: `src/contexts/form/FormContext.tsx`

**loadDocuments robuster machen:**

Zusaetzlich eine Sicherung einbauen: Wenn `forceRefresh = true`, den `documentService.clearCache()` Aufruf beibehalten, aber auch sicherstellen, dass `fetchDocuments` mit `forceRefresh=true` aufgerufen wird (ist bereits der Fall).

Keine weiteren Aenderungen noetig -- die Funktion selbst ist korrekt.

### Datei: `src/components/documents/DocumentUploadSheet.tsx`

**Timing anpassen:**

Das Sheet schliesst sich nach 1200ms (`setTimeout → reset(); onClose()`), aber der Reload passiert nach 1500ms. Der Close resettet das Sheet, was die `onUploaded`-Referenz nicht beeinflusst, aber es ist sauberer wenn der Reload VORHER startet.

Aenderung: Sheet schliesst sich nach 2000ms statt 1200ms, damit der Reload (1500ms) sicher vorher startet.

## Zusammenfassung der Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `DocumentChecklist.tsx` | `skipDocSyncRef = false` in `setTimeout(0)` statt synchron im `finally` |
| `DocumentUploadSheet.tsx` | Close-Delay von 1200ms auf 2000ms erhoehen |

## Warum das funktioniert

```text
VORHER (kaputt):
  t=0ms:    markUploaded(true), skipSync=true
  t=1500ms: loadDocuments() resolves, state updates QUEUED
            skipSync=false (SOFORT, vor React-Render!)
  t=1501ms: React rendert → useEffect sieht skipSync=false
            → kann mit ALTEN documents revertieren

NACHHER (fix):
  t=0ms:    markUploaded(true), skipSync=true
  t=1500ms: loadDocuments() resolves, state updates QUEUED
  t=1501ms: setTimeout(0) → wird nach React-Render ausgefuehrt
  t=1502ms: React rendert mit neuen Daten
            → useEffect sieht skipSync=true → ueberspringt
  t=1503ms: setTimeout(0) callback: skipSync=false
  t=1504ms: React rendert erneut → useEffect sieht korrekte Daten
            → kein Revert noetig
```

