
# Offline-Modus vereinfachen: nur /documents

## Ziel
Offline-Support ausschliesslich auf der `/documents`-Seite. User können offline Unterlagen sammeln/hochladen, der Rest der App muss offline nicht funktionieren. Beim Reconnect wird die bestehende Upload-Queue gedraint.

## Scope

### Behalten (offline-fähig)
- `/documents` — Liste aus IndexedDB-Snapshot rendern, Upload via bestehende `OfflineQueueService` / `documentUpload`-Job.
- Globales Offline-Banner + Queue-Status (bestehend).
- React Query Persist nur für die Document-Queries (kein globaler Persist mehr für alles).
- Service Worker (`public/sw-offline.js`) — App-Shell + `/documents` Route precachen, andere Routen Network-only.

### Entfernen / zurückbauen
- Snapshot-Hydration & Online-Listener in `src/hooks/use-tax-year-data.ts` — wieder rein netzwerkbasiert, normaler Fehlerpfad. Offline-Snapshot-Logik raus.
- Snapshot-Hydration in `src/hooks/useNotifications.ts` — entfernen, normaler Fehlerpfad.
- Andere Stellen, die `readSnapshot`/`writeSnapshot` aus `src/lib/offlineSnapshot.ts` ausserhalb von `/documents` verwenden — bereinigen.
- `src/lib/reactQueryPersist.ts` einschränken: nur Document-bezogene Query-Keys persistieren (oder ganz entfernen, falls nicht mehr benötigt — Documents.tsx nutzt eigenen Snapshot).

### Anpassen
- `src/pages/Documents.tsx`: Snapshot-Hydration + Online-Refresh bleiben, klar dokumentiert als einzige offline-fähige Seite.
- `src/lib/offlineSnapshot.ts`: bleibt, aber nur noch von Documents + Queue genutzt.
- Offline-Erkennung global: wenn `navigator.onLine === false` und Route ≠ `/documents`, optional Hinweis-Overlay „Offline — nur Dokumente verfügbar" mit Button → `/documents`. (Minimal, nicht-blockierend.)
- Bestehende Fehler-Toasts auf nicht-Documents-Seiten dürfen wieder erscheinen (Netzwerkfehler nicht mehr unterdrücken).

## Technische Details

### Geänderte Dateien
- `src/hooks/use-tax-year-data.ts` — Snapshot/Online-Listener entfernen, originalen Fehlerpfad wiederherstellen.
- `src/hooks/useNotifications.ts` — Snapshot/Online-Listener entfernen.
- `src/pages/Documents.tsx` — beibehalten, kommentieren als „offline-only surface".
- `src/lib/reactQueryPersist.ts` — Persist-Filter auf Document-Queries beschränken (oder ganz entfernen, falls Documents.tsx eigenen Snapshot nutzt).
- `public/sw-offline.js` — Precache-Liste & Navigation-Fallback auf `/documents` reduzieren; alle anderen Navigations-Requests Network-only ohne Fallback.
- Neu (optional, klein): `src/components/OfflineRouteGuard.tsx` — wenn offline und Route ≠ `/documents`, blendet ein dezentes Overlay mit CTA „Zu Dokumenten" ein. In `App.tsx` einhängen.

### Nicht geändert
- `src/services/queue/*` und `OfflineQueueService` bleiben unverändert.
- `src/lib/offlineSnapshot.ts` API bleibt; Aufrufer werden reduziert.
- Auth-, Payment-, Form-Flows — keine Offline-Anpassungen mehr nötig.

## Akzeptanzkriterien
- Im Flugmodus ist `/documents` voll nutzbar (Liste aus Snapshot, Upload landet in Queue).
- Andere Seiten zeigen offline normale Netzwerkfehler bzw. Empty/Error-State; kein „falsches" Funktionieren mit Stale-Daten.
- Nach Reconnect wird die Queue automatisch gedraint (bestehende Logik).
- Kein zusätzliches IndexedDB-Caching für Tax-Year-Daten oder Notifications.
- Optional: Offline-Overlay auf Nicht-/documents-Seiten mit CTA zu /documents.

## Offene Frage
Soll das Offline-Overlay auf anderen Seiten kommen (sanfter Hinweis + Redirect-CTA), oder lassen wir die Seiten einfach ihre normalen Fehlerzustände zeigen?
