## Problem

Beim Offline-Upload erscheint „Fehler beim Abrufen des Verschlüsselungsschlüssels". Ursache: `KeyManagementService.getUserEncryptionKey()` macht beim ersten Aufruf pro Session einen Supabase-`SELECT` auf `user_encryption_keys` (Zeile 36) — der offline scheitert. Der eigentliche Schlüssel wird aber rein **lokal** aus der `userId` abgeleitet (`generateLocalUserKey`), die DB-Abfrage dient nur dazu, ggf. einen Metadaten-Marker anzulegen.

Die Verschlüsselung selbst braucht also kein Netz. Wir müssen die Mandatory-E2E-Regel **nicht** brechen — Dateien werden weiterhin sofort verschlüsselt, bevor sie in die Offline-Queue gehen.

## Lösung

`KeyManagementService.getUserEncryptionKey()` so anpassen, dass:

1. **Cache-Hit** wie bisher sofort zurückgibt.
2. **Wenn `navigator.onLine === false`**: direkt `generateLocalUserKey(userId)` ableiten, cachen, zurückgeben — **kein** DB-Zugriff. Kein Metadaten-Insert (wird beim nächsten Online-Aufruf nachgeholt, da der Marker idempotent ist).
3. **Online**: bestehender Pfad (SELECT + ggf. INSERT) bleibt unverändert.
4. **Online-Fehler vom Typ Netzwerk** (z. B. Edge offline, aber `navigator.onLine` lügt): als zweites Fallback ebenfalls lokal ableiten statt zu werfen — gleiche Begründung.

Zusätzlich: damit Folge-Online-Aufrufe den fehlenden Metadaten-Eintrag nachholen, im Online-Pfad nach Cache-Hit **nicht früh returnen**, sondern einen leichten „ensure metadata exists"-Check beibehalten. Hier reicht das bestehende Verhalten (erster Online-Call legt den Eintrag an).

## Betroffene Datei

- `src/services/KeyManagementService.ts` — `getUserEncryptionKey()` (Zeilen 28–60)

## Nicht-Ziele

- Keine Änderung am Verschlüsselungsverfahren.
- Keine Änderung am Offline-Queue-Verhalten oder `EncryptedDocumentService.uploadPendingDocument`.
- Keine Änderung an RLS, Storage-Pfaden oder Sicherheitsmemory.

## Verifikation

- Offline (Airplane Mode): Foto/Datei auf `/offline-upload` hochladen → kein Key-Fehler, Toast „Dokument gespeichert", Job erscheint in der Queue.
- Wieder online: Queue drained, Dokument landet mit `pending_assignment=true` in `uploaded_documents`, `PendingAssignmentBanner` erscheint.