## Ausgangslage

`@despia/local` ist bereits in `vite.config.ts` integriert → `dist/despia/local.json` wird gebaut, App läuft auf dem Gerät via `http://localhost` und ist nach erstem Launch boot-offline-fähig. Was fehlt, ist (1) ein Toggle in der Despia-Konsole, (2) UI-Feedback bei Offline, (3) ein Read-Cache, damit Daten ohne Netz sichtbar bleiben, und (4) eine Write-Queue, damit Aktionen offline nicht ins Leere laufen.

## Umsetzung in 4 Phasen

### Phase 1 – Aktivierung & globaler Offline-Indikator

1. **Despia-Konsole** (User-Action, kein Code): Im Despia-Editor unter „Offline Support" → **Local Server** auswählen, App-Rebuild triggern. Ohne diesen Schalter bleibt das generierte Manifest ungenutzt.
2. **`useOnlineStatus` Hook** (`src/hooks/useOnlineStatus.ts`) – kapselt `navigator.onLine` + `online`/`offline` Events, mit kurzem Reconnect-Debounce, damit kein Flackern entsteht.
3. **`OfflineBanner`** Komponente, eingehängt in `AppLayout` direkt unter dem Header: schmaler `bg-muted` Streifen „Du bist offline – Änderungen werden gespeichert und später synchronisiert", `aria-live="polite"`, respektiert `safe-area-inset-top`.
4. **Reconnect-Toast** via `sonner`: „Wieder online" + Anzahl Queue-Items, falls vorhanden.
5. **Auth-Guard**: Wenn offline und kein gültiger Supabase-Session-Token vorhanden → freundliche Offline-Screen statt Redirect zu `/auth`.

### Phase 2 – Read-Cache (Daten ohne Netz sichtbar)

1. **`@tanstack/react-query-persist-client` + `idb-keyval`** installieren. Persister auf IndexedDB, max 24 h Alter, Versioning-Key inkl. `auth.userId` + aktivem `tax_filer_id`, damit Wechsel von Filer den Cache nicht leakt.
2. **`PersistQueryClientProvider`** in `App.tsx` statt des aktuellen `QueryClientProvider`. `buster` aus `import.meta.env.VITE_BUILD_ID` (oder `deployed_at` aus `/despia/local.json`) → bei OTA-Update wird der Cache verworfen.
3. **Cache-Whitelist** statt Alles: nur lesefähige, nicht-sicherheitskritische Queries (`tax_filers`, `documents`-Metadaten, `tax_returns`, `notifications`). Sensible Daten (verschlüsselte Body-Bytes, Chat-Nachrichten) **nicht** persistieren – nur Pointer/Metadaten.
4. **`networkMode: 'offlineFirst'`** auf den gewählten Queries; Mutations bleiben `online`.
5. **Documents-Liste**: Cover-Bilder via `caches`-API (Service Worker, siehe Phase 4) lazy gecached, damit Thumbnails offline da sind. Encrypted Body-Downloads bleiben online-only.

### Phase 3 – Write-Queue & Reconnect-Sync

1. **`src/services/OfflineQueueService.ts`**: persistente Job-Liste in IndexedDB. Jobs als typisierte Discriminated Union (`'form.save'`, `'document.upload'`, `'chat.send'`, `'feedback.submit'`). Pro Job: `id`, `createdAt`, `tax_filer_id`, `payload` (bei Dokumenten/Chat: **bereits verschlüsselter Blob** + Key-Wrapping wie heute, damit RLS/Encryption nicht umgangen werden), `attempts`, `lastError`.
2. **Adapter pro Flow** – wir hooken in die bestehenden Service-Layer, nicht in UI:
   - `EncryptedDocumentService.upload` → bei Offline: verschlüsseln, in Queue legen, optimistischer Eintrag in `documents`-Query-Cache mit Status `pending`.
   - `EncryptedChatService.sendMessage` → analog, optimistisches Bubble mit Clock-Icon.
   - Form-Saves (Dual-Interface) → bestehender Save-Pfad ruft Queue, sobald `fetch` fehlschlägt oder `!navigator.onLine`.
