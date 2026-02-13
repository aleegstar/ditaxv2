

# Fix: "Trotzdem hochladen" auf Mobile + Endlosschleife beim Zuruecknavigieren

## Problem 1: "Trotzdem hochladen" funktioniert nicht auf Mobile

Wenn ein Dokument eine niedrige OCR-Konfidenz hat, zeigt die App den `DocumentCheckScreen` mit "Dokument trotzdem einreichen". Beim Klick passiert Folgendes:

1. `onConfirm` ruft `handleConfirm` auf
2. `handleConfirm` liest `selectedFile` aus dem React-State
3. `performUpload(selectedFile)` wird aufgerufen

**Das Problem**: Auf mobilen WebViews kann das `File`-Objekt waehrend der OCR-Validierungsphase ungueltig werden (Speicherdruck, Garbage Collection). Wenn der Nutzer dann "Trotzdem einreichen" klickt, ist das `File`-Objekt in `selectedFile` nicht mehr lesbar -- `file.arrayBuffer()` haengt oder schlaegt fehl.

**Loesung**: Das `File`-Objekt sofort bei der Auswahl als `ArrayBuffer` einlesen und im State zwischenspeichern. Beim Upload dann `uploadFromBuffer()` statt `uploadEncryptedDocument()` verwenden (diese Methode existiert bereits im `EncryptedDocumentService`). Zusaetzlich einen Upload-Timeout von 90 Sekunden einfuegen, damit der Upload-Prozess nicht endlos haengen kann.

## Problem 2: Endlosschleife und "Ghost-Startseite" beim Zuruecknavigieren

Wenn der Upload fehlschlaegt und der Nutzer zuruecknavigiert (Browser-Back), passiert:

1. Der Drawer schliesst sich
2. Die Eltern-Seite (DocumentChecklist) mounted erneut
3. Daten werden neu geladen -- aber wenn die Session zwischenzeitlich abgelaufen ist, schlagen die Abfragen fehl
4. `onAuthStateChange` erkennt kurzzeitig keine Session
5. `isAuthenticated` wird `false` gesetzt, Redirect zu `/auth`
6. Dort angekommen ist der Nutzer aber noch eingeloggt (Token wird refreshed), was zu einem Flackern/Loop fuehrt

**Loesung**: Im Fehler-Screen einen "Zurueck"-Button anbieten, der sicher zurueck zur Checkliste navigiert (statt Browser-Back). Ausserdem: Falls die Session waehrend des Uploads ablaeuft, eine kontrollierte Fehlerbehandlung mit klarer Fehlermeldung statt unkontrolliertem Redirect.

## Technische Aenderungen

### Datei: `src/components/documents/DocumentUploadSheet.tsx`

1. **Buffer-Caching**: Bei `handleFileSelected` sofort `file.arrayBuffer()` aufrufen und das Ergebnis in einem neuen State `fileBuffer` speichern.
2. **`performUpload` umstellen**: Statt `uploadEncryptedDocument(file, ...)` wird `uploadFromBuffer(buffer, fileName, fileType, ...)` verwendet.
3. **90s Upload-Timeout**: `performUpload` bekommt ein `Promise.race` mit 90-Sekunden-Timeout, damit der Upload nicht endlos haengen kann.
4. **Session-Fehler abfangen**: Wenn `getSession()` fehlschlaegt, eine klare Fehlermeldung setzen statt zu werfen, um unkontrollierte Redirects zu vermeiden.

```typescript
// Neuer State
const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
const [fileInfo, setFileInfo] = useState<{ name: string; type: string } | null>(null);

// In handleFileSelected: Buffer sofort einlesen
const buffer = await file.arrayBuffer();
setFileBuffer(buffer);
setFileInfo({ name: file.name, type: file.type });

// In performUpload: Buffer verwenden
const UPLOAD_TIMEOUT_MS = 90000;
await Promise.race([
  encryptedDocService.uploadFromBuffer(
    buffer, fileName, fileType,
    item.id, userId, taxYear, item.title, activeTaxFilerId
  ),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Upload-Timeout: Bitte versuche es erneut.')), UPLOAD_TIMEOUT_MS)
  )
]);
```

### Datei: `src/components/documents/DocumentCheckScreen.tsx`

Keine Aenderungen noetig -- `onConfirm` und `onReupload` Callbacks bleiben gleich.

### Zusammenfassung

| Problem | Ursache | Fix |
|---------|---------|-----|
| "Trotzdem hochladen" haengt | File-Objekt wird auf Mobile ungueltig | Buffer sofort bei Auswahl einlesen, uploadFromBuffer nutzen |
| Endlosschleife beim Zurueck | Unkontrollierter Session-Verlust bei Upload-Fehler | Kontrollierte Fehlerbehandlung, Upload-Timeout |
| Ghost-Startseite | Auth-State-Flackern nach fehlgeschlagenem Upload | Session-Fehler abfangen ohne Redirect auszuloesen |

### Umfang
- 1 Datei (`DocumentUploadSheet.tsx`)
- Nutzt bestehende `uploadFromBuffer`-Methode
- Konsistent mit dem Memory "document-upload-resilience"

