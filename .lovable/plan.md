# 30-Tage-Löschung nach elektronischer Unterschrift

Nach der elektronischen Unterschrift einer Steuererklärung werden die hochgeladenen Belege und die Dokumentensammlung des Nutzers für dieses Steuerjahr nach 30 Tagen automatisch gelöscht. Übrig bleibt nur die signierte Steuererklärung als PDF. Der Nutzer wird transparent darüber informiert — vor, während und nach der Unterschrift.

## 1. Backend — automatische Löschung

**Neue Edge Function: `cleanup-signed-tax-year-documents`** (täglich per Cron)

Pro `completed_tax_returns`-Eintrag mit `signed_at < now() - interval '30 days'` und Status nicht bereits gelöscht:
- Alle `uploaded_documents` für `(tax_filer_id, tax_year)` ermitteln
- Zugehörige Dateien im Storage-Bucket `tax-documents` löschen (verschlüsselt abgelegte Originale)
- Datenbankzeilen in `uploaded_documents` löschen
- Lösch-Status auf `completed_tax_returns` markieren (neue Spalte `documents_deleted_at`), damit kein Re-Run

**Nicht gelöscht** wird:
- `completed_tax_returns` (signiertes PDF im Bucket `completed-tax-returns`)
- `tax_return_signatures` (rechtlicher Nachweis der Unterschrift)
- `form_data` (Stammdaten, evtl. fürs Folgejahr nützlich) — *siehe offene Frage unten*

**Migration:**
- Spalte `documents_deleted_at timestamptz` auf `completed_tax_returns`
- Cron-Job (pg_cron) ruft die Edge Function 1×/Tag auf

## 2. UI — Nutzer informieren

**a) Im `SignatureDialog` (vor Bestätigung)**
Direkt über dem „Einreichen"-Button ein dezenter Hinweisblock:
> „Nach der Unterschrift werden deine hochgeladenen Belege und die Dokumentensammlung für {jahr} nach 30 Tagen automatisch gelöscht. Die unterschriebene Steuererklärung bleibt dauerhaft als PDF verfügbar."

**b) Auf `/documents` für bereits unterschriebene Steuerjahre**
Banner oben in der Dokumentenliste (wenn `signed_at` gesetzt und noch nicht gelöscht):
> „Diese Belege werden am {signed_at + 30 Tage} gelöscht. Lade sie bei Bedarf vorher herunter."
Mit Countdown ("noch X Tage").

**c) Im Dashboard `CompletedContent` / abgeschlossenen Steuerjahr-Card**
Kleiner Vermerk: „Belege bis {datum} verfügbar — danach nur noch PDF".

**d) Nach erfolgter Löschung (`documents_deleted_at` gesetzt)**
Empty-State auf `/documents` für dieses Jahr: „Die Belege für {jahr} wurden gemäss unserer 30-Tage-Regel gelöscht. Deine unterschriebene Steuererklärung ist weiterhin als PDF verfügbar."

## 3. Offene Frage

Sollen wir auch `form_data` (eingegebene Formularantworten) nach 30 Tagen löschen, oder nur die **hochgeladenen Belege/Dateien**? Aktueller Plan: nur Uploads + Dokumentensammlung löschen, `form_data` behalten (nützlich für Folgejahr-Import). Bitte bestätigen oder korrigieren.

## Technische Details

- Storage-Pfade aus `uploaded_documents.file_path` einsammeln und in Batches via `supabase.storage.from('tax-documents').remove([...])` löschen
- Filterung strikt nach `tax_filer_id` + `tax_year` (Multi-Person-Isolation)
- Idempotent: `documents_deleted_at IS NULL` als Vorbedingung
- Text durchgehend Du-Form (Ditax Konvention)
- Datum-Berechnung in UI: `signed_at + 30d`, Format `de-CH`
