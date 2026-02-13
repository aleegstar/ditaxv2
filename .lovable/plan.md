

# Fix: "Trotzdem hochladen" auf Mobile + Ghost-Seite

## Identifizierte Bugs

### Bug 1: Unbehandelter Fehler in der OCR-Validierung
Wenn die OCR-Erkennung einen Fehler wirft, der KEIN Timeout ist (z.B. Speicherfehler, Worker-Crash), wird dieser Fehler auf Zeile 180 einfach weitergeworfen -- aber es gibt keinen aeusseren try/catch. Die UI bleibt im "Validierung"-Zustand haengen, der Spinner dreht endlos, und der "Abbrechen"-Button fuehrt nur zum Schliessen des Drawers, nicht zum Zuruecksetzen.

### Bug 2: Stale Closures bei Buffer-Referenzen
`fileBuffer` und `fileInfo` werden als React-State gespeichert. Die `handleConfirm`-Callback hat diese im Dependency-Array, aber auf mobilen WebViews mit Speicherdruck koennen React-State-Updates verzoegert oder verloren gehen. `useRef` waere zuverlaessiger, da Refs sofort aktualisiert werden und nicht von React-Batching abhaengen.

### Bug 3: Auth-Redirect-Loop ("Ghost-Seite")
Nach einem Upload-Fehler + Drawer schliessen:
1. Die Eltern-Seite mounted neu
2. `useAuthValidation` prueft die Session
3. Bei kurzzeitigem Token-Refresh-Gap wird `isValid: false` gesetzt
4. `ProtectedRoute` leitet zu `/auth` weiter
5. Token wird refreshed, Nutzer ist doch eingeloggt -- leere Seite erscheint

## Technische Aenderungen

### Datei: `src/components/documents/DocumentUploadSheet.tsx`

**1. Refs statt State fuer Buffer-Daten verwenden**

```typescript
// Statt useState:
const fileBufferRef = useRef<ArrayBuffer | null>(null);
const fileInfoRef = useRef<{ name: string; type: string } | null>(null);

// Setzen:
fileBufferRef.current = buffer;
fileInfoRef.current = { name: file.name, type: file.type };

// In handleConfirm lesen:
const handleConfirm = useCallback(() => {
  if (fileBufferRef.current && fileInfoRef.current) {
    performUpload(fileBufferRef.current, fileInfoRef.current.name, fileInfoRef.current.type);
  }
}, [performUpload]);
```

**2. Gesamten handleFileSelected in try/catch einwickeln**

```typescript
const handleFileSelected = useCallback(async (file: File) => {
  if (!item) return;
  try {
    // ... gesamte Logik hier ...
  } catch (err: any) {
    console.error('[DocumentUploadSheet] handleFileSelected error:', err);
    setErrorMessage(err.message || 'Fehler bei der Dokumentenverarbeitung');
    setPhase('error');
  }
}, [item, performUpload]);
```

**3. Reset-Funktion: Refs zuruecksetzen**

```typescript
const reset = useCallback(() => {
  // ... bestehende State-Resets ...
  fileBufferRef.current = null;
  fileInfoRef.current = null;
}, []);
```

**4. handleReupload: Refs zuruecksetzen**

```typescript
const handleReupload = useCallback(() => {
  setSelectedFile(null);
  fileBufferRef.current = null;
  fileInfoRef.current = null;
  setValidationResult(null);
  setPhase('select');
}, []);
```

### Zusammenfassung der Aenderungen

| Problem | Ursache | Fix |
|---------|---------|-----|
| UI haengt bei OCR-Fehler | Kein aeusserer try/catch | Gesamten handleFileSelected in try/catch |
| "Trotzdem hochladen" tut nichts | State kann auf Mobile veraltet sein | useRef statt useState fuer Buffer |
| Ghost-Seite nach Zurueck | Auth-State-Flackern bei Session-Refresh | Kontrollierte Fehlerbehandlung im Drawer |

### Umfang
- 1 Datei (`DocumentUploadSheet.tsx`)
- Keine neuen Abhaengigkeiten
- Refs statt State fuer kritische Upload-Daten
- Vollstaendige Fehlerbehandlung fuer alle Pfade

