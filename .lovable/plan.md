
# Fix: userId vor OCR sichern statt aus reaktivem State lesen

## Das Problem

Waehrend der OCR-Validierung (5-15 Sekunden) kann der `onAuthStateChange`-Listener im Despia WebView den `userId`-State auf `null` setzen. Wenn `executeUpload` danach laeuft, liest es `userId` aus dem Hook-State -- der ist aber schon `null`. Die Funktion gibt sofort zurueck, und der Button zeigt wieder "Hochladen".

Beweis: Du bist jetzt auf `/auth` -- die App hat dich ausgeloggt, weil die Session als ungueltig erkannt wurde.

## Die Loesung

`userId` wird **vor** dem Start der OCR-Validierung in eine lokale Variable gesichert und explizit an `executeUpload` uebergeben. So ist der Upload unabhaengig vom reaktiven Auth-State.

## Technische Aenderung

### Datei: `src/components/DocumentChecklist.tsx`

**1. `executeUpload` bekommt `userId` als Parameter (Zeile 182):**

```typescript
// Vorher:
const executeUpload = async (file: File, item: ChecklistItem) => {

// Nachher:
const executeUpload = async (file: File, item: ChecklistItem, capturedUserId: string) => {
```

Innerhalb der Funktion wird `capturedUserId` statt `userId` verwendet:

```typescript
// Vorher (Zeile 193):
const currentUserId = userId;

// Nachher:
const currentUserId = capturedUserId;
```

**2. `handleQuickUpload` sichert `userId` am Anfang (Zeile 114-171):**

```typescript
const handleQuickUpload = async (file: File, item: ChecklistItem) => {
  try {
    // Capture userId BEFORE OCR starts (reactive state may change during OCR)
    const capturedUserId = userId;
    if (!capturedUserId) {
      toast({ title: 'Nicht angemeldet', description: 'Bitte melde dich erneut an.', variant: 'destructive' });
      return;
    }

    // ... rest of OCR validation ...

    // Pass captured userId to executeUpload
    if (result.best.confidence >= 50) {
      // ...close drawer...
      executeUpload(file, item, capturedUserId);  // userId als Parameter
    }
  }
};
```

**3. `handleOcrConfirm` ebenfalls (Zeile 244+):**

Auch hier muss der `userId` vor dem Aufruf gesichert und uebergeben werden:

```typescript
const handleOcrConfirm = () => {
  if (pendingUploadFile && pendingUploadItem) {
    const capturedUserId = userId;
    if (!capturedUserId) {
      toast({ title: 'Nicht angemeldet', ... });
      return;
    }
    executeUpload(pendingUploadFile, pendingUploadItem, capturedUserId);
    // ...cleanup...
  }
};
```

## Warum das funktioniert

- `userId` wird als lokale Variable gesichert, BEVOR der asynchrone OCR-Prozess startet
- Selbst wenn der Auth-Listener waehrend der OCR den State aendert, bleibt die lokale Kopie gueltig
- Der Supabase-Token ist serverseitig noch gueltig (nur der Client-State geht verloren)
- Minimale Aenderung: nur 3 Stellen im Code betroffen
