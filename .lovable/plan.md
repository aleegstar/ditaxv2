

# Fix: getSession() entfernen - diesmal wirklich

## Was ist passiert?

Der `getSession()`-Aufruf in Zeile 195 wurde in den letzten 2 Runden zwar geplant und genehmigt, aber **nie tatsaechlich im Code geaendert**. Er steht immer noch drin. Deshalb bleibt der Button weiterhin bei "Session..." haengen.

## Warum ging es frueher?

Der alte Flow (mit mehreren Klicks) hat den Upload ueber den `EnhancedDocumentUploader` abgewickelt, der **keinen** `getSession()`-Aufruf macht. Der neue vereinfachte Flow in `DocumentChecklist.tsx` hat diesen Aufruf eingefuehrt -- und der blockiert im Despia WebView.

## Aenderung

### Datei: `src/components/DocumentChecklist.tsx` (Zeilen 191-201)

Ersetze die 10 Zeilen mit `getSession()` durch direkte Nutzung der vorhandenen `userId` (aus `useAuthValidation()` Hook, Zeile 72-77):

**Vorher (Zeilen 191-201):**
```typescript
const uploadPromise = (async () => {
  // Step 1: Session
  setUploadStepInfo(prev => ({ ...prev, [item.id]: 'Session...' }));
  console.log('[executeUpload] Getting session...');
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id;
  if (!currentUserId) {
    toast({ title: 'Nicht angemeldet', description: 'Bitte melde dich erneut an.', variant: 'destructive' });
    return;
  }
  console.log('[executeUpload] Session OK');
```

**Nachher:**
```typescript
const uploadPromise = (async () => {
  // userId from useAuthValidation() hook - no getSession() needed
  const currentUserId = userId;
  if (!currentUserId) {
    toast({ title: 'Nicht angemeldet', description: 'Bitte melde dich erneut an.', variant: 'destructive' });
    return;
  }
  console.log('[executeUpload] Using existing userId:', currentUserId);
```

Keine weiteren Dateien betroffen.

## Erwartetes Ergebnis

- Upload springt direkt zu "Schluessel..." statt bei "Session..." haengen zu bleiben
- Gleicher Ansatz wie der alte funktionierende Flow (kein getSession())
