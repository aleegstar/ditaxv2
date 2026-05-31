
## Problem

Banner zeigt korrekt "2 Dokumente warten auf Zuordnung" (DB enthält 2 Zeilen mit `pending_assignment = true` für den User, bestätigt per DB-Query). Auf `/documents/review` erscheint trotzdem der Empty-State "Alles zugeordnet". Die Daten gehen nicht verloren — sie werden nur in der Review-UI nicht gelistet, obwohl Banner und Review denselben Filter benutzen.

DB-Bestätigung:
```
2 Zeilen mit user_id = 2e70…5d36, pending_assignment = true, tax_year = NULL, tax_filer_id = NULL
```

Damit ist das Datenmodell intakt; der Bug liegt im Client von `DocumentsReview`.

## Wahrscheinliche Ursachen

1. **`load()` schluckt Fehler still**: `Promise.all(...)` läuft beide Selects parallel; wenn die zweite Query (`tax_filers`) im Mountmoment einen Fehler wirft, fällt das ganze Promise in den `catch`, `setDocs([])` bleibt → Empty-State. Banner ist davon unabhängig.
2. **`if (!userId) return;` ohne `setLoading(false)`** → bei kurzem `userId=null` initialen Render bleibt der Spinner technisch hängen; nach userId-Update überschreibt der zweite Lauf, kann aber durch Race-Bedingung zu inkonsistentem State führen.
3. **Realtime-Lücke**: Banner-Hook re-fetcht auf Queue-Snapshot und `online`-Event. Review-Page lädt nur bei userId-Wechsel und ignoriert frisch gedrainte Jobs → wenn der User die Review öffnet, während OfflineQueue gerade die Inserts macht, sieht er kurz 0.

## Lösung

### `src/pages/DocumentsReview.tsx`

1. **Robuster Loader**:
   - `if (!userId)` → nur `setLoading(false)`/return, kein "true" davor.
   - Beide Queries **getrennt** ausführen (nicht in einem `Promise.all`), damit ein Fehler beim Laden der `tax_filers` die `uploaded_documents`-Liste nicht killt.
   - Beide `error`-Felder explizit auswerten und via `console.error` + `toast.error(message)` mit konkretem Text (`error.message`) anzeigen, statt einer generischen Meldung.
   - `finally { setLoading(false); }` in jedem Pfad.

2. **Reaktive Updates**:
   - Subscriben auf `OfflineQueueService.subscribe(...)` (wie der Banner-Hook), damit beim Draining frisch eingefügte Pending-Dokumente sofort in der Review-Liste auftauchen.
   - Zusätzlich auf `window.addEventListener('online', refetch)` und `visibilitychange` (User wechselt aus Hintergrund zurück) re-fetchen.
   - Optional: Supabase Realtime-Channel auf `uploaded_documents` mit Filter `user_id=eq.<userId>` für Insert/Update → re-fetch.

3. **Diagnose-Log**: Bei jedem Load einmalig `console.info('[DocumentsReview] loaded', { userId, docs: docs.length, filers: filers.length })` ausgeben, damit wir beim nächsten Auftreten sofort sehen, was Supabase wirklich liefert.

### `src/hooks/usePendingAssignmentCount.ts`

- Zusätzlich `visibilitychange` als Trigger aufnehmen, damit Banner und Review konsistent re-fetchen.

### Keine Schema-Änderung

Migration `20260531125400_*.sql` ist korrekt; RLS-Policies auf `uploaded_documents` decken `SELECT` per `user_id = auth.uid()` korrekt ab (geprüft). Es braucht keine SQL-Änderung.

## Verifikation

1. Im Flugmodus eine Datei hochladen → Banner-Count steigt nach Online-Sync.
2. `/documents/review` öffnen → die hochgeladene Datei erscheint mit Person/Jahr-Selects.
3. Wenn ein Fehler auftritt, zeigt der Toast jetzt die Supabase-Fehlermeldung (nicht mehr generisch).
4. Während OfflineQueue draint die Review-Seite offen halten → Liste füllt sich live ohne Reload.

## Geänderte Dateien

- `src/pages/DocumentsReview.tsx` — Loader-Refactor, Subscriptions, Diagnose-Log.
- `src/hooks/usePendingAssignmentCount.ts` — `visibilitychange`-Trigger.
