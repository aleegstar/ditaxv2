# Offline-Fixes (Phase 5)

Zwei klar reproduzierbare Bugs verhindern, dass Offline-Modus funktioniert.

## Problem 1 — IndexedDB `NotFoundError`

In der Konsole:
```
NotFoundError: Failed to execute 'transaction' on 'IDBDatabase':
One of the specified object stores was not found.
  at OfflineQueueServiceImpl.drain (OfflineQueueService.ts:184)
```

**Ursache:** Sowohl `reactQueryPersist.ts` als auch `OfflineQueueService.ts` rufen
`createStore('ditax-cache', <store>)` mit **derselben DB**, aber **unterschiedlichen Object-Stores** auf
(`react-query` vs. `offline-queue`). `idb-keyval.createStore` öffnet die DB nur mit *einem* Store —
wer zuerst öffnet, definiert das Schema. Der zweite Aufruf bekommt einen
`version=1`-Handle ohne den zweiten Store → jede Transaktion crasht.

Folgefehler: Queue hydratisiert nicht, persistierter Cache wird teils nicht geschrieben,
also kein Read-Cache offline → Profil-Fetch schlägt fehl → Toast-Spam.

**Fix:** Queue in eigene DB auslagern.

```ts
// OfflineQueueService.ts
const DB_NAME   = 'ditax-offline-queue';   // war: 'ditax-cache'
const STORE_NAME = 'jobs';
```

Keine Migration nötig — die Queue ist bisher in keiner Produktion live, der
alte (defekte) Store kann verwaisen. Optional: einmaliges `indexedDB.deleteDatabase('ditax-cache')`
beim ersten Boot? **Nein**, würde den React-Query-Cache zerstören.
Stattdessen: nur den eigenen, frischen DB-Namen verwenden, alter Müll ist leer.

## Problem 2 — Profil-Fehler-Toasts im Offline-Modus

`src/hooks/useProfile.ts` Zeile 80:
```ts
toast.error('Fehler beim Laden des Profils: ' + error.message);
```

Bei Offline → `TypeError: Failed to fetch` → 4 retries → **4 rote Toasts**
übereinander (siehe Screenshots). Die App soll offline still bleiben und
auf den persistierten React-Query-Cache zurückfallen.

**Fix:**
1. Toast nur zeigen, wenn `navigator.onLine === true` *und* der Fehler kein Netzwerkfehler ist
   (`Failed to fetch`, `NetworkError`, `Load failed`).
2. Retry-Schleife (`fetchProfileWithRetry`) bei `!navigator.onLine` sofort abbrechen —
   sinnlos, Online-Listener triggert den Refetch ohnehin (über `online`-Event-Hook fehlt noch,
   wird via `window.addEventListener('online')` ergänzt → einmal Refetch).

Selbe Behandlung für `updateFirstName` / `updateAvatar` (Write-Fehler) ist nicht
in Scope — die werden später über Write-Queue gepuffert (Phase 3 bestehend, hier
nicht erweitert).

## Geplante Änderungen

### `src/services/OfflineQueueService.ts`
- `DB_NAME` → `'ditax-offline-queue'`
- `STORE_NAME` → `'jobs'`

### `src/hooks/useProfile.ts`
- Helper `isNetworkError(err)` (Match auf `Failed to fetch` / `NetworkError` / `Load failed`).
- `fetchProfile` catch: Toast nur bei `navigator.onLine && !isNetworkError(error)`.
- `fetchProfileWithRetry`: vor jedem Versuch `if (!navigator.onLine) { setLoading(false); return; }`.
- `useEffect`: zusätzlicher `window.addEventListener('online', refetch)` während `isValid`,
  damit nach Reconnect ohne User-Aktion neu geladen wird.

## Verifikation

1. Preview öffnen → DevTools Network → "Offline" → Reload → es darf **kein** Toast erscheinen.
2. Konsole: kein `NotFoundError` mehr.
3. Wieder "Online" → einmaliger Refetch, Profil erscheint, "Wieder online"-Toast.
4. Queue: ein Dokument-Upload offline starten → `QueueStatusBadge` zeigt 1 wartender Job,
   nach Reconnect verschwindet er ohne Hydrate-Fehler.

## Nicht in Scope

- Write-Queue für `updateFirstName` / `updateAvatar` (separate Phase).
- Globaler Fetch-Interceptor zur Toast-Unterdrückung — zu invasiv, machen wir lieber pro Hook.
- Migration alter `ditax-cache` IDB-Daten — nicht in Produktion, leer.