3. **Drainer**: `OfflineQueueService.start()` wird in `main.tsx` einmalig gestartet. Triggers: `online`-Event, App-Resume (Despia `visibilitychange`), erfolgreicher Auth-Refresh. Sequenziell pro `tax_filer_id`, exponential backoff (1s → 60s, max 6 Versuche), bei Konflikt (RLS / 409) → Job markiert `failed`, User-Toast mit Retry-CTA.
4. **UI-Slot**: In `AppLayout` kleines Queue-Badge neben dem Offline-Banner: „3 Aktionen warten auf Synchronisation" – Klick öffnet Bottom-Sheet mit Job-Liste + manueller Retry-/Discard-Option.
5. **Sicherheits-Regel**: Login, MFA, Passkey, Payments und Sign-Tax-Return **niemals** queuen – diese Flows zeigen sofortigen Offline-Hinweis, Queue ist nur für idempotente Schreibvorgänge.

### Phase 4 – Service Worker für statisches Asset-Caching (optional, low-risk)

Da Localhost ein Secure Context ist, dürfen wir einen schlanken SW registrieren – **nur** für statische Assets und Vorschau-Thumbnails, **kein** HTML-Navigation-Cache (sonst beißen wir uns mit OTA).

- `public/sw-offline.js`: `CacheFirst` für `/assets/*`, `/ocr/*`, `/ditax-logo*`, Storage-Thumbnails. `NetworkOnly` für `/despia/local.json`, `*.supabase.co`, `/functions/v1/*`.
- Registrierung nur wenn `isDespiaNative()` **und** `location.hostname === 'localhost'`.
- Kill-Switch (`?sw-disable=1`) für Notfälle, plus `unregister`-Pfad falls jemals Probleme auftreten (analog zur PWA-Doku im Lovable-Prompt).

## Technische Details

```text
src/
├── hooks/useOnlineStatus.ts          (neu)
├── components/offline/
│   ├── OfflineBanner.tsx             (neu, eingehängt in AppLayout)
│   └── QueueStatusSheet.tsx          (neu)
├── services/
│   ├── OfflineQueueService.ts        (neu, IndexedDB via idb-keyval)
│   └── queue/
│       ├── types.ts
│       └── handlers/                 (uploadDocument, sendChat, saveForm, …)
├── lib/
│   └── reactQueryPersist.ts          (neu, PersistQueryClient Setup)
└── App.tsx                           (Provider-Tausch)

public/
└── sw-offline.js                     (neu, nur Localhost+Despia)

vite.config.ts                        (bereits OK – nichts zu tun)
```

**Neue Dependencies** (alle MIT, klein):
- `@tanstack/react-query-persist-client`
- `@tanstack/query-sync-storage-persister`
- `idb-keyval`

**Was NICHT geändert wird**
- `vite.config.ts` (Local-Plugin bereits drin), `capacitor.config.ts`, Edge Functions, RLS-Policies, `EncryptedDocumentService`-Kryptographie. Encryption passiert **vor** dem Queuen, Server-Verhalten bleibt identisch.

**Konflikte mit bestehenden Memory-Regeln**
- ✅ Encryption bleibt mandatory (Jobs speichern nur verschlüsselte Bytes).
- ✅ `tax_filer_id`-Isolation via Cache-Key + Queue-Partition.
- ✅ Semantic Tokens für Banner/Sheet.
- ⚠️ Session-Timeout (20 min Idle): Offline-Drainer respektiert Logout-Event und löscht Queue beim Logout (sonst Datenleck bei Gerätewechsel).

## Offene Punkte vor Build

1. **OTA-Cache-Buster**: Soll der React-Query-Cache bei jedem neuen `deployed_at` invalidiert werden (sicherer) oder nur bei explizitem Schema-Bump (länger nutzbar)? Empfehlung: bei jedem OTA – Tax-Daten ändern Form ohnehin selten innerhalb von Minuten.
2. **Chat offline**: Soll der KI-Chat (`chatbot-response` Edge Function) komplett deaktiviert werden bei Offline, oder eine „Frage wird gesendet sobald online"-Queue? Empfehlung: deaktivieren, KI-Antworten sind nicht idempotent und veralten schnell.
3. **Phase-Reihenfolge / Scope-Cut**: Phase 1+2 in einem ersten PR, Phase 3+4 in einem Folge-PR – oder alles auf einmal? Phase 3 ist der größte Brocken (~2/3 des Aufwands).
