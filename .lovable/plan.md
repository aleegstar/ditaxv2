
# Fix: Upload nutzt bereits vorhandene userId statt erneuten getSession()-Aufruf

## Problem

Die `DocumentChecklist`-Komponente hat bereits die authentifizierte `userId` aus dem `useAuthValidation()` Hook (Zeile 72-77). Trotzdem ruft `executeUpload` nochmals `supabase.auth.getSession()` auf -- und genau dieser redundante Aufruf haengt im Despia WebView.

## Warum nur auf Mobile?

Der Despia WebView hat vermutlich Einschraenkungen beim wiederholten Zugriff auf `getSession()` waehrend eines laufenden Prozesses. Der erste Aufruf (beim Seitenload via `useAuthValidation`) funktioniert, aber ein zweiter, spaeterer Aufruf blockiert.

## Loesung

`executeUpload` soll die **bereits vorhandene** `userId` aus dem Hook verwenden. Kein erneuter `getSession()`-Aufruf noetig.

## Technische Aenderung

### Datei: `src/components/DocumentChecklist.tsx`

Nur eine kleine Aenderung in `executeUpload` (Zeilen 191-201):

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
  // ...rest uses currentUserId...
```

**Nachher:**
```typescript
const uploadPromise = (async () => {
  // Use userId from useAuthValidation() hook - already validated
  // No need to call getSession() again (hangs on mobile WebViews)
  const currentUserId = userId;
  if (!currentUserId) {
    toast({ title: 'Nicht angemeldet', ... });
    return;
  }
  console.log('[executeUpload] Using existing userId:', currentUserId);
  // ...rest uses currentUserId...
```

Die `uploadStepInfo` "Session..." Zeile und der `getSession()`-Aufruf werden komplett entfernt. Der Upload springt direkt zu "Schluessel...".

Auch `handleOcrConfirm` muss geprueft werden -- falls dort ebenfalls `getSession()` aufgerufen wird, wird es gleich behandelt.

## Erwartetes Ergebnis

- Kein haengender `getSession()`-Aufruf mehr auf Mobile
- Upload startet sofort mit der bereits validierten userId
- Desktop bleibt unberuehrt
- Minimale, gezielte Aenderung statt grossem Refactoring
