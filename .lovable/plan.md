

# Fix: getSession() durch bereits vorhandene userId ersetzen

## Problem

Der Upload-Button bleibt bei "Session..." haengen, weil `executeUpload` den Aufruf `supabase.auth.getSession()` macht, der im Despia WebView blockiert. Die Komponente hat aber bereits `userId` aus dem `useAuthValidation()` Hook (Zeile 72-77) -- der Session-Aufruf ist komplett ueberfluessig.

## Aenderung

### Datei: `src/components/DocumentChecklist.tsx` (Zeilen 191-201)

Die 10 Zeilen mit `getSession()` werden durch 5 Zeilen ersetzt, die die vorhandene `userId` nutzen:

**Vorher:**
```typescript
const uploadPromise = (async () => {
  setUploadStepInfo(prev => ({ ...prev, [item.id]: 'Session...' }));
  console.log('[executeUpload] Getting session...');
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id;
  if (!currentUserId) {
    toast({ title: 'Nicht angemeldet', ... });
    return;
  }
  console.log('[executeUpload] Session OK');
```

**Nachher:**
```typescript
const uploadPromise = (async () => {
  // userId comes from useAuthValidation() hook - no need for getSession()
  const currentUserId = userId;
  if (!currentUserId) {
    toast({ title: 'Nicht angemeldet', ... });
    return;
  }
  console.log('[executeUpload] Using existing userId:', currentUserId);
```

Keine weiteren Dateien betroffen. Rest der Funktion bleibt identisch.

## Erwartetes Ergebnis

- Upload springt direkt zu "Schluessel..." statt bei "Session..." haengen zu bleiben
- Desktop-Verhalten aendert sich nicht (userId ist dort auch schon vorhanden)

