
# Offline-Modus: nur Dokumenten-Uploader + spätere Zuordnung

## Ziel
Offline zeigt die App ausschliesslich einen schlanken Dokumenten-Uploader. Alle anderen Seiten (Dashboard, Formulare, Profil, Chat, Settings, Admin etc.) sind offline blockiert. Hochgeladene Dokumente landen in einem „Eingangskorb". Sobald wieder online, sieht der User in einem Review-Screen die Liste seiner offline gesammelten Dokumente und kann pro Dokument:
- einem Tax-Filer + Jahr + Checklist-Item zuordnen, **oder**
- löschen.

## User Flow

```text
Offline:
  irgendeine URL  ──► OfflineGate ──► /offline-upload (einziger sichtbarer Screen)
                                        - Datei wählen / Kamera / Scan
                                        - Liste „Diese Session hochgeladen"
                                        - Hinweis: „Zuordnung erfolgt, sobald online"

Online (nach Reconnect):
  Queue drained ──► Banner „N Dokumente warten auf Zuordnung"
                    Klick ──► /documents/review
                              Pro Dokument:
                                - Filer auswählen (Dropdown)
                                - Jahr auswählen
                                - Checklist-Item auswählen (optional „Unzugeordnet")
                                - [Zuordnen] / [Löschen]
```

## Scope

### Neu
- `src/components/guards/OfflineGate.tsx` — Wrapper in `AppShell`. Wenn `!navigator.onLine` und Route ≠ `/offline-upload` ≠ `/documents/review`: Redirect/Render auf `/offline-upload`. Keine Sidebar, kein Bottom-Nav.
- `src/pages/OfflineUpload.tsx` — minimaler Standalone-Screen: Logo, Titel „Offline-Upload", Datei-/Kamera-Buttons, Liste der in dieser Session enqueueten Dateien (aus IndexedDB-Queue gelesen), Hinweistext. Funktioniert ohne Auth-Session-Refresh (nutzt vorhandene lokale Session falls da; sonst zeigt „Beim ersten Online-Login werden Uploads zugeordnet").
- `src/pages/DocumentsReview.tsx` (Route `/documents/review`) — Liste aller `uploaded_documents` mit `pending_assignment = true`. Pro Eintrag: Thumbnail, Filename, Dropdowns (Filer, Jahr, Checklist-Item), Buttons „Zuordnen"/„Löschen". Bulk-Aktion „Alle löschen".
- `src/components/offline/PendingAssignmentBanner.tsx` — globaler Banner (im AppShell), zeigt sich nur online wenn pending count > 0, mit CTA „Jetzt zuordnen" → `/documents/review`.
- Migration: Spalte `pending_assignment boolean default false` + nullable `tax_filer_id`, `tax_year`, `checklist_item_id` auf `uploaded_documents`. RLS: User sieht/ändert nur eigene Pending-Docs.

### Geändert
- `src/services/queue/handlers/documentUpload.ts` — wenn Job offline enqueued wurde (Flag `payload.pendingAssignment = true`), `dbRow` mit `pending_assignment: true`, ohne Filer/Jahr/Checklist insertion.
- `src/pages/OfflineUpload.tsx` Upload-Path — nutzt bestehenden `EncryptedDocumentService` + `OfflineQueueService`, setzt `pendingAssignment = true`.
- `src/components/layout/AppShell.tsx` — `OfflineGate` einbauen; Sidebar und Bottom-Nav nur rendern wenn online oder Route = `/offline-upload`/`review` ausgenommen.
- `src/App.tsx` — Routen `/offline-upload` (public, kein AuthGuard nötig — User kann offline keinen Login machen) und `/documents/review` (protected) registrieren.
- `src/hooks/use-tax-year-data.ts`, `src/hooks/useNotifications.ts` — bleiben wie zuletzt (rein netzwerkbasiert).
- `public/sw-offline.js` — Navigation-Fallback nur noch auf `/offline-upload`. Andere Routen Network-only (Browser zeigt Fehler → OfflineGate fängt ab sobald JS lädt).
- `src/pages/Documents.tsx` — kleiner Hinweis-Pill „N unzugeordnete Dokumente" oben, Link auf `/documents/review`.

### Entfernt / zurückgebaut
- `OfflineRouteGuard` (falls aus vorigem Plan vorhanden) — ersetzt durch strikteres `OfflineGate`.
- Snapshot-Hydration in `Documents.tsx` für die normale Liste: bleibt für Read-Anzeige der bereits gesynten Docs (nice-to-have), aber Liste ist offline read-only.
- `reactQueryPersist.ts` Allowlist auf `[]` reduzieren bzw. Persist ganz abschalten — Offline nutzt nur den dedizierten Upload-Screen, kein React-Query-Cache nötig.

## Akzeptanzkriterien
- Im Flugmodus: jede URL landet sofort auf `/offline-upload`. Kein Dashboard, kein Profil, keine Formulare sichtbar.
- Offline-Upload akzeptiert Dateien, verschlüsselt sie lokal, legt sie in die OfflineQueue.
- Nach Reconnect: Queue wird gedraint, Docs liegen mit `pending_assignment=true` in DB, Banner erscheint.
- `/documents/review` ermöglicht pro Dokument: Filer + Jahr + Checklist-Item setzen oder löschen.
- Nach Zuordnung verschwindet Doc aus Review und erscheint in normaler `/documents`-Liste.
- Kein Anonymous-Auth, kein Vault-Recovery, keine Architektur-Änderung an Payment/Forms.

## Technische Details

### DB-Migration (Skizze)
```sql
alter table public.uploaded_documents
  add column if not exists pending_assignment boolean not null default false;

alter table public.uploaded_documents
  alter column tax_filer_id drop not null,
  alter column tax_year drop not null,
  alter column checklist_item_id drop not null;

create index if not exists uploaded_documents_pending_idx
  on public.uploaded_documents (user_id) where pending_assignment;
```
(Grants/RLS bleiben wie bestehend, da Filter über `user_id` läuft.)

### OfflineGate Pseudocode
```tsx
const online = useOnlineStatus();
const { pathname } = useLocation();
const allowed = pathname === '/offline-upload' || pathname === '/documents/review';
if (!online && !allowed) return <Navigate to="/offline-upload" replace />;
```

### Pending-Banner
- Hook `usePendingAssignmentCount()` — `select count(*) from uploaded_documents where pending_assignment=true and user_id=auth.uid()`.
- Re-fetch nach Queue-Drain-Event.

## Offene Punkte / Risiken
- **Auth offline**: Wenn User noch nie eingeloggt war, kann er offline nichts encrypten (Master-Key fehlt). Lösung: `/offline-upload` zeigt in diesem Fall „Bitte einmalig online anmelden" — Upload blockiert. Eingeloggte User mit gecachten Keys können offline normal hochladen.
- **Service Worker Update**: Beim Rollout brauchen Bestands-User ein SW-Update; bis dahin könnten alte Routen offline noch aus Cache laden. Versionsbump in `sw-offline.js`.
- **Review-UI Komplexität**: Filer/Jahr/Checklist-Dropdowns brauchen Online-Daten. Review-Screen ist daher strikt online-only (durch OfflineGate ohnehin gegeben).
- **Storage-Pfad**: Offline-Uploads brauchen einen vorläufigen Storage-Pfad (z. B. `user_id/_pending/<uuid>`). Bei Zuordnung optional move/rename in den finalen Pfad — oder Pfad bleibt, nur DB-Felder werden gesetzt (einfacher, empfohlen).
