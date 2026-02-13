

# Neuaufbau: DocumentUploadSheet -- einfach, robust, mobile-tauglich

## Warum es nicht funktioniert

Das aktuelle `DocumentUploadSheet` hat drei fundamentale Probleme:

1. **`AnimatePresence` blockiert Touch auf Android**: Wie bereits im Projekt dokumentiert, erzeugen `framer-motion` Transitionen unsichtbare Overlays, die Buttons in mobilen WebViews unklickbar machen. Das betrifft vor allem den "Trotzdem einreichen"-Button.

2. **State-Sync-Chaos**: Nach dem Upload gibt es eine Kette aus `skipDocSyncRef`, `setTimeout(1500)`, `documentService.clearCache()`, `formContextLoadDocuments(true)`, und `setTimeout(0)` -- alles um zu verhindern, dass ein `useEffect` den Upload-Status zuruecksetzt. Das ist fragil und race-condition-anfaellig.

3. **Sheet schliesst sich vor dem Reload**: Das Sheet ruft `onUploaded` auf und schliesst sich dann. Der Parent (`DocumentChecklist`) versucht danach Daten zu laden, aber Timing-Konflikte fuehren dazu, dass der alte Zustand wiederhergestellt wird.

## Loesung: Komplett neu, ohne framer-motion, mit einfacher Sync

### Prinzip

- **Kein `AnimatePresence`/`framer-motion`** im Sheet -- nur CSS-Transitions (wie beim Android-Touch-Fix-Pattern im Projekt)
- **`onUploaded` wird erst aufgerufen, wenn der Upload UND der Document-Reload abgeschlossen sind** -- kein Racing mehr
- **Das Sheet uebernimmt den kompletten Reload selbst** statt den Parent darum zu bitten
- **Buffer-Caching bleibt** (bewaeehrt fuer mobile WebViews)
- **Verschluesselung bleibt** (`EncryptedDocumentService.uploadFromBuffer`)

### Neuer Ablauf

```text
User klickt "Hochladen"
  -> Sheet oeffnet sich (Phase: select)
  -> User waehlt Datei
  -> File wird sofort als ArrayBuffer gelesen (mobile-safe)
  -> OCR-Validierung laeuft (Phase: validating)
  -> Ergebnis:
     A) Konfidenz >= 50%: Direkt hochladen (Phase: uploading -> success)
     B) Konfidenz < 50%: Pruefscreen zeigen (Phase: result)
        -> "Trotzdem einreichen": Hochladen (Phase: uploading -> success)
        -> "Anderes Dokument": Zurueck zu select
  -> Nach Upload-Erfolg:
     1. documentService.clearCache()
     2. formContextLoadDocuments(true) -- AWAIT
     3. DANN erst onUploaded(itemId) aufrufen
     4. Sheet schliesst sich
```

Der entscheidende Unterschied: **onUploaded wird erst NACH dem erfolgreichen Reload aufgerufen**, nicht vorher. Dadurch entfaellt die gesamte `skipDocSyncRef`-Logik.

### Aenderungen

**1. `src/components/documents/DocumentUploadSheet.tsx` -- Komplett neu schreiben**

- Kein `framer-motion` / `AnimatePresence` Import
- Phasen-Wechsel via einfaches `{phase === 'x' && <div>...</div>}`
- Buttons bekommen `touch-action: manipulation` fuer Android
- `onUploaded` Callback bekommt neuen Typ: `(itemId: string) => Promise<void>` -- das Sheet wartet auf den Reload
- Upload-Logik bleibt identisch (Buffer, EncryptedDocumentService, 90s Timeout)
- OCR-Validierung bleibt identisch (DocumentValidator, 15s Timeout)
- `DocumentCheckScreen` wird inline ersetzt durch einfache Buttons (kein separater motion-Component)

**2. `src/components/DocumentChecklist.tsx` -- `handleSheetUploaded` vereinfachen**

- Entfernt: `skipDocSyncRef`, alle `setTimeout`-Ketten, `documentService.clearCache()`
- Neu: `handleSheetUploaded` wird zu einer async-Funktion die:
  1. `documentService.clearCache()` aufruft
  2. `await formContextLoadDocuments(true)` aufruft
  3. Dann eine Toast-Nachricht zeigt
- Der `useEffect` fuer Document-Sync (Zeile 146-158) bleibt, aber `skipDocSyncRef` wird entfernt -- nicht mehr noetig, weil `onUploaded` erst nach dem Reload aufgerufen wird und die Daten dann bereits korrekt sind.

**3. `src/components/documents/DocumentCheckScreen.tsx` -- wird nicht mehr benoetigt**

Die Pruef-UI wird direkt ins `DocumentUploadSheet` integriert (einfache Buttons ohne framer-motion). Die Datei kann bestehen bleiben falls sie anderswo verwendet wird, wird aber vom Sheet nicht mehr importiert.

### Technische Details

Das neue Sheet hat folgende Struktur (ohne motion):

```text
<Drawer>
  <DrawerContent>
    {phase === 'select' && (
      <div>  // Keine Animation
        <h3>Titel</h3>
        <input type="file" hidden ... />
        <button>Fotos</button>
        <button>Scannen</button>
        <button>Dateien</button>
      </div>
    )}
    {phase === 'validating' && (
      <div>
        <AIDocumentValidation ... />
      </div>
    )}
    {phase === 'result' && (
      <div>
        // Inline Pruef-UI (kein DocumentCheckScreen)
        <div class="notification-card">Ergebnis</div>
        <button style="touch-action:manipulation">Trotzdem einreichen</button>
        <button style="touch-action:manipulation">Anderes Dokument</button>
      </div>
    )}
    {phase === 'uploading' && <div>Spinner</div>}
    {phase === 'success' && <div>Erfolg</div>}
    {phase === 'error' && <div>Fehler + Retry</div>}
  </DrawerContent>
</Drawer>
```

### Was gleich bleibt

- Verschluesselung via `EncryptedDocumentService.uploadFromBuffer`
- Buffer-Caching via `useRef<ArrayBuffer>` (mobile-safe)
- OCR via `DocumentValidator` mit 15s Timeout
- 90s Upload-Timeout
- Session-Refresh vor Upload
- `taxFilerId` Partitionierung

### Zusammenfassung der Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/documents/DocumentUploadSheet.tsx` | Komplett neu ohne framer-motion, onUploaded wird async nach Reload |
| `src/components/DocumentChecklist.tsx` | handleSheetUploaded vereinfacht, skipDocSyncRef entfernt |

