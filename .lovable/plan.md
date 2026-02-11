

# Fix: ALLE getSession()-Aufrufe entfernen

## Das Problem

Der letzte Fix hat `supabase.auth.getSession()` an 2 neuen Stellen eingefuegt (Zeile 119 und 276). Genau dieser Aufruf haengt im Despia WebView. Jetzt blockiert er bereits vor der OCR-Validierung -- nichts funktioniert mehr.

## Die Loesung

**Alle `getSession()`- und `setSession()`-Aufrufe komplett entfernen.** Der Supabase-Client behalt intern seinen Auth-Token. `supabase.storage.upload()` nutzt diesen automatisch. Es ist nicht noetig, die Session manuell zu lesen oder wiederherzustellen.

Nur `userId` aus dem `useAuthValidation()` Hook wird benoetigt (als lokale Kopie gesichert).

## Aenderungen in `src/components/DocumentChecklist.tsx`

### 1. handleQuickUpload (Zeile 114-189) -- getSession() entfernen

```typescript
// VORHER (Zeile 118-123):
const capturedUserId = userId;
const { data: { session: capturedSession } } = await supabase.auth.getSession();  // HAENGT!
if (!capturedUserId || !capturedSession) { ... }

// NACHHER:
const capturedUserId = userId;
if (!capturedUserId) {
  toast({ title: 'Nicht angemeldet', ... });
  return;
}
```

`executeUpload`-Aufruf (Zeile 180): capturedSession-Parameter entfernen.

### 2. executeUpload (Zeile 191-263) -- setSession() und capturedSession entfernen

```typescript
// VORHER:
const executeUpload = async (file, item, capturedUserId, capturedSession) => {
  // 12 Zeilen setSession()-Code...

// NACHHER:
const executeUpload = async (file: File, item: ChecklistItem, capturedUserId: string) => {
  // Direkt zum Upload, kein Session-Management
```

### 3. handleOcrConfirm (Zeile 265-303) -- getSession() entfernen

```typescript
// VORHER (Zeile 275-277):
const capturedUserId = userId;
const { data: { session: capturedSession } } = await supabase.auth.getSession();  // HAENGT!
if (!capturedUserId || !capturedSession) { ... }

// NACHHER:
const capturedUserId = userId;
if (!capturedUserId) {
  toast({ title: 'Nicht angemeldet', ... });
  setOcrDrawerOpen(false);
  return;
}
```

`handleOcrConfirm` kann wieder synchron sein (kein `async` noetig).
`executeUpload`-Aufruf: capturedSession-Parameter entfernen.

## Zusammenfassung

- 3 Stellen geaendert, alle in `DocumentChecklist.tsx`
- Kein einziger `getSession()`- oder `setSession()`-Aufruf bleibt uebrig
- Der Supabase-Client verwendet seinen internen Token automatisch
- Upload-Flow: Datei waehlen -> OCR -> Upload -- ohne Session-Management

